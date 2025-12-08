from datetime import datetime  # Import datetime
from typing import List, Optional, Union
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, status, Response

from app.api.auth import CurrentUser, UserRole, get_current_user, role_required
from app.api.schemas import (
    BatchStockReceiptCreate,
    PaginatedProductStockStatusResponse,
    PaginatedTransactionHistoryResponse,
    ProductCreate,
    ProductFullResponse,
    ProductStockStatus,
    ProductUpdate,
    StockAdjustmentCreate,
    StockAdjustmentDecision,
    StockAdjustmentResponse,
    StockAdjustmentType,
    StockReceiptCreate,
    StockReceiptDecision,
    StockReceiptResponse,
    StockReportItem,
    StockReportProduct,
    StockReportResponse,
    StockStatusEnum,
    TransactionHistoryResponse,
)
from app.crud.inventory_audit import check_and_close_audit
from app.database import get_db
from app.websockets import manager  # Import the WebSocket manager
from database.generated.prisma import Prisma  # Corrected import path
from database.generated.prisma.enums import (
    StockAdjustmentStatus,
    StockReceiptStatus,
    TransactionSource,
    TransactionType,
)  # Corrected import path for StockAdjustmentStatus, TransactionSource, StockReceiptStatus, and TransactionType


# Helper function to check for low stock and send notifications
async def _check_and_notify_low_stock(product_id: str, db: Prisma):
    product = await db.product.find_unique(where={"id": product_id})
    if product and product.quantity <= product.minStock:
        message = f"Alerte stock faible: Le produit '{product.name}' (Référence: {product.reference}) a atteint ou dépassé son seuil de stock minimum ({product.quantity}/{product.minStock})."

        # Get users with roles ADMIN, MAGASINIER, CHEF_SERVICE
        relevant_users = await db.user.find_many(
            where={
                "role": {
                    "in": [UserRole.ADMIN, UserRole.MAGASINIER, UserRole.CHEF_SERVICE]
                }
            }
        )
        relevant_user_ids = [u.id for u in relevant_users]

        await manager.send_to_users(
            {"type": "low_stock_alert", "message": message}, relevant_user_ids
        )

# Helper function to calculate stock status
def _calculate_product_stock_status(product: dict) -> StockStatusEnum:
    if product.quantity <= 0:
        return StockStatusEnum.OUT_OF_STOCK
    elif product.quantity <= product.minStock:
        return StockStatusEnum.CRITICAL
    else:
        return StockStatusEnum.AVAILABLE

router = APIRouter(prefix="/products", tags=["Products"])


