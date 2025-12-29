# backend/app/services/notification_service.py
from fastapi import Depends
from database.generated.prisma import Prisma
from app.database import get_db
from app.api.auth import CurrentUser
from app.crud import notifications as crud_notifications

class NotificationService:
    def __init__(self, db: Prisma = Depends(get_db)):
        self.db = db

    async def get_notification_counts(self, user: CurrentUser) -> dict:
        """
        Orchestre la récupération des comptes de notifications pour un utilisateur.
        """
        return await crud_notifications.get_notification_counts(self.db, user)
