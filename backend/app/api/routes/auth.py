from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import create_access_token, verify_password

# Import schemas and auth utility functions
from app.api.schemas import LoginRequest, TokenResponse

# Import the database dependency
from app.database import get_db
from database.generated.prisma import Prisma  # Corrected import path

import logging



router = APIRouter(prefix="/auth", tags=["Authentication"])

logger = logging.getLogger(__name__)



@router.post("/login", response_model=TokenResponse)

async def login(body: LoginRequest, db: Prisma = Depends(get_db)):

    """

    Logs in a user and returns an access token.

    """

    logger.debug(f"Attempting login for username: {body.username}")

    user = await db.user.find_unique(where={"username": body.username})

    logger.debug(f"User retrieved from DB: {user}")



    # Check if user exists and if the password is correct

    if not user or not verify_password(body.password, user.password):

        logger.warning(f"Login failed for username: {body.username}. User found: {user is not None}, Password correct: {verify_password(body.password, user.password) if user else False}")

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Incorrect username or password",

            headers={"WWW-Authenticate": "Bearer"},

        )

    logger.info(f"Login successful for user: {user.username}")

    # Data to be encoded in the JWT
    token_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "department": user.department,
    }

    # Create the access token
    access_token = create_access_token(data=token_data)

    return {"access_token": access_token, "token_type": "bearer"}