@router.post(
    "/", response_model=ProductFullResponse, status_code=status.HTTP_201_CREATED
)
async def create_product(
    product_data: ProductCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Creates a new product (only accessible by ADMIN).
    """
    # Check if category exists
    category = await db.category.find_unique(where={"id": product_data.categoryId})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {product_data.categoryId} not found",
        )

    try:
        product = await db.product.create(
            data=product_data.model_dump(), include={"category": True}
        )
        await _check_and_notify_low_stock(
            product.id, db
        )  # Check after product creation
        return ProductFullResponse.model_validate(product)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with this reference may already exist: {e}",
        )


@router.get("/report", response_model=StockReportResponse)
async def get_stock_report(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
    product_name: Optional[str] = None,
    reference: Optional[str] = None,
    category_name: Optional[str] = None,
    low_stock: Optional[bool] = False,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    skip: Optional[int] = 0,
    limit: Optional[int] = 10,
):
    """
    Generates a comprehensive stock report with filtering, sorting, and pagination capabilities (accessible by ADMIN).
    Includes current stock levels, product details, and last movement dates.
    """
    where_clause = {}
    if product_name:
        where_clause["name"] = {"contains": product_name, "mode": "insensitive"}
    if reference:
        where_clause["reference"] = {"contains": reference, "mode": "insensitive"}
    if category_name:
        where_clause["category"] = {
            "name": {"contains": category_name, "mode": "insensitive"}
        }

    # Fetch all products that match the initial filters to get total count
    all_products = await db.product.find_many(
        where=where_clause,
        include={"category": True},
    )

    # Apply low stock filter after fetching, as it depends on currentQuantity and minStock
    if low_stock:
        all_products = [p for p in all_products if p.quantity <= p.minStock]

    total_items = len(all_products)

    # Apply sorting
    if sort_by:
        reverse = sort_order.lower() == "desc"
        if sort_by == "name":
            all_products.sort(key=lambda x: x.name.lower(), reverse=reverse)
        elif sort_by == "quantity":
            all_products.sort(key=lambda x: x.quantity, reverse=reverse)
        # For last_adjustment and last_receipt, sorting will be applied after enriching with transaction dates

    # Apply pagination
    paginated_products = all_products[skip : skip + limit]

    report_items: List[StockReportItem] = []
    for product in paginated_products:
        last_adjustment = await db.transaction.find_first(
            where={"productId": product.id, "source": TransactionSource.ADJUSTMENT},
            order={"createdAt": "desc"},
        )
        last_receipt = await db.transaction.find_first(
            where={"productId": product.id, "source": TransactionSource.RECEIPT},
            order={"createdAt": "desc"},
        )

        report_items.append(
            StockReportItem(
                product=StockReportProduct(
                    id=product.id,
                    name=product.name,
                    reference=product.reference,
                    unit=product.unit,
                    category=product.category,
                ),
                currentQuantity=product.quantity,
                minStock=product.minStock,
                location=product.location,
                lastAdjustmentDate=(
                    last_adjustment.createdAt if last_adjustment else None
                ),
                lastReceiptDate=last_receipt.createdAt if last_receipt else None,
            )
        )

    # Re-apply sorting if it depends on last_adjustmentDate or last_receiptDate
    if sort_by:
        reverse = sort_order.lower() == "desc"
        if sort_by == "last_adjustment":
            report_items.sort(
                key=lambda x: x.lastAdjustmentDate or datetime.min, reverse=reverse
            )
        elif sort_by == "last_receipt":
            report_items.sort(
                key=lambda x: x.lastReceiptDate or datetime.min, reverse=reverse
            )

    return StockReportResponse(
        reportDate=datetime.now(), items=report_items, totalItems=total_items
    )


@router.get("/", response_model=List[ProductFullResponse])
async def get_all_products(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),  # Any authenticated user
    search: Optional[str] = None,  # New search parameter
):
    """
    Retrieves a list of all products, with optional search functionality (accessible by any authenticated user).
    """
    where_clause = {}
    if search:
        where_clause = {
            "OR": [
                {"name": {"contains": search, "mode": "insensitive"}},
                {"reference": {"contains": search, "mode": "insensitive"}},
            ]
        }

    products = await db.product.find_many(
        where=where_clause, include={"category": True}, order={"name": "asc"}
    )
    return [ProductFullResponse.model_validate(p) for p in products]


@router.put("/{product_id}", response_model=ProductFullResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER])),
):
    """
    Updates a product's details (only accessible by ADMIN).
    """
    update_fields = product_data.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update provided",
        )

    # If categoryId is being updated, check if the new category exists
    if "categoryId" in update_fields:
        category = await db.category.find_unique(
            where={"id": update_fields["categoryId"]}
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="New category not found"
            )

    # Fetch current product to check against new quantity/minStock
    current_product = await db.product.find_unique(where={"id": product_id})
    if not current_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    # Add check for negative quantity if it's being updated
    if "quantity" in update_fields:
        new_quantity = update_fields["quantity"]
        if new_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product quantity cannot be set to a negative value.",
            )
        # If quantity is updated, then current_product.quantity is already old,
        # so check against new_quantity for minStock
        updated_quantity_for_check = new_quantity
    else:
        updated_quantity_for_check = current_product.quantity # Use current quantity for check if not being updated

    updated_min_stock = update_fields.get("minStock", current_product.minStock)

    # Optional: You could add a check here if updated_quantity_for_check < updated_min_stock
    # but _check_and_notify_low_stock will handle notifications, not prevents update.

    try:
        product = await db.product.update(
            where={"id": product_id}, data=update_fields, include={"category": True}
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        await _check_and_notify_low_stock(product.id, db)  # Check after product update
        return ProductFullResponse.model_validate(product)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with this reference may already exist or other update error: {e}",
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Deletes a product by its ID (only accessible by ADMIN).
    """
    try:
        deleted_product = await db.product.delete(where={"id": product_id})
        if not deleted_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found or could not be deleted: {e}",
        )


