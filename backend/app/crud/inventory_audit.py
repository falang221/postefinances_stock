from datetime import datetime
from typing import List, Optional

from app.api.auth import CurrentUser
from app.api.schemas import InventoryAuditBulkUpdate
from app.utils.number_generator import generate_next_number
from app.websockets import manager
from database.generated.prisma import Prisma
from database.generated.prisma.enums import (
    InventoryAuditStatus,
    StockAdjustmentStatus,
    TransactionType,
    UserRole,
)
from database.generated.prisma.models import InventoryAudit

# Define a common include structure for InventoryAudit to ensure full data is returned
AUDIT_INCLUDE = {
    "items": {"include": {"product": True}},
    "createdBy": True,
}

async def create_inventory_audit(db: Prisma, user: CurrentUser) -> InventoryAudit:
    """
    Crée un nouvel audit d'inventaire.
    Prend un "instantané" des quantités système de tous les produits au moment de la création.
    """
    async with db.tx() as transaction:
        audit_number = await generate_next_number(transaction, "AUDIT")
        all_products = await transaction.product.find_many()

        # Crée l'audit et tous ses articles dans une seule transaction
        new_audit = await transaction.inventoryaudit.create(
            data={
                "auditNumber": audit_number,
                "createdById": user.id,
                "status": InventoryAuditStatus.IN_PROGRESS,
                "items": {
                    "create": [
                        {
                            "productId": product.id,
                            "systemQuantity": product.quantity,
                            # countedQuantity et discrepancy sont laissés à null
                        }
                        for product in all_products
                    ]
                },
            },
            include=AUDIT_INCLUDE, # Use the defined include
        )
        return new_audit


async def get_audit_by_id(db: Prisma, audit_id: str) -> Optional[InventoryAudit]:
    """
    Récupère un audit d'inventaire par son ID avec tous les détails.
    """
    return await db.inventoryaudit.find_unique(
        where={"id": audit_id},
        include=AUDIT_INCLUDE, # Use the defined include
    )


async def get_all_audits(
    db: Prisma, page: int = 1, page_size: int = 10
) -> (int, List[InventoryAudit]):
    """
    Récupère une liste paginée de tous les audits d'inventaire.
    """
    total_items = await db.inventoryaudit.count()
    audits = await db.inventoryaudit.find_many(
        skip=(page - 1) * page_size,
        take=page_size,
        include={"createdBy": True}, # Only include createdBy for summary view
        order={"createdAt": "desc"},
    )
    return total_items, audits


async def update_audit_items(
    db: Prisma, audit_id: str, update_data: InventoryAuditBulkUpdate
) -> None:
    """
    Met à jour en masse les quantités comptées pour les articles d'un audit.
    """
    audit = await db.inventoryaudit.find_unique(where={"id": audit_id})
    if not audit or audit.status != InventoryAuditStatus.IN_PROGRESS:
        raise ValueError("L'audit n'est pas valide ou n'est pas en cours.")

    async with db.tx() as transaction:
        for item_data in update_data.items:
            # Récupère la quantité système depuis l'article d'audit
            audit_item = await transaction.inventoryaudititem.find_first(
                where={"auditId": audit_id, "productId": item_data.productId}
            )
            if not audit_item:
                continue  # Ignore si le produit n'est pas dans l'audit

            discrepancy = item_data.countedQuantity - audit_item.systemQuantity

            await transaction.inventoryaudititem.update_many(
                where={"auditId": audit_id, "productId": item_data.productId},
                data={
                    "countedQuantity": item_data.countedQuantity,
                    "discrepancy": discrepancy,
                },
            )


async def complete_audit(db: Prisma, audit_id: str) -> InventoryAudit:
    """
    Marque un audit d'inventaire comme 'COMPLETED'.
    """
    audit = await db.inventoryaudit.find_unique(
        where={"id": audit_id}, include={"items": True}
    )
    if not audit or audit.status != InventoryAuditStatus.IN_PROGRESS:
        raise ValueError("L'audit n'est pas valide ou n'est pas en cours.")

    # Vérifie si tous les articles ont été comptés
    if any(item.countedQuantity is None for item in audit.items):
        raise ValueError("Tous les articles n'ont pas été comptés.")

    return await db.inventoryaudit.update(
        where={"id": audit_id},
        data={"status": InventoryAuditStatus.COMPLETED, "completedAt": datetime.now()},
        include=AUDIT_INCLUDE, # Include relations after update
    )


