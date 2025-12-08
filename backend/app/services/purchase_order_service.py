from fastapi import HTTPException, status
from database.generated.prisma import Prisma
from app.api.auth import CurrentUser, UserRole
from app.api.schemas import PurchaseOrderUpdate
from app.crud import purchase_order as po_crud
from app.websockets import manager
from database.generated.prisma.enums import PurchaseOrderStatus, TransactionType, TransactionSource

async def update_purchase_order_status_service(
    db: Prisma,
    purchase_order_id: str,
    purchase_order_data: PurchaseOrderUpdate,
    current_user: CurrentUser,
):
    """
    Service layer function to update the status of a purchase order.
    Orchestrates business logic, database operations, and notifications.
    """
    async with db.tx() as transaction:
        existing_po = await po_crud.get_purchase_order(transaction, purchase_order_id)
        if not existing_po:
            raise ValueError("Purchase Order not found")

        update_data = purchase_order_data.model_dump(exclude_unset=True)
        new_status = purchase_order_data.status

        if not new_status:
            # Handle other updates if status is not changing
            return await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)

        # DAF specific actions (approve/reject)
        if new_status in [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.REJECTED]:
            if current_user.role != UserRole.DAF:
                raise PermissionError("Only DAF can approve or reject purchase orders")
            update_data["approvedById"] = current_user.id
            
            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)
            
            await manager.send_personal_message(
                f"Votre bon de commande (N° {existing_po.orderNumber}) a été {new_status.value.lower()} par {current_user.name}.",
                existing_po.requestedById,
            )

        # Magasinier specific actions (ordered/received)
        elif new_status in [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.RECEIVED]:
            if current_user.role != UserRole.MAGASINIER:
                raise PermissionError("Only Magasinier can mark purchase orders as ordered or received")

            if new_status == PurchaseOrderStatus.RECEIVED:
                po_items = await po_crud.get_purchase_order_items(transaction, purchase_order_id)
                for item in po_items:
                    await po_crud.increment_product_stock(transaction, item.productId, item.quantity)
                    await po_crud.create_po_stock_transaction(
                        transaction,
                        product_id=item.productId,
                        user_id=current_user.id,
                        quantity=item.quantity
                    )
            
            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)

            if new_status == PurchaseOrderStatus.RECEIVED:
                 await manager.send_personal_message(
                    f"Votre bon de commande (N° {existing_po.orderNumber}) a été reçu par le magasinier.",
                    existing_po.requestedById,
                )
        else:
             # For other status changes or simple updates
            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)

    return await po_crud.get_purchase_order(db, purchase_order_id)