@router.post(
    "/receive", response_model=StockReceiptResponse, status_code=status.HTTP_200_OK
)
async def receive_stock(
    receipt_data: StockReceiptCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        role_required([UserRole.ADMIN, UserRole.MAGASINIER])
    ),
):
    """
    Initiates a stock receipt for a product.
    If ADMIN, applies directly. If MAGASINIER, creates a pending receipt for DAF approval.
    """
    if receipt_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received quantity must be positive.",
        )

    async with db.tx() as transaction:
        product = await transaction.product.find_unique(
            where={"id": receipt_data.productId}
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
            )

        if current_user.role == UserRole.ADMIN:
            # ADMINs can receive stock directly
            await transaction.product.update(
                where={"id": product.id},
                data={"quantity": product.quantity + receipt_data.quantity},
            )

            await transaction.transaction.create(
                data={
                    "productId": product.id,
                    "userId": current_user.id,
                    "type": StockAdjustmentType.ENTREE,  # Use ENTREE for receipts
                    "source": TransactionSource.RECEIPT,  # Mark as RECEIPT
                    "quantity": receipt_data.quantity,
                }
            )

            # Create an APPROVED StockReceipt record for ADMIN's direct action
            stock_receipt = await transaction.stockreceipt.create(
                data={
                    "productId": product.id,
                    "quantity": receipt_data.quantity,
                    "supplierName": receipt_data.supplierName,
                    "batchNumber": receipt_data.batchNumber,
                    "requestedById": current_user.id,
                    "status": StockReceiptStatus.APPROVED,
                    "approvedById": current_user.id,
                    "approvedAt": datetime.now(),
                },
                include={"product": True, "requestedBy": True, "approvedBy": True},
            )
            await _check_and_notify_low_stock(product.id, db)  # Call helper function
            return StockReceiptResponse.model_validate(stock_receipt)

        elif current_user.role == UserRole.MAGASINIER:
            # MAGASINIERs create a pending receipt for DAF approval
            stock_receipt = await transaction.stockreceipt.create(
                data={
                    "productId": product.id,
                    "quantity": receipt_data.quantity,
                    "supplierName": receipt_data.supplierName,
                    "batchNumber": receipt_data.batchNumber,
                    "requestedById": current_user.id,
                    "status": StockReceiptStatus.PENDING,
                },
                include={"product": True, "requestedBy": True},
            )

            # --- NOTIFICATION: Notify DAFs ---
            daf_users = await db.user.find_many(where={"role": UserRole.DAF})
            daf_ids = [u.id for u in daf_users]
            await manager.send_to_users(
                {
                    "type": "daf_approval_request",
                    "message": f"Nouvelle demande de réception de stock (Produit: {product.name}) en attente d'approbation.",
                },
                daf_ids,
            )
            # --- END NOTIFICATION ---

            return StockReceiptResponse.model_validate(stock_receipt)

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized role for stock receipt.",
            )


@router.post(
    "/receive-batch",
    response_model=List[StockReceiptResponse],
    status_code=status.HTTP_200_OK,
)
async def receive_stock_batch(
    batch_data: BatchStockReceiptCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        role_required([UserRole.ADMIN, UserRole.MAGASINIER])
    ),
):
    """
    Initiates a batch stock receipt for multiple products.
    If ADMIN, applies directly. If MAGASINIER, creates pending receipts for DAF approval.
    """
    created_receipts = []
    async with db.tx() as transaction:
        for item_data in batch_data.items:
            if item_data.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Received quantity for product {item_data.productId} must be positive.",
                )

            product = await transaction.product.find_unique(
                where={"id": item_data.productId}
            )
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item_data.productId} not found.",
                )

            if current_user.role == UserRole.ADMIN:
                # ADMINs can receive stock directly
                await transaction.product.update(
                    where={"id": product.id},
                    data={"quantity": product.quantity + item_data.quantity},
                )

                await transaction.transaction.create(
                    data={
                        "productId": product.id,
                        "userId": current_user.id,
                        "type": StockAdjustmentType.ENTREE,
                        "source": TransactionSource.RECEIPT,
                        "quantity": item_data.quantity,
                    }
                )

                stock_receipt = await transaction.stockreceipt.create(
                    data={
                        "productId": product.id,
                        "quantity": item_data.quantity,
                        "supplierName": item_data.supplierName,
                        "batchNumber": item_data.batchNumber,
                        "requestedById": current_user.id,
                        "status": StockReceiptStatus.APPROVED,
                        "approvedById": current_user.id,
                        "approvedAt": datetime.now(),
                    },
                    include={"product": True, "requestedBy": True, "approvedBy": True},
                )
                await _check_and_notify_low_stock(
                    product.id, db
                )  # Call helper function
                created_receipts.append(
                    StockReceiptResponse.model_validate(stock_receipt)
                )

            elif current_user.role == UserRole.MAGASINIER:
                stock_receipt = await transaction.stockreceipt.create(
                    data={
                        "productId": product.id,
                        "quantity": item_data.quantity,
                        "supplierName": item_data.supplierName,
                        "batchNumber": item_data.batchNumber,
                        "requestedById": current_user.id,
                        "status": StockReceiptStatus.PENDING,
                    },
                    include={"product": True, "requestedBy": True},
                )
                created_receipts.append(
                    StockReceiptResponse.model_validate(stock_receipt)
                )

                # --- NOTIFICATION: Notify DAFs ---
                daf_users = await db.user.find_many(where={"role": UserRole.DAF})
                daf_ids = [u.id for u in daf_users]
                await manager.send_to_users(
                    {
                        "type": "daf_approval_request",
                        "message": f"Nouvelle demande de réception de stock par lot (Produit: {product.name}) en attente d'approbation.",
                    },
                    daf_ids,
                )
                # --- END NOTIFICATION ---

            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized role for batch stock receipt.",
                )

    return created_receipts


