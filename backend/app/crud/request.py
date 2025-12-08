from typing import List, Optional
from database.generated.prisma import Prisma
from database.generated.prisma.models import Request, RequestItem, Product, Transaction
from database.generated.prisma.enums import RequestStatus, TransactionType, TransactionSource

FULL_REQUEST_INCLUDE = {
    "items": {"include": {"product": True}},
    "requester": True,
    "approvedBy": True,
    "receivedBy": True,
    "approvals": {"include": {"user": True}},
}

async def get_request_by_id_for_delivery(db: Prisma, request_id: str) -> Optional[Request]:
    """
    Fetches a request by its ID, specifically for the delivery process.
    Includes items and requester for notification.
    """
    return await db.request.find_unique(
        where={"id": request_id},
        include={"items": True, "requester": True},
    )

async def get_product_by_id(db: Prisma, product_id: str) -> Optional[Product]:
    """
    Fetches a product by its ID.
    """
    return await db.product.find_unique(where={"id": product_id})

async def decrement_product_stock(db: Prisma, product_id: str, quantity: int):
    """
    Decrements the stock quantity for a given product.
    """
    await db.product.update(
        where={"id": product_id},
        data={"quantity": {"decrement": quantity}},
    )

async def create_stock_transaction(
    db: Prisma, product_id: str, user_id: str, quantity: int
):
    """
    Creates a stock transaction record for a stock issue (SORTIE).
    """
    await db.transaction.create(
        data={
            "productId": product_id,
            "userId": user_id,
            "type": TransactionType.SORTIE,
            "quantity": quantity,
            "source": TransactionSource.REQUEST,
        }
    )

async def update_request_status_to_delivered(
    db: Prisma, request_id: str, deliverer_id: str
) -> Request:
    """
    Updates the request status to LIVREE_PAR_MAGASINIER and sets the deliverer.
    """
    await db.request.update(
        where={"id": request_id},
        data={
            "status": RequestStatus.LIVREE_PAR_MAGASINIER,
            "receivedById": deliverer_id,
        },
    )
    # Return the final, fully-included request for the response
    return await db.request.find_unique(
        where={"id": request_id}, include=FULL_REQUEST_INCLUDE
    )
