# app/api/routes/reports.py
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.api import schemas
from app.api.auth import UserRole, role_required
from app.services.reports import ReportService

router = APIRouter()

@router.get(
    "/stock-valuation-by-category",
    response_model=List[schemas.StockValuationByCategory],
    dependencies=[Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock valuation by category",
    tags=["Reports"],
)
async def get_stock_valuation_by_category_report(
    service: ReportService = Depends(),
):
    """
    Retrieves a report of the total stock value grouped by product category.
    
    - **DAF, ADMIN, SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_valuation_by_category()

@router.get(
    "/stock-turnover",
    response_model=schemas.StockTurnoverReportResponse,
    dependencies=[Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock turnover report",
    tags=["Reports"],
)
async def get_stock_turnover_report(
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
    service: ReportService = Depends(),
):
    """
    Retrieves a report of stock turnover for each product within a specified date range.
    
    - **DAF, ADMIN, MAGASINIER, SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_turnover(start_date, end_date)

@router.get(
    "/stock-requests",
    response_model=List[schemas.StockRequestReportResponse],
    dependencies=[Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock requests report",
    tags=["Reports"],
)
async def get_stock_requests_report_endpoint(
    start_date: Optional[datetime] = Query(None, description="Start date for the report"),
    end_date: Optional[datetime] = Query(None, description="End date for the report"),
    requester_id: Optional[str] = Query(None, description="ID of the requester"),
    status: Optional[str] = Query(None, description="Filter by request status"),
    service: ReportService = Depends(),
):
    """
    Retrieves a report of stock requests within a specified date range and/or for a specific requester and/or status.
    
    - **DAF, ADMIN, MAGASINIER, SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_requests_report(start_date, end_date, requester_id, status)

@router.get(
    "/stock-history",
    response_model=schemas.PaginatedTransactionHistoryResponse,
    dependencies=[Depends(role_required([UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock history report",
    tags=["Reports"],
)
async def get_stock_history_report_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    start_date: Optional[datetime] = Query(None, description="Start date for the report"),
    end_date: Optional[datetime] = Query(None, description="End date for the report"),
    product_id: Optional[str] = Query(None, description="ID of the product"),
    user_id: Optional[str] = Query(None, description="ID of the user who initiated the transaction"),
    service: ReportService = Depends(),
):
    """
    Retrieves a paginated report of stock transaction history with optional filters.
    
    - **ADMIN & SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_history_report(page, page_size, start_date, end_date, product_id, user_id)

@router.get(
    "/stock-status",
    response_model=schemas.PaginatedProductStockStatusResponse,
    dependencies=[Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.MAGASINIER, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock status report",
    tags=["Reports"],
)
async def get_stock_status_report_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    status_filter: Optional[str] = Query(None, description="Filter by stock status (AVAILABLE, CRITICAL, OUT_OF_STOCK)"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    service: ReportService = Depends(),
):
    """
    Retrieves a paginated report of the current stock status for all products.
    
    - **DAF, ADMIN, MAGASINIER, SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_status_report(page, page_size, status_filter, category_id)

@router.get(
    "/stock-value",
    response_model=schemas.StockValueReportResponse,
    dependencies=[Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR]))],
    summary="Get stock value report",
    tags=["Reports"],
)
async def get_stock_value_report_endpoint(
    service: ReportService = Depends(),
):
    """
    Retrieves a report of the total stock value per product and the overall total stock value.
    
    - **DAF, ADMIN, SUPER_OBSERVATEUR only**
    """
    return await service.get_stock_value_report()