@router.put("/stock-receipts/{receipt_id}/decide", response_model=StockReceiptResponse)
async def decide_stock_receipt(
    receipt_id: str,
    decision_data: StockReceiptDecision,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
):
    """
    DAF approves or rejects a pending stock receipt.
    """
    async with db.tx() as transaction:
        stock_receipt = await transaction.stockreceipt.find_unique(
            where={"id": receipt_id}, include={"product": True, "requestedBy": True}
        )
        if not stock_receipt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stock receipt request not found.",
            )
        if stock_receipt.status != StockReceiptStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock receipt is not in PENDING status.",
            )

        updated_receipt_status: StockReceiptStatus
        notification_message: str

        if decision_data.decision.upper() == "APPROVE":
            # Apply the stock change
            product = stock_receipt.product
            await transaction.product.update(
                where={"id": product.id},
                data={"quantity": product.quantity + stock_receipt.quantity},
            )

            await transaction.transaction.create(
                data={
                    "productId": product.id,
                    "userId": stock_receipt.requestedById,  # User who requested the receipt
                    "type": StockAdjustmentType.ENTREE,  # Always ENTREE for receipts
                    "source": TransactionSource.RECEIPT,  # Mark as RECEIPT
                    "quantity": stock_receipt.quantity,
                }
            )
            updated_receipt_status = StockReceiptStatus.APPROVED
            notification_message = f"Votre demande de réception de stock (Produit: {product.name}) a été approuvée."
            await _check_and_notify_low_stock(product.id, db)  # Call helper function

        elif decision_data.decision.upper() == "REJECT":
            updated_receipt_status = StockReceiptStatus.REJECTED
            notification_message = f"Votre demande de réception de stock (Produit: {stock_receipt.product.name}) a été rejetée."
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid decision. Must be 'APPROVE' or 'REJECT'.",
            )

        updated_stock_receipt = await transaction.stockreceipt.update(
            where={"id": receipt_id},
            data={
                "status": updated_receipt_status,
                "approvedById": current_user.id,
                "approvedAt": datetime.now(),
                "dafComment": decision_data.comment,
            },
            include={"product": True, "requestedBy": True, "approvedBy": True},
        )

        # --- NOTIFICATION: Notify Requester (MAGASINIER) ---
        await manager.send_personal_message(
            {"type": "daf_receipt_decision", "message": notification_message},
            stock_receipt.requestedById,
        )
        # --- END NOTIFICATION ---

        return StockReceiptResponse.model_validate(updated_stock_receipt)


@router.get("/stock-receipts/my-receipts", response_model=List[StockReceiptResponse])
async def get_my_stock_receipts(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.MAGASINIER)),
    search: Optional[str] = None,  # For future search functionality
):
    """
    Retrieves a list of stock receipts requested by the current Magasinier.
    """
    where_clause = {"requestedById": current_user.id}
    if search:
        where_clause["OR"] = [
            {"product": {"name": {"contains": search, "mode": "insensitive"}}},
            {"supplierName": {"contains": search, "mode": "insensitive"}},
            {"batchNumber": {"contains": search, "mode": "insensitive"}},
        ]

    stock_receipts = await db.stockreceipt.find_many(
        where=where_clause,
        include={"product": True, "requestedBy": True, "approvedBy": True},
        order={"createdAt": "desc"},
    )
    return [StockReceiptResponse.model_validate(sr) for sr in stock_receipts]


@router.get("/stock-receipts/pending", response_model=List[StockReceiptResponse])
async def get_pending_stock_receipts(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
    search: Optional[str] = None,  # For future search functionality
):
    """
    Retrieves a list of pending stock receipts for DAF approval.
    """
    where_clause = {"status": StockReceiptStatus.PENDING}
    if search:
        where_clause["OR"] = [
            {"product": {"name": {"contains": search, "mode": "insensitive"}}},
            {"supplierName": {"contains": search, "mode": "insensitive"}},
            {"batchNumber": {"contains": search, "mode": "insensitive"}},
            {"requestedBy": {"name": {"contains": search, "mode": "insensitive"}}},
        ]
    stock_receipts = await db.stockreceipt.find_many(
        where=where_clause,
        include={"product": True, "requestedBy": True, "approvedBy": True},
        order={"createdAt": "desc"},
    )
    return [StockReceiptResponse.model_validate(sr) for sr in stock_receipts]


