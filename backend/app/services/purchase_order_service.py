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
            if existing_po.status != PurchaseOrderStatus.DRAFT and existing_po.status != PurchaseOrderStatus.A_REVOIR:
                 raise PermissionError("Purchase order can only be edited when in DRAFT or A_REVOIR status.")
            return await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)

        # --- State Machine Logic ---

        # DAF can approve or send for review
        if new_status in [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.A_REVOIR]:
            if current_user.role != UserRole.DAF:
                raise PermissionError("Only DAF can approve or request review for purchase orders.")
            if existing_po.status != PurchaseOrderStatus.PENDING_APPROVAL:
                raise PermissionError(f"Cannot transition from {existing_po.status} to {new_status}.")
            
            update_data["approvedById"] = current_user.id
            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)
            
            status_french = "approuvé" if new_status == PurchaseOrderStatus.APPROVED else "renvoyé pour révision"
            await manager.send_personal_message(
                f"Votre bon de commande (N° {existing_po.orderNumber}) a été {status_french} par {current_user.name}.",
                existing_po.requestedById,
            )

        # Magasinier can mark as ordered or closed
        elif new_status in [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CLOTUREE]:
            if current_user.role != UserRole.MAGASINIER:
                raise PermissionError("Only Magasinier can mark orders as ORDERED or CLOTUREE.")
            
            if new_status == PurchaseOrderStatus.ORDERED and existing_po.status != PurchaseOrderStatus.APPROVED:
                 raise PermissionError(f"Cannot transition from {existing_po.status} to ORDERED. Must be APPROVED first.")
            if new_status == PurchaseOrderStatus.CLOTUREE and existing_po.status != PurchaseOrderStatus.ORDERED:
                 raise PermissionError(f"Cannot transition from {existing_po.status} to CLOTUREE. Must be ORDERED first.")

            if new_status == PurchaseOrderStatus.CLOTUREE:
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

            if new_status == PurchaseOrderStatus.CLOTUREE:
                 await manager.send_personal_message(
                    f"La commande N° {existing_po.orderNumber} a été marquée comme clôturée par le magasinier. Le stock a été mis à jour.",
                    existing_po.requestedById,
                )

        # Creator can resubmit an order that needs review
        elif new_status == PurchaseOrderStatus.PENDING_APPROVAL:
            if existing_po.requestedById != current_user.id:
                 raise PermissionError("Only the creator can resubmit a purchase order.")
            if existing_po.status not in [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.A_REVOIR]:
                 raise PermissionError(f"Cannot submit for approval from status {existing_po.status}.")
            
            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)
            await manager.send_personal_message(
                f"Le bon de commande N° {existing_po.orderNumber} a été soumis pour approbation par {current_user.name}.",
                UserRole.DAF.value,
            )

        # DAF/Admin can cancel an order
        elif new_status == PurchaseOrderStatus.ANNULEE:
            if current_user.role not in [UserRole.DAF, UserRole.ADMIN]:
                raise PermissionError("Only DAF or Admin can cancel a purchase order.")
            if existing_po.status in [PurchaseOrderStatus.CLOTUREE]:
                raise PermissionError("Cannot cancel a closed purchase order.")

            await po_crud.generic_update_purchase_order(transaction, purchase_order_id, update_data)
            await manager.send_personal_message(
                f"La commande N° {existing_po.orderNumber} a été annulée par {current_user.name}.",
                existing_po.requestedById,
            )

        else:
            raise PermissionError(f"Transition from {existing_po.status} to {new_status} is not allowed.")

    return await po_crud.get_purchase_order(db, purchase_order_id)
