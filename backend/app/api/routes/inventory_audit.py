from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import CurrentUser, UserRole, get_current_user, role_required
from app.api.schemas import (
    InventoryAuditBulkUpdate,
    InventoryAuditResponse,
    InventoryAuditSummaryResponse,
    PaginatedInventoryAuditResponse,
)
from app.crud import inventory_audit as crud
from app.database import get_db
from database.generated.prisma import Prisma

router = APIRouter(prefix="/inventory-audits", tags=["Inventory Audits"])


@router.post(
    "/",
    response_model=InventoryAuditResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_new_audit(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER, UserRole.ADMIN])),
):
    """
    Crée un nouvel audit d'inventaire.
    Accessible uniquement par les MAGASINIERS et ADMINS.
    """
    try:
        new_audit = await crud.create_inventory_audit(db, current_user)
        return InventoryAuditResponse.model_validate(new_audit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/", response_model=PaginatedInventoryAuditResponse)
async def get_audits_list(
    page: int = 1,
    page_size: int = 10,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN])
    ),
):
    """
    Récupère une liste paginée des audits d'inventaire.
    """
    total_items, audits = await crud.get_all_audits(db, page, page_size)
    return PaginatedInventoryAuditResponse(
        items=[InventoryAuditSummaryResponse.model_validate(a) for a in audits],
        totalItems=total_items,
        page=page,
        pageSize=page_size,
    )


@router.get("/{audit_id}", response_model=InventoryAuditResponse)
async def get_audit_details(
    audit_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(
        role_required([UserRole.MAGASINIER, UserRole.DAF, UserRole.ADMIN])
    ),
):
    """
    Récupère les détails complets d'un audit d'inventaire.
    """
    audit = await crud.get_audit_by_id(db, audit_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found"
        )
    return InventoryAuditResponse.model_validate(audit)


@router.put("/{audit_id}/items", status_code=status.HTTP_204_NO_CONTENT)
async def update_audit_items_bulk(
    audit_id: str,
    update_data: InventoryAuditBulkUpdate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER, UserRole.ADMIN])),
):
    """
    Met à jour en masse les quantités comptées pour les articles d'un audit.
    """
    try:
        await crud.update_audit_items(db, audit_id, update_data)
        return
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{audit_id}/complete", response_model=InventoryAuditResponse)
async def mark_audit_as_completed(
    audit_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER, UserRole.ADMIN])),
):
    """
    Marque un audit comme 'COMPLETED'.
    """
    try:
        completed_audit = await crud.complete_audit(db, audit_id)
        return InventoryAuditResponse.model_validate(completed_audit)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{audit_id}/request-reconciliation", response_model=InventoryAuditResponse)
async def request_audit_reconciliation(
    audit_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER, UserRole.ADMIN])),
):
    """
    Lance le processus de réconciliation pour un audit complété.
    """
    try:
        reconciled_audit = await crud.request_reconciliation(db, audit_id, current_user)
        return InventoryAuditResponse.model_validate(reconciled_audit)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