@router.post("/{product_id}/adjust-stock", response_model=StockAdjustmentResponse)
async def adjust_stock(
    product_id: str,
    adjustment_data: StockAdjustmentCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        role_required([UserRole.ADMIN, UserRole.MAGASINIER])
    ),
):
    """
    Initiates a stock adjustment for a product.
    If ADMIN, applies directly. If MAGASINIER, creates a pending adjustment for DAF approval.
    """
    if adjustment_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment quantity must be positive.",
        )

    async with db.tx() as transaction:
        product = await transaction.product.find_unique(where={"id": product_id})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )

        if current_user.role == UserRole.ADMIN:
            # ADMINs can adjust stock directly
            new_quantity = product.quantity
            if adjustment_data.type == StockAdjustmentType.ENTREE:
                new_quantity += adjustment_data.quantity
            elif adjustment_data.type == StockAdjustmentType.SORTIE:
                new_quantity -= adjustment_data.quantity

            if new_quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Stock quantity cannot be negative.",
                )

            await transaction.product.update(
                where={"id": product_id}, data={"quantity": new_quantity}
            )

            await transaction.transaction.create(
                data={
                    "productId": product_id,
                    "userId": current_user.id,
                    "type": adjustment_data.type.value,
                    "quantity": adjustment_data.quantity,
                    "source": TransactionSource.ADJUSTMENT,
                }
            )

            # Create an APPROVED StockAdjustment record for ADMIN's direct action
            stock_adjustment = await transaction.stockadjustment.create(
                data={
                    "productId": product_id,
                    "quantity": adjustment_data.quantity,
                    "type": adjustment_data.type.value,
                    "reason": adjustment_data.reason,
                    "requestedById": current_user.id,
                    "status": StockAdjustmentStatus.APPROVED,
                    "approvedById": current_user.id,
                    "approvedAt": datetime.now(),
                },
                include={"product": True, "requestedBy": True, "approvedBy": True},
            )
            await _check_and_notify_low_stock(product_id, db)  # Call helper function
            return StockAdjustmentResponse.model_validate(stock_adjustment)

        elif current_user.role == UserRole.MAGASINIER:
            # MAGASINIERs create a pending adjustment for DAF approval
            stock_adjustment = await transaction.stockadjustment.create(
                data={
                    "productId": product_id,
                    "quantity": adjustment_data.quantity,
                    "type": adjustment_data.type.value,
                    "reason": adjustment_data.reason,
                    "requestedById": current_user.id,
                    "status": StockAdjustmentStatus.PENDING,
                },
                include={"product": True, "requestedBy": True},
            )

            # --- NOTIFICATION: Notify DAFs ---
            daf_users = await db.user.find_many(where={"role": UserRole.DAF})
            daf_ids = [u.id for u in daf_users]
            await manager.send_to_users(
                {
                    "type": "daf_approval_request",
                    "message": f"Nouvelle demande d'ajustement de stock (Produit: {product.name}) en attente d'approbation.",
                },
                daf_ids,
            )
            # --- END NOTIFICATION ---

            return StockAdjustmentResponse.model_validate(stock_adjustment)

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized role for stock adjustment.",
            )


