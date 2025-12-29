
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.auth import CurrentUser, UserRole, role_required
from app.api.schemas import StockAdjustmentDirectCreate, StockAdjustmentResponse
from app.crud import stock_adjustment as crud
from app.database import get_db
from database.generated.prisma import Prisma
from app.websockets import manager

router = APIRouter(prefix="/stock-adjustments", tags=["Stock Adjustments"])

@router.post(
    "/",
    response_model=StockAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a direct stock adjustment",
    description="Allows an admin to directly adjust the stock quantity of a product. This action is automatically approved.",
)
async def create_direct_stock_adjustment(
    adjustment_data: StockAdjustmentDirectCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.ADMIN])),
):
    """
    Crée un ajustement de stock direct.
    - **productId**: ID du produit à ajuster.
    - **newQuantity**: La nouvelle quantité totale en stock pour le produit.
    - **reason**: Justification de l'ajustement.
    
    Cette opération est réservée aux administrateurs et est approuvée automatiquement.
    """
    try:
        new_adjustment = await crud.create_stock_adjustment(
            db=db,
            user=current_user,
            product_id=adjustment_data.productId,
            new_quantity=adjustment_data.newQuantity,
            reason=adjustment_data.reason,
        )
        if new_adjustment is None:
             raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="No stock adjustment was made as the quantity is already correct.",
            )

        # Notify all users about the stock update
        await manager.broadcast({
            "type": "stock_update",
            "data": {
                "productId": new_adjustment.productId,
                "newQuantity": adjustment_data.newQuantity
            }
        })
        
        # We need to fetch the created adjustment with its relations to match the response model
        created_adjustment_with_relations = await db.stockadjustment.find_unique(
            where={"id": new_adjustment.id},
            include={"product": True, "requestedBy": True, "approvedBy": True}
        )

        return StockAdjustmentResponse.model_validate(created_adjustment_with_relations)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
