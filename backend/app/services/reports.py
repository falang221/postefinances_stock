# app/services/reports.py
from datetime import datetime
from typing import List, Optional # Add Optional here
from fastapi import Depends
from database.generated.prisma import Prisma

from app.database import get_db
from app.crud import reports as crud_reports

class ReportService:
    def __init__(self, db: Prisma = Depends(get_db)):
        self.db = db

    async def get_stock_valuation_by_category(self):
        """
        Orchestre la récupération du rapport de valorisation du stock par catégorie.
        """
        report_data = await crud_reports.get_stock_valuation_by_category(self.db)
        return report_data

    async def get_stock_turnover(self, start_date: datetime, end_date: datetime):
        """
        Orchestre la récupération du rapport de rotation des stocks.
        """
        report_data = await crud_reports.get_stock_turnover(self.db, start_date, end_date)
        return report_data

    async def get_stock_requests_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        requester_id: Optional[str] = None
    ):
        """
        Orchestre la récupération du rapport des demandes de stock.
        """
        report_data = await crud_reports.get_stock_requests_report(self.db, start_date, end_date, requester_id)
        return report_data

    async def get_stock_history_report(
        self,
        page: int = 1,
        page_size: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        """
        Orchestre la récupération du rapport d'historique des stocks.
        """
        report_data = await crud_reports.get_stock_history_report(
            self.db, page, page_size, start_date, end_date, product_id, user_id
        )
        return report_data

    async def get_stock_value_report(self):
        """
        Orchestre la récupération du rapport de la valeur du stock.
        """
        report_data = await crud_reports.get_stock_value_report(self.db)
        return report_data