@router.put(
    "/stock-adjustments/{adjustment_id}/decide", response_model=StockAdjustmentResponse
)
async def decide_stock_adjustment(
    adjustment_id: str,
    decision_data: StockAdjustmentDecision,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
):
    """
    DAF approves or rejects a pending stock adjustment.
    If the adjustment is linked to an audit, this may trigger the audit's closure.
    """
    updated_stock_adjustment = None
    original_requester_id = None
    
    async with db.tx() as transaction:
        stock_adjustment = await transaction.stockadjustment.find_unique(
            where={"id": adjustment_id}, include={"product": True}
        )
        if not stock_adjustment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stock adjustment request not found.",
            )
        if stock_adjustment.status != StockAdjustmentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock adjustment is not in PENDING status.",
            )
        
        original_requester_id = stock_adjustment.requestedById
        updated_adjustment_status: StockAdjustmentStatus
        notification_message: str

        if decision_data.decision.upper() == "APPROVE":
            product = stock_adjustment.product
            new_quantity = product.quantity
            if stock_adjustment.type == StockAdjustmentType.ENTREE:
                new_quantity += stock_adjustment.quantity
            elif stock_adjustment.type == StockAdjustmentType.SORTIE:
                new_quantity -= stock_adjustment.quantity

            if new_quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Stock quantity cannot be negative.",
                )

            await transaction.product.update(
                where={"id": product.id}, data={"quantity": new_quantity}
            )

            await transaction.transaction.create(
                data={
                    "productId": product.id,
                    "userId": stock_adjustment.requestedById,
                    "type": stock_adjustment.type,
                    "quantity": stock_adjustment.quantity,
                    "source": TransactionSource.ADJUSTMENT,
                }
            )
            updated_adjustment_status = StockAdjustmentStatus.APPROVED
            notification_message = f"Votre demande d'ajustement (Produit: {product.name}) a été approuvée."
            await _check_and_notify_low_stock(product.id, transaction)

        elif decision_data.decision.upper() == "REJECT":
            updated_adjustment_status = StockAdjustmentStatus.REJECTED
            notification_message = f"Votre demande d'ajustement (Produit: {stock_adjustment.product.name}) a été rejetée."
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid decision. Must be 'APPROVE' or 'REJECT'.",
            )

        updated_stock_adjustment = await transaction.stockadjustment.update(
            where={"id": adjustment_id},
            data={
                "status": updated_adjustment_status,
                "approvedById": current_user.id,
                "approvedAt": datetime.now(),
                "dafComment": decision_data.comment,
            },
            include={"product": True, "requestedBy": True, "approvedBy": True},
        )
    
    # --- Post-Transaction Logic ---
    if not updated_stock_adjustment:
        # This case should not be reached if the logic inside the tx is correct
        raise HTTPException(status_code=500, detail="Failed to process stock adjustment decision.")

    if original_requester_id:
        # --- NOTIFICATION: Notify Requester (MAGASINIER) ---
        await manager.send_personal_message(
            {"type": "daf_adjustment_decision", "message": notification_message},
            original_requester_id,
        )

    # --- NEW: Check if this adjustment closes an audit ---
    if updated_stock_adjustment.inventoryAuditId:
        await check_and_close_audit(db, updated_stock_adjustment.inventoryAuditId)

    return StockAdjustmentResponse.model_validate(updated_stock_adjustment)


@router.get(
    "/stock-adjustments/my-adjustments", response_model=List[StockAdjustmentResponse]
)
async def get_my_stock_adjustments(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.MAGASINIER)),
    search: Optional[str] = None,  # For future search functionality
):
    """
    Retrieves a list of stock adjustments requested by the current Magasinier.
    """
    where_clause = {"requestedById": current_user.id}
    if search:
        where_clause["OR"] = [
            {"product": {"name": {"contains": search, "mode": "insensitive"}}},
            {"reason": {"contains": search, "mode": "insensitive"}},
        ]

    stock_adjustments = await db.stockadjustment.find_many(
        where=where_clause,
        include={"product": True, "requestedBy": True, "approvedBy": True},
        order={"createdAt": "desc"},
    )
    return [StockAdjustmentResponse.model_validate(sa) for sa in stock_adjustments]


@router.get("/stock-adjustments/pending", response_model=List[StockAdjustmentResponse])
async def get_pending_stock_adjustments(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
    search: Optional[str] = None,  # For future search functionality
):
    """
    Retrieves a list of pending stock adjustments for DAF approval.
    """
    where_clause = {"status": StockAdjustmentStatus.PENDING}
    if search:
        where_clause["OR"] = [
            {"product": {"name": {"contains": search, "mode": "insensitive"}}},
            {"reason": {"contains": search, "mode": "insensitive"}},
            {"requestedBy": {"name": {"contains": search, "mode": "insensitive"}}},
        ]
    stock_adjustments = await db.stockadjustment.find_many(
        where=where_clause,
        include={"product": True, "requestedBy": True, "approvedBy": True},
        order={"createdAt": "desc"},
    )
    return [StockAdjustmentResponse.model_validate(sa) for sa in stock_adjustments]


@router.get("/transactions/history", response_model=PaginatedTransactionHistoryResponse)
async def get_transaction_history(
    db: Prisma = Depends(get_db),
        current_user: CurrentUser = Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER, UserRole.CHEF_SERVICE, UserRole.SUPER_OBSERVATEUR])),
    product_id: Optional[str] = None,
    user_id: Optional[str] = None,
    transaction_type: Optional[TransactionType] = None,
    transaction_source: Optional[TransactionSource] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 10,
):
    """
    Retrieves a paginated history of stock transactions with filtering capabilities.
    Accessible by ADMIN, MAGASINIER, CHEF_SERVICE.
    """
    where_clause = {}
    if product_id:
        where_clause["productId"] = product_id
    if user_id:
        where_clause["userId"] = user_id
    if transaction_type:
        where_clause["type"] = transaction_type
    if transaction_source:
        where_clause["source"] = transaction_source

    if start_date or end_date:
        where_clause["createdAt"] = {}
        if start_date:
            where_clause["createdAt"]["gte"] = start_date
        if end_date:
            where_clause["createdAt"]["lte"] = end_date

    total_items = await db.transaction.count(where=where_clause)

    transactions = await db.transaction.find_many(
        where=where_clause,
        include={
            "product": {
                "select": {"id": True, "name": True, "reference": True, "unit": True}
            },
            "user": {"select": {"id": True, "name": True, "email": True, "role": True}},
        },
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )

    return PaginatedTransactionHistoryResponse(
        items=[TransactionHistoryResponse.model_validate(t) for t in transactions],
        totalItems=total_items,
        page=page,
        pageSize=page_size,
    )


