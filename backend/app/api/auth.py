import os
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Union

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# Configuration for JWT
_SECRET_KEY: Optional[str] = None
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180  # Token validity: 180 minutes (3 hours)

def set_jwt_settings(secret_key: str):
    global _SECRET_KEY
    _SECRET_KEY = secret_key

def get_secret_key() -> str:
    if _SECRET_KEY is None:
        raise ValueError("JWT SECRET_KEY not configured. Call set_jwt_settings first.")
    return _SECRET_KEY

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


class UserRole(str, Enum):
    CHEF_SERVICE = "CHEF_SERVICE"
    MAGASINIER = "MAGASINIER"
    DAF = "DAF"
    ADMIN = "ADMIN"
    SUPER_OBSERVATEUR = "SUPER_OBSERVATEUR"
    USER_MANAGER = "USER_MANAGER" # New role for user management


class CurrentUser(BaseModel):
    id: str
    username: str
    name: str
    role: UserRole
    email: Optional[str] = None
    department: Optional[str] = None


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")  # Updated tokenUrl


async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        user_username: str = payload.get("username")
        user_email: Optional[str] = payload.get("email")
        user_name: str = payload.get("name")
        user_role: str = payload.get("role")
        user_department: Optional[str] = payload.get("department")

        if (
            user_id is None
            or user_username is None
            or user_name is None
            or user_role is None
        ):
            raise credentials_exception

        return CurrentUser(
            id=user_id,
            username=user_username,
            email=user_email,
            name=user_name,
            role=UserRole(user_role),
            department=user_department,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception


def role_required(required_roles: Union[UserRole, List[UserRole]]):
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        # ADMIN role implicitly has all permissions
        if current_user.role == UserRole.ADMIN:
            return current_user

        if isinstance(required_roles, list):
            if current_user.role not in required_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
                )
        else:  # Single role
            if current_user.role != required_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
                )
        return current_user

    return role_checker


def super_observateur_access(current_user: CurrentUser = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_OBSERVATEUR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    return current_user


# --- WebSocket Authentication ---
def get_user_id_from_token(token: str) -> Optional[str]:
    """Decodes the JWT token and returns the user ID."""
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("id")
        return user_id
    except jwt.PyJWTError:
        return None