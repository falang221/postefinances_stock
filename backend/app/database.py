from database.generated.prisma import Prisma
from typing import AsyncGenerator


async def get_db() -> AsyncGenerator[Prisma, None]:
    """
    FastAPI dependency that provides a database session for a single request.
    Ensures the connection is closed after the request is finished.
    """
    db = Prisma()
    try:
        await db.connect()
        yield db
    finally:
        if db.is_connected():
            await db.disconnect()
