from typing import List, Optional

from database.generated.prisma import Prisma
from database.generated.prisma.models import PurchaseOrder, PurchaseOrderItem, User
from database.generated.prisma.enums import (
    PurchaseOrderStatus,
    TransactionType,
    TransactionSource,
)
from app.api.schemas import PurchaseOrderCreate, PurchaseOrderUpdate
from app.utils.number_generator import generate_next_number

# --- READ Operations ---

async def get_purchase_order(db: Prisma, purchase_order_id: str) -> Optional[PurchaseOrder]:
    """
    Récupère une commande d'achat par son ID avec toutes les relations.
    """
    return await db.purchaseorder.find_unique(
        where={"id": purchase_order_id},
        include={
            "requestedBy": True,
            "approvedBy": True,
            "items": {"include": {"product": True}},
        },
    )

async def get_purchase_orders(
    db: Prisma,
    status: Optional[PurchaseOrderStatus] = None,
    requested_by_id: Optional[str] = None,
    approved_by_id: Optional[str] = None,
    skip: int = 0,
    take: int = 20,
) -> (List[PurchaseOrder], int):
    """
    Récupère une liste paginée de commandes d'achat avec filtrage et le nombre total.
    """
    where_clause = {}
    if status:
        where_clause["status"] = status
    if requested_by_id:
        where_clause["requestedById"] = requested_by_id
    if approved_by_id:
        where_clause["approvedById"] = approved_by_id

    async with db.tx() as transaction:
        purchase_orders = await transaction.purchaseorder.find_many(
            where=where_clause,
            include={"requestedBy": True, "approvedBy": True},
            order={"createdAt": "desc"},
            skip=skip,
            take=take,
        )
        total_count = await transaction.purchaseorder.count(where=where_clause)

    return purchase_orders, total_count

async def get_purchase_order_items(db: Prisma, purchase_order_id: str) -> List[PurchaseOrderItem]:
    """
    Récupère les articles d'une commande d'achat.
    """
    return await db.purchaseorderitem.find_many(
        where={"purchaseOrderId": purchase_order_id}
    )

# --- CREATE Operations ---

async def create_purchase_order(
    db: Prisma, purchase_order_data: PurchaseOrderCreate, current_user: User
) -> PurchaseOrder:
    """
    Crée une nouvelle commande d'achat.
    """
    new_order_number = await generate_next_number(db, "BC")

    po_items_data = []
    total_amount = 0.0
    for item_data in purchase_order_data.items:
        product = await db.product.find_unique(where={"id": item_data.productId})
        if not product:
            raise ValueError(f"Product with ID {item_data.productId} not found")
        item_total_price = item_data.quantity * item_data.unitPrice
        total_amount += item_total_price
        po_items_data.append(
            {
                "productId": item_data.productId,
                "quantity": item_data.quantity,
                "unitPrice": item_data.unitPrice,
                "totalPrice": item_total_price,
            }
        )

    purchase_order = await db.purchaseorder.create(
        data={
            "orderNumber": new_order_number,
            "requestedById": current_user.id,
            "supplierName": purchase_order_data.supplierName,
            "totalAmount": total_amount,
            "status": PurchaseOrderStatus.DRAFT,
            "items": {"create": po_items_data},
        },
        include={"requestedBy": True, "approvedBy": True, "items": {"include": {"product": True}}},
    )
    return purchase_order

async def create_po_stock_transaction(
    db: Prisma, product_id: str, user_id: str, quantity: int
):
    """
    Crée une transaction d'entrée de stock pour la réception d'une commande.
    """
    await db.transaction.create(
        data={
            "productId": product_id,
            "userId": user_id,
            "type": TransactionType.ENTREE,
            "source": TransactionSource.RECEIPT,
            "quantity": quantity,
        }
    )

# --- UPDATE Operations ---

async def generic_update_purchase_order(
    db: Prisma, purchase_order_id: str, data: dict
) -> PurchaseOrder:
    """
    Met à jour une commande d'achat avec les données fournies.
    """
    return await db.purchaseorder.update(
        where={"id": purchase_order_id},
        data=data,
    )

async def increment_product_stock(db: Prisma, product_id: str, quantity: int):
    """
    Incrémente le stock pour un produit donné.
    """
    await db.product.update(
        where={"id": product_id},
        data={"quantity": {"increment": quantity}},
    )

# --- DELETE Operations ---

async def delete_purchase_order(db: Prisma, purchase_order_id: str) -> Optional[PurchaseOrder]:
    """
    Supprime une commande d'achat par son ID.
    """
    # This transaction ensures that items are deleted before the order itself.
    async with db.tx() as transaction:
        await transaction.purchaseorderitem.delete_many(
            where={"purchaseOrderId": purchase_order_id}
        )
        deleted_order = await transaction.purchaseorder.delete(
            where={"id": purchase_order_id}
        )
    return deleted_order