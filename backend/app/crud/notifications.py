# backend/app/crud/notifications.py
from database.generated.prisma import Prisma
from app.api.auth import CurrentUser
from database.generated.prisma.enums import RequestStatus, PurchaseOrderStatus, UserRole

async def get_notification_counts(db: Prisma, user: CurrentUser) -> dict:
    """
    Calcule le nombre de notifications/actions en attente pour un utilisateur donné en fonction de son rôle.
    """
    counts = {
        "pending_requests_for_daf": 0,
        "pending_purchase_orders_for_daf": 0,
        "requests_to_deliver_for_magasinier": 0,
        "requests_to_confirm_for_chef_service": 0,
    }

    if user.role == UserRole.DAF:
        # Compter les demandes de matériel en attente d'approbation par le DAF
        counts["pending_requests_for_daf"] = await db.request.count(
            where={"status": RequestStatus.TRANSMISE}
        )
        # Compter les bons de commande en attente d'approbation par le DAF
        counts["pending_purchase_orders_for_daf"] = await db.purchaseorder.count(
            where={"status": PurchaseOrderStatus.PENDING_APPROVAL}
        )

    elif user.role == UserRole.MAGASINIER:
        # Compter les demandes approuvées prêtes à être livrées par le magasinier
        counts["requests_to_deliver_for_magasinier"] = await db.request.count(
            where={"status": RequestStatus.APPROUVEE}
        )

    elif user.role == UserRole.CHEF_SERVICE:
        # Compter les demandes livrées en attente de confirmation de réception par le chef de service
        counts["requests_to_confirm_for_chef_service"] = await db.request.count(
            where={
                "requesterId": user.id,
                "status": RequestStatus.LIVREE_PAR_MAGASINIER
            }
        )

    return counts
