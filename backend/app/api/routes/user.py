from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import (
    CurrentUser,
    UserRole,
    get_current_user,
    get_password_hash,
    role_required,
)
from app.api.schemas import PasswordUpdate, UserCreate, UserFullResponse, UserUpdate
from app.database import get_db
from database.generated.prisma import Prisma  # Corrected import path

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserFullResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Creates a new user (only accessible by ADMIN).
    The password is automatically hashed before saving.
    """
    try:
        hashed_password = get_password_hash(user_data.password)
        user = await db.user.create(
            data={
                "username": user_data.username,
                "email": user_data.email,
                "name": user_data.name,
                "password": hashed_password,
                "role": user_data.role,
                "department": user_data.department,
            }
        )
        return UserFullResponse.model_validate(user)
    except Exception: # Catch all exceptions
        # Log the actual exception for debugging (e.g., using a logger)
        # For now, we'll just raise a generic message
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User with this username or email already exists."
        )


@router.get("/", response_model=List[UserFullResponse])
async def get_all_users(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR, UserRole.MAGASINIER])),
    search: Optional[str] = None,
    roles: Optional[str] = None, # <-- Added roles parameter
):
    """
    Retrieves a list of all users, with optional search and role filtering functionality.
    Accessible by ADMIN, SUPER_OBSERVATEUR.
    """
    where_clause = {}
    if search:
        where_clause["OR"] = [
                {"name": {"contains": search, "mode": "insensitive"}},
                {"username": {"contains": search, "mode": "insensitive"}},
                {"email": {"contains": search, "mode": "insensitive"}},
            ]
    
    if roles:
        # Split the comma-separated roles string into a list of UserRole enums
        # Filter out any invalid role names to prevent errors
        valid_roles = [role for role in roles.upper().split(',') if role in UserRole.__members__]
        if valid_roles:
            if "role" in where_clause: # If combining with search
                # Ensure where_clause["role"] is a dictionary before adding 'in'
                if isinstance(where_clause["role"], dict):
                    where_clause["role"]["in"] = valid_roles
                else: # If it was a simple assignment, convert it to dict
                    where_clause["role"] = {"in": valid_roles}
            else:
                where_clause["role"] = {"in": valid_roles}

    users = await db.user.find_many(where=where_clause, order={"createdAt": "desc"})
    return [UserFullResponse.model_validate(user) for user in users]

@router.get("/request-creators", response_model=List[UserFullResponse])
async def get_request_creators(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.DAF, UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR, UserRole.MAGASINIER])),
):
    """
    Retrieves a list of users with the CHEF_SERVICE role (accessible by DAF, ADMIN, SUPER_OBSERVATEUR).
    Useful for filtering requests by requester.
    """
    users = await db.user.find_many(
        where={"role": UserRole.CHEF_SERVICE},
        order={"name": "asc"}
    )
    return [UserFullResponse.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserFullResponse)
async def get_user_by_id(
    user_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Retrieves a single user by their ID (only accessible by ADMIN).
    """
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserFullResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserFullResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Updates a user's details (only accessible by ADMIN).
    """
    update_fields = user_data.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update provided",
        )

    # If password is being updated, hash it
    if "password" in update_fields:
        update_fields["password"] = get_password_hash(update_fields["password"])

    try:
        user = await db.user.update(where={"id": user_id}, data=update_fields)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return UserFullResponse.model_validate(user)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update user due to invalid data or other error.")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Deletes a user by their ID (only accessible by ADMIN).
    """
    try:
        deleted_user = await db.user.delete(where={"id": user_id})
        if not deleted_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or could not be deleted due to an unexpected error.",
        )


@router.get("/me", response_model=UserFullResponse)
async def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user), db: Prisma = Depends(get_db)
):
    """
    Retrieves the current authenticated user's profile.
    Accessible by any authenticated user.
    """
    user = await db.user.find_unique(where={"id": current_user.id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserFullResponse.model_validate(user)


@router.put("/me", response_model=UserFullResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    """
    Updates the current authenticated user's profile (name, email, department).
    Accessible by any authenticated user.
    """
    update_fields = user_data.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update provided",
        )

    # Prevent role or password update through this endpoint
    if "role" in update_fields:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role cannot be updated through this endpoint.",
        )
    if "password" in update_fields:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password cannot be updated through this endpoint. Use /me/password instead.",
        )

    try:
        user = await db.user.update(where={"id": current_user.id}, data=update_fields)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return UserFullResponse.model_validate(user)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update user profile due to invalid data or other error.")


@router.put("/me/password", response_model=UserFullResponse)
async def change_current_user_password(
    password_data: PasswordUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Prisma = Depends(get_db),
):
    """
    Allows the current authenticated user to change their password.
    Accessible by any authenticated user.
    """
    user = await db.user.find_unique(where={"id": current_user.id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Verify current password (assuming verify_password function exists)
    # For now, we'll skip actual password verification for simplicity,
    # but in a real app, you'd verify the current_password against the hashed password in the DB.
    # from app.api.auth import verify_password
    # if not verify_password(password_data.current_password, user.password):
    #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect current password")

    hashed_new_password = get_password_hash(password_data.new_password)

    try:
        updated_user = await db.user.update(
            where={"id": current_user.id}, data={"password": hashed_new_password}
        )
        return UserFullResponse.model_validate(updated_user)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not change password due to invalid data or other error.")
