from fastapi import HTTPException, status
from database.generated.prisma import Prisma
from app.api.auth import CurrentUser
from app.crud import request as request_crud
from app.websockets import manager
from database.generated.prisma.enums import TransactionType, TransactionSource # NEW: Import for stock transactions

async def deliver_request_service(db: Prisma, request_id: str, current_user: CurrentUser):
    """
    Service layer function to process the delivery of a stock request.
    Orchestrates business logic, database operations, and notifications.
    """
    async with db.tx() as transaction:
        # 1. Fetch the request
        existing_request = await request_crud.get_request_by_id_for_delivery(transaction, request_id)
        
        # 2. Perform business logic checks
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )
        if existing_request.status != "APPROUVEE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request is not in 'APPROUVEE' status.",
            )

        # 3. Iterate through items and update stock
        for item in existing_request.items:
            if item.approvedQty is None or item.approvedQty <= 0:
                continue

            product = await request_crud.get_product_by_id(transaction, item.productId)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item.productId} not found.",
                )

            if (product.quantity - item.approvedQty) < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough stock for product '{product.name}'. Available: {product.quantity}, Requested: {item.approvedQty}.",
                )
            
            # Decrement product quantity
            await transaction.product.update(
                where={"id": item.productId},
                data={"quantity": {"decrement": item.approvedQty}},
            )

            # Create stock transaction record
            await transaction.transaction.create(
                data={
                    "productId": item.productId,
                    "userId": current_user.id,
                    "type": TransactionType.SORTIE,
                    "source": TransactionSource.REQUEST,
                    "quantity": item.approvedQty,
                }
            )

        # 4. Update request status
        final_request = await request_crud.update_request_status_to_delivered(
            transaction, request_id, current_user.id
        )

        # 5. Handle notifications
        if existing_request.requesterId:
            await manager.send_personal_message(
                {
                    "type": "request_delivered",
                    "message": f"Votre demande (N°{final_request.requestNumber}) a été livrée et est en attente de votre confirmation de réception.",
                },
                existing_request.requesterId,
            )

        return final_request
