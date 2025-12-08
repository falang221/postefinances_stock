from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import CurrentUser, UserRole, get_current_user, role_required
from app.api.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.database import get_db
from database.generated.prisma import Prisma  # Corrected import path

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Creates a new category (only accessible by ADMIN).
    """
    try:
        category = await db.category.create(data={"name": category_data.name})
        return CategoryResponse.model_validate(category)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with this name may already exist: {e}",
        )


@router.get("/", response_model=List[CategoryResponse])
async def get_all_categories(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),  # Any authenticated user
):
    """
    Retrieves a list of all categories (accessible by any authenticated user).
    """
    categories = await db.category.find_many(order={"name": "asc"})
    return [CategoryResponse.model_validate(cat) for cat in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category_by_id(
    category_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),  # Any authenticated user
):
    """
    Retrieves a single category by its ID (accessible by any authenticated user).
    """
    category = await db.category.find_unique(where={"id": category_id})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return CategoryResponse.model_validate(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Updates a category's details (only accessible by ADMIN).
    """
    try:
        category = await db.category.update(
            where={"id": category_id}, data={"name": category_data.name}
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        return CategoryResponse.model_validate(category)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with this name may already exist: {e}",
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.ADMIN)),
):
    """
    Deletes a category by its ID (only accessible by ADMIN).
    """
    try:
        deleted_category = await db.category.delete(where={"id": category_id})
        if not deleted_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        return
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category not found or could not be deleted: {e}",
        )
