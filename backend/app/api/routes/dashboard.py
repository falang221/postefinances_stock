from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import CurrentUser, get_current_user
from app.api.schemas import DashboardStats
from app.database import get_db
from database.generated.prisma import Prisma  # Corrected import path

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        get_current_user
    ),  # Accessible by any authenticated user
):
    """
    Retrieves aggregated statistics for the main dashboard.
    - lowStock: Number of products below their minimum stock level.
    - pendingApprovals: Number of requests awaiting approval.
    - totalItems: Total quantity of all items in stock.
    """
    try:
        # Fetch products to determine minStock dynamically
        products = await db.product.find_many(
            select={"quantity": True, "minStock": True}
        )

        low_stock_count = sum(1 for p in products if p.quantity < p.minStock)

        pending_approvals_count = await db.request.count(
            where={"status": "TRANSMISE"}
        )

        total_items_aggregate = await db.product.aggregate(_sum={"quantity": True})
        total_items_count = (
            total_items_aggregate["_sum"]["quantity"]
            if total_items_aggregate["_sum"]
            and total_items_aggregate["_sum"]["quantity"] is not None
            else 0
        )

        return DashboardStats(
            lowStock=low_stock_count,
            pendingApprovals=pending_approvals_count,
            totalItems=total_items_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching dashboard stats: {e}",
        )