@router.get(
    "/stock-status-report-v2",
    response_model=PaginatedProductStockStatusResponse,
    dependencies=[Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],
)
async def get_product_stock_status(
    db: Prisma = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None, # NEW: Add search parameter
    categoryId: Optional[str] = None, # NEW: Add categoryId parameter
):
    """
    Retrieves a paginated list of product stock statuses with optional search and category filtering.
    - Accessible by ADMIN and MAGASINIER.
    """
    where_clause = {} # NEW: Initialize where_clause
    if search: # NEW: Add search filter
        where_clause["OR"] = [
            {"name": {"contains": search, "mode": "insensitive"}},
            {"reference": {"contains": search, "mode": "insensitive"}},
        ]
    if categoryId: # NEW: Add category filter
        where_clause["categoryId"] = categoryId

    products = await db.product.find_many(
        where=where_clause, # NEW: Pass where_clause
        include={"category": True},
        skip=(page - 1) * page_size,
        take=page_size,
        order={"name": "asc"}
    )
    total_products = await db.product.count(where=where_clause) # NEW: Apply where_clause to count

    status_report: List[ProductStockStatus] = []
    for product in products:
        status = _calculate_product_stock_status(product)
        status_report.append(
            ProductStockStatus(
                id=product.id,
                name=product.name,
                reference=product.reference,
                category=product.category,
                quantity=product.quantity,
                minStock=product.minStock,
                unit=product.unit,
                location=product.location,
                status=status,
            )
        )
    return PaginatedProductStockStatusResponse(
        items=status_report,
        totalItems=total_products,
        page=page,
        pageSize=page_size,
    )


@router.get(
    "/low-stock-alerts",
    response_model=PaginatedProductStockStatusResponse,
    dependencies=[Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER, UserRole.CHEF_SERVICE]))],
)
async def get_low_stock_alerts(
    db: Prisma = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    categoryId: Optional[str] = None,
):
    """
    Retrieves a paginated list of products with low stock (quantity <= minStock).
    - Accessible by ADMIN, MAGASINIER, CHEF_SERVICE.
    """
    base_where_clause = {}
    if search:
        base_where_clause["OR"] = [
            {"name": {"contains": search, "mode": "insensitive"}},
            {"reference": {"contains": search, "mode": "insensitive"}},
        ]
    if categoryId:
        base_where_clause["categoryId"] = categoryId

    # Fetch all products matching initial filters
    all_products = await db.product.find_many(
        where=base_where_clause,
        include={"category": True},
        order={"name": "asc"}
    )

    # Filter products in Python for low stock condition
    low_stock_products = [p for p in all_products if p.quantity <= p.minStock]

    total_products = len(low_stock_products)

    # Apply pagination to the filtered list
    paginated_low_stock_products = low_stock_products[(page - 1) * page_size : page * page_size]

    status_report: List[ProductStockStatus] = []
    for product in paginated_low_stock_products:
        status = _calculate_product_stock_status(product)
        status_report.append(
            ProductStockStatus(
                id=product.id,
                name=product.name,
                reference=product.reference,
                category=product.category,
                quantity=product.quantity,
                minStock=product.minStock,
                unit=product.unit,
                location=product.location,
                status=status,
            )
        )
    return PaginatedProductStockStatusResponse(
        items=status_report,
        totalItems=total_products,
        page=page,
        pageSize=page_size,
    )


@router.get(
            "/stock-status-report-v2/export",
            dependencies=[Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],)