async def request_reconciliation(db: Prisma, audit_id: str, user: CurrentUser) -> InventoryAudit:
    """
    Crée des demandes d'ajustement de stock pour toutes les divergences d'un audit
    et passe le statut de l'audit à RECONCILIATION_PENDING.
    """
    audit = await get_audit_by_id(db, audit_id)
    if not audit or audit.status != InventoryAuditStatus.COMPLETED:
        raise ValueError("L'audit doit être complété avant de demander la réconciliation.")

    discrepancy_items = [
        item for item in audit.items if item.discrepancy is not None and item.discrepancy != 0
    ]

    if not discrepancy_items:
        # S'il n'y a aucune divergence, l'audit est simplement fermé.
        return await db.inventoryaudit.update(
            where={"id": audit_id},
            data={"status": InventoryAuditStatus.CLOSED},
            include=AUDIT_INCLUDE, # Include relations after update
        )

    async with db.tx() as transaction:
        for item in discrepancy_items:
            adjustment_type = (
                TransactionType.ENTREE
                if item.discrepancy > 0
                else TransactionType.SORTIE
            )
            quantity = abs(item.discrepancy)

            await transaction.stockadjustment.create(
                data={
                    "productId": item.productId,
                    "quantity": quantity,
                    "type": adjustment_type,
                    "reason": f"Réconciliation suite à l'audit d'inventaire #{audit.auditNumber}",
                    "requestedById": user.id,
                    "status": StockAdjustmentStatus.PENDING,
                    "inventoryAuditId": audit.id,
                }
            )

        updated_audit = await transaction.inventoryaudit.update(
            where={"id": audit_id},
            data={"status": InventoryAuditStatus.RECONCILIATION_PENDING},
            include=AUDIT_INCLUDE, # Include relations after update
        )

    # Notifier les DAFs
    daf_users = await db.user.find_many(where={"role": UserRole.DAF})
    daf_ids = [u.id for u in daf_users]
    await manager.send_to_users(
        {
            "type": "reconciliation_request",
            "message": f"De nouvelles demandes d'ajustement de stock suite à l'audit #{audit.auditNumber} sont en attente de votre approbation.",
        },
        daf_ids,
    )

    return updated_audit


async def check_and_close_audit(db: Prisma, audit_id: str) -> None:
    """
    Vérifie si tous les ajustements de stock liés à un audit sont résolus.
    Si c'est le cas, clôture l'audit.
    """
    audit = await db.inventoryaudit.find_unique(
        where={"id": audit_id},
        include={"stockAdjustments": True},
    )

    if not audit or audit.status != InventoryAuditStatus.RECONCILIATION_PENDING:
        # Ne fait rien si l'audit n'est pas dans le bon état
        return

    if not audit.stockAdjustments:
        # S'il n'y a pas d'ajustements liés, on peut considérer l'audit comme fermé
        # (cas où la réconciliation a été demandée sans écarts, ce qui est géré avant, mais par sécurité)
        await db.inventoryaudit.update(
            where={"id": audit_id}, data={"status": InventoryAuditStatus.CLOSED}
        )
        return

    all_resolved = all(
        adj.status in [StockAdjustmentStatus.APPROVED, StockAdjustmentStatus.REJECTED]
        for adj in audit.stockAdjustments
    )

    if all_resolved:
        await db.inventoryaudit.update(
            where={"id": audit_id}, data={"status": InventoryAuditStatus.CLOSED}
        )
        # Notifier le créateur de l'audit
        await manager.send_personal_message(
            {
                "type": "audit_closed",
                "message": f"Le processus de réconciliation pour l'audit #{audit.auditNumber} est terminé et l'audit est maintenant clôturé.",
            },
            audit.createdById,
        )
