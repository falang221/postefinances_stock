from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from database.generated.prisma import Prisma
from database.generated.prisma.models import PurchaseOrder, User
from database.generated.prisma.enums import PurchaseOrderStatus, UserRole, TransactionType # Added TransactionType

from app.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderItemResponse,
    PurchaseOrderSummaryResponse, # Import the new summary schema
    PaginatedPurchaseOrderResponse, # NEW: Import the paginated response schema
    PurchaseOrderPrintData,
)
from app.api.auth import get_current_user, role_required
from app.websockets import manager
from app.database import get_db # Added get_db import
from app.services import purchase_order_service # NEW
from app.crud.purchase_order import (
    create_purchase_order as crud_create_purchase_order,
    get_purchase_order as crud_get_purchase_order,
    get_purchase_orders as crud_get_purchase_orders,
    delete_purchase_order as crud_delete_purchase_order,
)

# ... other imports

router = APIRouter()

@router.post(
    "/purchase-orders",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN]))]
)
async def create_purchase_order(
    purchase_order_data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    """
    Create a new purchase order.
    """
    try:
        purchase_order = await crud_create_purchase_order(db, purchase_order_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    # Notify DAF about new draft PO
    await manager.send_personal_message(
        f"Un nouveau bon de commande brouillon (N° {purchase_order.orderNumber}) a été créé par {current_user.name}.",
        UserRole.DAF.value
    )

    return purchase_order
    # finally: # Removed finally block
    # await db.disconnect() # Removed manual disconnect


@router.get(
    "/purchase-orders",
    response_model=PaginatedPurchaseOrderResponse, # UPDATED: Use the new paginated response model
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))]
)
async def get_purchase_orders(
    status: Optional[PurchaseOrderStatus] = None,
    requested_by_id: Optional[str] = None,
    approved_by_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Prisma = Depends(get_db),
):
    """
    Retrieve a paginated list of purchase orders, with optional filtering.
    """
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be greater than 0.")
    if page_size > 100:
        page_size = 100 # Cap page size to 100
    
    skip = (page - 1) * page_size

    purchase_orders, total_count = await crud_get_purchase_orders(
        db, 
        status=status, 
        requested_by_id=requested_by_id, 
        approved_by_id=approved_by_id,
        skip=skip,
        take=page_size
    )
    
    return PaginatedPurchaseOrderResponse(
        total=total_count,
        data=[PurchaseOrderSummaryResponse.model_validate(po) for po in purchase_orders]
    )
    # finally: # Removed finally block
    # await db.disconnect() # Removed manual disconnect


@router.get(
    "/purchase-orders/{order_id}",
    response_model=PurchaseOrderResponse,
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))]
)
async def get_purchase_order_by_id(order_id: str, db: Prisma = Depends(get_db)):
    """
    Retrieve a single purchase order by its ID.
    """
    purchase_order = await crud_get_purchase_order(db, order_id)
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found"
        )
    return purchase_order
    # finally: # Removed finally block
    # await db.disconnect() # Removed manual disconnect


@router.get(
    "/purchase-orders/{order_id}/purchase-order-data",
    response_model=PurchaseOrderPrintData,
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))]
)
async def get_purchase_order_print_data(order_id: str, db: Prisma = Depends(get_db)):
    """
    Retrieve the data required for printing a single purchase order by its ID.
    """
    purchase_order = await db.purchaseorder.find_unique(
        where={"id": order_id},
        include={"items": {"include": {"product": True}}, "requestedBy": True, "approvedBy": True},
    )
    if not purchase_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found"
        )

    items_for_print = [
        {
            "productName": item.product.name,
            "productReference": item.product.reference,
            "quantity": item.quantity,
            "unitPrice": item.unitPrice,
            "totalPrice": item.totalPrice,
        }
        for item in purchase_order.items
    ]

    return PurchaseOrderPrintData(
        orderNumber=purchase_order.orderNumber,
        supplierName=purchase_order.supplierName,
        totalAmount=purchase_order.totalAmount,
        createdAt=purchase_order.createdAt,
        items=items_for_print,
        requestedBy=purchase_order.requestedBy,
        approvedBy=purchase_order.approvedBy,
    )


@router.put(
    "/purchase-orders/{order_id}",
    response_model=PurchaseOrderResponse,
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN]))]
)
async def update_purchase_order(
    order_id: str,
    purchase_order_data: PurchaseOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    """
    Update an existing purchase order.
    Delegates business logic to the service layer.
    """
    purchase_order = await purchase_order_service.update_purchase_order_status_service(
        db, order_id, purchase_order_data, current_user
    )
    return purchase_order
    # finally: # Removed finally block
    # await db.disconnect() # Removed manual disconnect


@router.delete(
    "/purchase-orders/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(role_required([UserRole.ADMIN]))]
)
async def delete_purchase_order(order_id: str, db: Prisma = Depends(get_db)):
    """
    Delete a purchase order.
    """
    try:
        await crud_delete_purchase_order(db, order_id)
        return {"message": "Purchase Order deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/purchase-orders/auto-generate",
    response_model=List[PurchaseOrderResponse],
    dependencies=[Depends(role_required([UserRole.MAGASINIER, UserRole.ADMIN]))]
)
async def auto_generate_purchase_orders(
    current_user: User = Depends(get_current_user),
    db: Prisma = Depends(get_db), # Injected db dependency
):
    """
    Automatically generate draft purchase orders for products below their minStock.
    """
    # Removed manual connect
    # Removed try block
    products_below_min_stock = await db.product.find_many(
        where={"quantity": {"lt": {"minStock": True}}}
    )

    generated_pos = []
    for product in products_below_min_stock:
        # Check if there's already a pending PO for this product
        existing_pending_po = await db.purchaseorder.find_first(
            where={
                "items": {"some": {"productId": product.id}},
                "status": {"in": [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_APPROVAL]},
            }
        )
        if existing_pending_po:
            continue # Skip if a pending PO already exists for this product

        # Calculate quantity to order (e.g., bring stock up to minStock + a buffer)
        quantity_to_order = product.minStock * 2 - product.quantity # Example: order to bring stock to 2x minStock

        if quantity_to_order <= 0:
            continue

        # Assuming a default unit price for auto-generated POs for now
        # In a real system, this would come from supplier data
        unit_price = 10.0 # Placeholder

        po_item_data = {
            "productId": product.id,
            "quantity": quantity_to_order,
            "unitPrice": unit_price,
            "totalPrice": quantity_to_order * unit_price,
        }

        purchase_order = await db.purchaseorder.create(
            data={
                "requestedById": current_user.userId,
                "supplierName": f"Auto-generated for {product.name}",
                "totalAmount": quantity_to_order * unit_price,
                "status": PurchaseOrderStatus.DRAFT,
                "items": {"create": [po_item_data]},
            },
            include={"requestedBy": True, "approvedBy": True, "items": {"include": {"product": True}}},
        )
        generated_pos.append(purchase_order)
        
        # Notify DAF about new auto-generated PO
        await manager.send_personal_message(
            f"Un nouveau bon de commande brouillon (N° {purchase_order.orderNumber}) a été auto-généré pour le produit '{product.name}'.",
            UserRole.DAF.value # Send to all DAF users
        )

    return generated_pos
    # Removed finally block
    # Removed manual disconnect