async def export_product_stock_status(
    db: Prisma = Depends(get_db),
    search: Optional[str] = None, # New search parameter
    categoryId: Optional[str] = None, # New categoryId parameter
):
    """
    Exports a CSV report of product stock statuses.
    - Accessible by ADMIN and MAGASINIER.
    """
    where_clause = {}
    if search:
        where_clause["OR"] = [
            {"name": {"contains": search, "mode": "insensitive"}},
            {"reference": {"contains": search, "mode": "insensitive"}},
        ]
    if categoryId:
        where_clause["categoryId"] = categoryId

    products = await db.product.find_many(where=where_clause, include={"category": True})

    status_report: List[ProductStockStatus] = []
    for product in products:
        status = _calculate_product_stock_status(product)
        status_report.append(
            ProductStockStatus(
                id=product.id,
                name=product.name,
                reference=product.reference,
                category=product.category,
                quantity=product.quantity,
                minStock=product.minStock,
                unit=product.unit,
                location=product.location,
                status=status,
            )
        )

    # Translation map for StockStatusEnum to French
    status_translations = {
        StockStatusEnum.OUT_OF_STOCK: "Rupture",
        StockStatusEnum.CRITICAL: "Critique",
        StockStatusEnum.AVAILABLE: "Disponible",
    }

    output = StringIO()
    writer = csv.writer(output)
    # Write header
    writer.writerow(
        [
            "ID",
            "Nom",
            "Référence",
            "Catégorie",
            "Quantité",
            "Stock Min",
            "Unité",
            "Emplacement",
            "Statut",
        ]
    )
    # Write data
    for item in status_report:
        translated_status = status_translations.get(item.status, item.status.value)
        writer.writerow(
            [
                item.id,
                item.name,
                item.reference,
                item.category.name,
                item.quantity,
                item.minStock,
                item.unit,
                item.location,
                translated_status,
            ]
        )
    output.seek(0)
    return Response(
        content=output.read(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_etat_stock_{datetime.now().strftime('%Y%m%d')}.csv"
        },
    )

@router.get("/{product_id}", response_model=ProductFullResponse)
async def get_product_by_id(
    product_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),  # Any authenticated user
):
    """
    Retrieves a single product by its ID (accessible by any authenticated user).
    """
    product = await db.product.find_unique(
        where={"id": product_id}, include={"category": True}
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return ProductFullResponse.model_validate(product)

from weasyprint import HTML
import base64
from pathlib import Path

@router.get(
    "/stock-status-report-v2/export/pdf",
    dependencies=[Depends(role_required([UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],
)
async def export_product_stock_status_pdf(
    db: Prisma = Depends(get_db),
    search: Optional[str] = None, # New search parameter
    categoryId: Optional[str] = None, # New categoryId parameter
):
    """
    Exports a PDF report of product stock statuses.
    """
    # --- Fetch Data ---
    where_clause = {}
    if search:
        where_clause["OR"] = [
            {"name": {"contains": search, "mode": "insensitive"}},
            {"reference": {"contains": search, "mode": "insensitive"}},
        ]
    if categoryId:
        where_clause["categoryId"] = categoryId

    products = await db.product.find_many(where=where_clause, include={"category": True})
    status_report: List[ProductStockStatus] = []
    for product in products:
        status = _calculate_product_stock_status(product)
        status_report.append(
            ProductStockStatus(
                id=product.id,
                name=product.name,
                reference=product.reference,
                category=product.category,
                quantity=product.quantity,
                minStock=product.minStock,
                unit=product.unit,
                location=product.location,
                status=status,
            )
        )

    # --- Prepare Logo ---
    logo_path = Path(__file__).parent.parent.parent.parent / 'frontend' / 'public' / 'Logo_PF.jpeg'
    logo_base64 = ''
    try:
        with open(logo_path, 'rb') as f:
            logo_base64 = base64.b64encode(f.read()).decode('utf-8')
    except FileNotFoundError:
        # Handle case where logo is not found, maybe log a warning
        pass
    
    logo_img_tag = f'<img src="data:image/jpeg;base64,{logo_base64}" alt="Logo Postefinances" style="width: 150px; height: auto;">' if logo_base64 else ''


    # --- Build HTML ---
    html_string = f"""
    <html>
        <head>
            <style>
                body {{ font-family: sans-serif; }}
                h1 {{ color: #004494; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ border: 1px solid #dddddd; text-align: left; padding: 8px; }}
                thead {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            {logo_img_tag}
            <h1>Rapport d'État des Stocks</h1>
            <p>Date du rapport: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
            <table>
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Référence</th>
                        <th>Catégorie</th>
                        <th>Quantité</th>
                        <th>Stock Min</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
    """
    status_translations = {
        StockStatusEnum.OUT_OF_STOCK: "Rupture",
        StockStatusEnum.CRITICAL: "Critique",
        StockStatusEnum.AVAILABLE: "Disponible",
    }
    for item in status_report:
        translated_status = status_translations.get(item.status, item.status.value)
        html_string += f"""
        <tr>
            <td>{item.name}</td>
            <td>{item.reference}</td>
            <td>{item.category.name}</td>
            <td>{item.quantity}</td>
            <td>{item.minStock}</td>
            <td>{translated_status}</td>
        </tr>
        """

    html_string += """
                </tbody>
            </table>
        </body>
    </html>
    """

    # --- Generate PDF ---
    pdf_bytes = HTML(string=html_string).write_pdf()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_etat_stock_{datetime.now().strftime('%Y%m%d')}.pdf"
        },
    )


