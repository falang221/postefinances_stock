from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import CurrentUser, UserRole, role_required
from app.api.schemas import (
    RequestApprove,
    RequestCreate,
    RequestResponse,
    RequestBulkItemIssuesData, # Changed to bulk
    DisputeResolutionData,
    DeliveryNoteResponse, # New import
    DeliveryNoteItem,     # New import
)
from app.database import get_db
from app.websockets import manager  # Import the WebSocket manager
from database.generated.prisma import Prisma  # Corrected import path
from database.generated.prisma.enums import ApprovalDecision, DisputeReason, RequestItemDisputeStatus, TransactionSource # New import for item-level dispute
from app.utils.number_generator import generate_next_number # New import
from app.services import request_service # NEW: Import the service layer

router = APIRouter(prefix="/requests", tags=["Requests"])

# This is a simplified response model to avoid overly complex helpers for now
# In a real app, you might generate Pydantic models directly from Prisma schema
# or use a more robust mapping library.
FULL_REQUEST_INCLUDE = {
    "items": {"include": {"product": True}},
    "requester": True,
    "approvedBy": True,
    "receivedBy": True,
    "approvals": {"include": {"user": True}},
}


# 1. CHEF_SERVICE - Créer une demande
@router.post("/", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    request_data: RequestCreate,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.CHEF_SERVICE)),
):
    async with db.tx() as transaction:
        try:
            # 1. Check for stock availability for all items
            for item_data in request_data.items:
                product = await transaction.product.find_unique(
                    where={"id": item_data.productId}
                )
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Le produit avec l'ID {item_data.productId} n'a pas été trouvé.",
                    )
                if product.quantity < item_data.requestedQty:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Stock insuffisant pour le produit '{product.name}'. Demandé: {item_data.requestedQty}, Disponible: {product.quantity}.",
                    )

            # 2. Generate a unique request number
            new_request_number = await generate_next_number(transaction, "COM")

            # 3. Create the request if all checks pass
            request = await transaction.request.create(
                data={
                    "requestNumber": new_request_number,
                    "requesterId": current_user.id,
                    "status": "TRANSMISE",
                    "requesterObservations": request_data.requesterObservations,
                    "items": {
                        "create": [
                            {
                                "productId": item.productId,
                                "requestedQty": item.requestedQty,
                            }
                            for item in request_data.items
                        ]
                    },
                },
                include=FULL_REQUEST_INCLUDE,
            )

            # 4. --- NOTIFICATION: Notify DAFs ---
            daf_users = await transaction.user.find_many(where={"role": UserRole.DAF})
            daf_ids = [u.id for u in daf_users]
            await manager.send_to_users(
                {
                    "type": "daf_approval_request",
                    "message": f"Nouvelle demande de stock (N°{request.requestNumber}) en attente de votre approbation.",
                },
                daf_ids,
            )
            # --- END NOTIFICATION ---

            return RequestResponse.model_validate(request)
        except HTTPException as http_exc:
            # Re-raise HTTPException to be handled by FastAPI
            raise http_exc
        except Exception as e:
            # Catch any other exceptions and wrap them
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Une erreur interne est survenue: {e}",
            )





# NEW ENDPOINT: MAGASINIER - Voir toutes les demandes pertinentes
@router.get("/magasinier/requests", response_model=List[RequestResponse])
async def get_magasinier_requests(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.MAGASINIER)),
    search: Optional[str] = None,  # New search parameter
):
    where_clause = {
        "OR": [
            {"status": "APPROUVEE"},
            {"status": "LITIGE_RECEPTION"},
            {"status": "LIVREE_PAR_MAGASINIER"},
            {"status": "RECEPTION_CONFIRMEE"},
        ]
    }
    if search:
        # If there's a search term, apply it to both statuses
        where_clause["AND"] = [
            {
                "OR": [
                    {"status": "APPROUVEE"},
                    {"status": "LITIGE_RECEPTION"},
                    {"status": "LIVREE_PAR_MAGASINIER"},
                    {"status": "RECEPTION_CONFIRMEE"},
                ]
            },
            {
                "OR": [
                    {"requestNumber": {"contains": search, "mode": "insensitive"}},
                    {"requester": {"name": {"contains": search, "mode": "insensitive"}}},
                    {
                        "items": {
                            "some": {
                                "product": {"name": {"contains": search, "mode": "insensitive"}}
                            }
                        }
                    },
                ]
            },
        ]

    requests = await db.request.find_many(
        where=where_clause, include=FULL_REQUEST_INCLUDE, order={"approvedAt": "desc"}
    )
    return [RequestResponse.model_validate(req) for req in requests]
    return [RequestResponse.model_validate(req) for req in requests]


# NEW ENDPOINT: ADMIN / SUPER_OBSERVATEUR - Voir toutes les demandes
@router.get("/all", response_model=List[RequestResponse])
async def get_all_requests(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.ADMIN, UserRole.SUPER_OBSERVATEUR])),
    search: Optional[str] = None,
):
    where_clause = {}
    if search:
        where_clause["OR"] = [
            {"requestNumber": {"contains": search, "mode": "insensitive"}},
            {"requester": {"name": {"contains": search, "mode": "insensitive"}}},
            {
                "items": {
                    "some": {
                        "product": {"name": {"contains": search, "mode": "insensitive"}}
                    }
                }
            },
        ]

    requests = await db.request.find_many(
        where=where_clause, include=FULL_REQUEST_INCLUDE, order={"createdAt": "desc"}
    )
    return [RequestResponse.model_validate(req) for req in requests]
    return [RequestResponse.model_validate(req) for req in requests]


# 4. DAF - Voir demandes en approbation et en litige
@router.get("/daf", response_model=List[RequestResponse])
async def get_requests_for_daf(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
    search: Optional[str] = None,  # New search parameter
):
    where_clause = {
        "OR": [
            {"status": "TRANSMISE"},
            {"status": "LITIGE_RECEPTION"},
        ]
    }
    if search:
        # If there's a search term, apply it to both statuses
        where_clause["AND"] = [
            {
                "OR": [
                    {"status": "TRANSMISE"},
                    {"status": "LITIGE_RECEPTION"},
                ]
            },
            {
                "OR": [
                    {"requestNumber": {"contains": search, "mode": "insensitive"}},
                    {"requester": {"name": {"contains": search, "mode": "insensitive"}}},
                    {
                        "items": {
                            "some": {
                                "product": {"name": {"contains": search, "mode": "insensitive"}}
                            }
                        }
                    },
                ]
            },
        ]

    requests = await db.request.find_many(
        where=where_clause, include=FULL_REQUEST_INCLUDE, order={"createdAt": "desc"}
    )
    return [RequestResponse.model_validate(req) for req in requests]


# 5. DAF - Approuver/Rejeter
@router.put("/{request_id}/approve", response_model=RequestResponse)
async def approve_request(
    request_id: str,
    approval_data: RequestApprove,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
):
    async with db.tx() as transaction:
        existing_request = await transaction.request.find_unique(
            where={"id": request_id}, include={"items": True, "requester": True}
        )
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )
        if existing_request.status != "TRANSMISE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request is not in 'TRANSMISE' status.",
            )

        if approval_data.decision.upper() != "APPROUVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision for this endpoint. Must be APPROUVE."
            )

        if not approval_data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Items must be provided for approval",
            )
        
        for item_data_from_approval in approval_data.items:
            request_item = await transaction.requestitem.find_unique(
                where={"id": item_data_from_approval.requestItemId}
            )
            if not request_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"RequestItem with ID {item_data_from_approval.requestItemId} not found.",
                )
            
            product = await transaction.product.find_unique(where={"id": request_item.productId})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {request_item.productId} not found.",
                )

            if product.quantity < item_data_from_approval.approvedQty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough stock for product '{product.name}' to approve {item_data_from_approval.approvedQty} units. Available: {product.quantity}.",
                )

            await transaction.requestitem.update(
                where={"id": item_data_from_approval.requestItemId},
                data={"approvedQty": item_data_from_approval.approvedQty},
            )

        await transaction.request.update(
            where={"id": request_id},
            data={
                "status": "APPROUVEE",
                "approvedAt": datetime.now(),
                "approvedById": current_user.id,
            },
        )

        await transaction.approval.create(
            data={
                "requestId": request_id,
                "userId": current_user.id,
                "role": "DAF",
                "decision": ApprovalDecision.APPROUVE,
                "comment": approval_data.comment,
            }
        )

        final_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )

        if existing_request.requesterId:
            await manager.send_personal_message(
                {
                    "type": "request_decision",
                    "message": f"Votre demande (N°{final_request.requestNumber}) a été approuvée",
                },
                existing_request.requesterId,
            )
        
        magasinier_users = await db.user.find_many(
            where={"role": UserRole.MAGASINIER}
        )
        magasinier_ids = [u.id for u in magasinier_users]
        await manager.send_to_users(
            {
                "type": "delivery_ready",
                "message": f"La demande (N°{final_request.requestNumber}) a été approuvée et est prête à être livrée.",
            },
            magasinier_ids,
        )

        return RequestResponse.model_validate(final_request)


# NEW ENDPOINT: DAF - Rejeter une demande
@router.put("/{request_id}/reject", response_model=RequestResponse)
async def reject_request(
    request_id: str,
    approval_data: RequestApprove, # To get the comment for rejection
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
):
    async with db.tx() as transaction:
        existing_request = await transaction.request.find_unique(
            where={"id": request_id}, include={"requester": True}
        )
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )
        if existing_request.status != "TRANSMISE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request is not in 'TRANSMISE' status.",
            )

        # Update request status to REJETEE
        await transaction.request.update(
            where={"id": request_id},
            data={"status": "REJETEE"},
        )

        # Log approval as REJETE
        await transaction.approval.create(
            data={
                "requestId": request_id,
                "userId": current_user.id,
                "role": "DAF",
                "decision": ApprovalDecision.REJETE,
                "comment": approval_data.comment,
            }
        )

        final_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )

        # --- NOTIFICATION: Notify Requester (CHEF_SERVICE) ---
        if existing_request.requesterId:
            await manager.send_personal_message(
                {
                    "type": "request_decision",
                    "message": f"Votre demande (N°{final_request.requestNumber}) a été rejetée.",
                },
                existing_request.requesterId,
            )
        # --- END NOTIFICATION ---

        return RequestResponse.model_validate(final_request)


# NEW ENDPOINT: CHEF_SERVICE - Annuler une demande
@router.put("/{request_id}/cancel", response_model=RequestResponse)
async def cancel_request(
    request_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.CHEF_SERVICE)),
):
    async with db.tx() as transaction:
        existing_request = await transaction.request.find_unique(
            where={"id": request_id}
        )
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )

        if existing_request.requesterId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to cancel this request.",
            )

        if existing_request.status not in ["BROUILLON", "SOUMISE", "TRANSMISE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request cannot be cancelled because its status is '{existing_request.status}'. Only BROUILLON, SOUMISE or TRANSMISE requests can be cancelled.",
            )

        updated_request = await transaction.request.update(
            where={"id": request_id},
            data={"status": "ANNULEE"},
            include=FULL_REQUEST_INCLUDE,
        )
        return RequestResponse.model_validate(updated_request)


# NEW ENDPOINT: CHEF_SERVICE - Signaler un problème de réception
@router.put("/{request_id}/report-issue", response_model=RequestResponse)
async def report_issue_request(
    request_id: str,
    issue_data: RequestBulkItemIssuesData, # Changed from RequestReportIssueData
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.CHEF_SERVICE)),
):
    if not issue_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Au moins un article doit être fourni pour signaler un litige.",
        )

    async with db.tx() as transaction:
        existing_request = await transaction.request.find_unique(
            where={"id": request_id}, include={"items": {"include": {"product": True}}} # include items to check item existence and product name
        )
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )

        if existing_request.requesterId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to report an issue for this request.",
            )
        
        # Check if the request is in a state where issues can be reported
        if existing_request.status not in ["LIVREE_PAR_MAGASINIER", "LITIGE_RECEPTION"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Les litiges ne peuvent être signalés que pour les demandes livrées ou déjà en litige. Statut actuel: {existing_request.status}.",
            )

        updated_item_details_messages = [] # For notification

        for item_issue in issue_data.items:
            # Validate item belongs to this request
            request_item = next((item for item in existing_request.items if item.id == item_issue.requestItemId), None)
            if not request_item:
                 raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"L'article de demande avec l'ID {item_issue.requestItemId} n'appartient pas à cette demande.",
                )

            # Basic validation for the item issue data
            if item_issue.reason == DisputeReason.AUTRE and not item_issue.comment:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Un commentaire est obligatoire pour l'article '{request_item.product.name}' lorsque la raison du litige est 'Autre'.",
                )
            
            # Update the specific RequestItem
            await transaction.requestitem.update(
                where={"id": item_issue.requestItemId},
                data={
                    "itemDisputeReason": item_issue.reason,
                    "itemDisputeComment": item_issue.comment,
                    "itemDisputeStatus": RequestItemDisputeStatus.REPORTED,
                },
            )
            updated_item_details_messages.append(
                f"- Article {request_item.product.name} (ID: {item_issue.requestItemId}): {item_issue.reason.name} ({item_issue.comment or 'Aucun commentaire'})"
            )

        # Update the parent Request status if it's not already in dispute
        if existing_request.status != "LITIGE_RECEPTION":
            await transaction.request.update(
                where={"id": request_id},
                data={"status": "LITIGE_RECEPTION"},
            )

        final_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )
        
        # --- NOTIFICATION: Notify Magasinier and DAF ---
        magasinier_users = await db.user.find_many(where={"role": UserRole.MAGASINIER})
        magasinier_ids = [u.id for u in magasinier_users]
        daf_users = await db.user.find_many(where={"role": UserRole.DAF})
        daf_ids = [u.id for u in daf_users]

        notification_message = (
            f"Un ou plusieurs litiges ont été signalés pour la demande N°{final_request.requestNumber} "
            f"par {current_user.name}.\n"
            f"Détails des litiges:\n" + "\n".join(updated_item_details_messages)
        )

        await manager.send_to_users(
            {"type": "reception_issue", "message": notification_message},
            magasinier_ids + daf_ids,
        )
        # --- END NOTIFICATION ---

        return RequestResponse.model_validate(final_request)


# NEW ENDPOINT: DAF - Résoudre un litige de réception
@router.put("/{request_id}/resolve-dispute", response_model=RequestResponse)
async def resolve_dispute_request(
    request_id: str,
    resolution_data: DisputeResolutionData,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.DAF)),
):
    async with db.tx() as transaction:
        existing_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )
        if not existing_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
            )

        if existing_request.status != "LITIGE_RECEPTION":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is not in 'LITIGE_RECEPTION' status. Current status: {existing_request.status}.",
            )

        # Determine the new item dispute status based on DAF's decision
        new_item_dispute_status_for_reported: RequestItemDisputeStatus
        if resolution_data.decision.upper() == "RESOLVE_APPROVE":
            new_item_dispute_status_for_reported = RequestItemDisputeStatus.RESOLVED_APPROVED
        elif resolution_data.decision.upper() == "RESOLVE_REJECT":
            new_item_dispute_status_for_reported = RequestItemDisputeStatus.RESOLVED_REJECTED
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resolution decision. Must be RESOLVE_APPROVE or RESOLVE_REJECT.",
            )
        
        updated_item_count = 0
        resolved_item_summaries = []

        for item in existing_request.items:
            if item.itemDisputeStatus == RequestItemDisputeStatus.REPORTED:
                await transaction.requestitem.update(
                    where={"id": item.id},
                    data={
                        "itemDisputeStatus": new_item_dispute_status_for_reported,
                        # For now, keeping itemDisputeReason/Comment for historical purposes
                    }
                )
                updated_item_count += 1
                resolved_item_summaries.append(
                    f"- Article {item.product.name} (ID: {item.id}) : {new_item_dispute_status_for_reported.name}"
                )

        if updated_item_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucun article en litige 'REPORTED' n'a été trouvé pour cette demande.",
            )

        # After resolving items, check if any items are still in REPORTED status
        remaining_disputed_items_count = await transaction.requestitem.count(
            where={"requestId": request_id, "itemDisputeStatus": RequestItemDisputeStatus.REPORTED}
        )

        status_update: str
        notification_message: str
        
        if remaining_disputed_items_count == 0:
            # If all items are resolved, update the parent request status based on overall decision
            if resolution_data.decision.upper() == "RESOLVE_APPROVE":
                status_update = "RECEPTION_CONFIRMEE"
                notification_message = f"Tous les litiges pour la demande N°{existing_request.requestNumber} ont été résolus et la réception confirmée par le DAF."
            else: # RESOLVE_REJECT
                status_update = "REJETEE" 
                notification_message = f"Tous les litiges pour la demande N°{existing_request.requestNumber} ont été résolus et la demande rejetée par le DAF."
        else:
            # Some items are still disputed, keep request in LITIGE_RECEPTION status
            status_update = "LITIGE_RECEPTION"
            notification_message = (
                f"Certains litiges pour la demande N°{existing_request.requestNumber} ont été résolus, "
                f"mais {remaining_disputed_items_count} autre(s) litige(s) reste(nt) en attente. "
                f"Statut de la demande maintenu à LITIGE_RECEPTION."
            )

        # Update parent request status
        await transaction.request.update(
            where={"id": request_id},
            data={"status": status_update},
        )

        decision_log = ApprovalDecision.LITIGE_RESOLU_APPROUVE if resolution_data.decision.upper() == "RESOLVE_APPROVE" else ApprovalDecision.LITIGE_RESOLU_REJETE
        
        # Log the resolution
        await transaction.approval.create(
            data={
                "requestId": request_id,
                "userId": current_user.id,
                "role": "DAF",
                "decision": decision_log,
                "comment": resolution_data.comment,
            }
        )

        final_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )

        # --- NOTIFICATION: Notify Requester (CHEF_SERVICE) and MAGASINIERs ---
        if existing_request.requesterId:
            await manager.send_personal_message(
                {
                    "type": "dispute_resolved",
                    "message": notification_message + "\nDétails des résolutions:\n" + "\n".join(resolved_item_summaries),
                },
                existing_request.requesterId,
            )
        
        magasinier_users = await db.user.find_many(where={"role": UserRole.MAGASINIER})
        magasinier_ids = [u.id for u in magasinier_users]
        await manager.send_to_users(
            {
                "type": "dispute_resolved",
                "message": notification_message + "\nDétails des résolutions:\n" + "\n".join(resolved_item_summaries),
            },
            magasinier_ids,
        )
        # --- END NOTIFICATION ---

        return RequestResponse.model_validate(final_request)


# 6. CHEF_SERVICE - Voir ses demandes
@router.get("/my-requests", response_model=List[RequestResponse])
async def get_my_requests(
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.CHEF_SERVICE)),
    search: Optional[str] = None,  # New search parameter
):
    where_clause = {"requesterId": current_user.id}
    if search:
        where_clause["OR"] = [
            {"requestNumber": {"contains": search, "mode": "insensitive"}},
            {
                "items": {
                    "some": {
                        "product": {"name": {"contains": search, "mode": "insensitive"}}
                    }
                }
            },
        ]

    requests = await db.request.find_many(
        where=where_clause, include=FULL_REQUEST_INCLUDE, order={"createdAt": "desc"}
    )
    return [RequestResponse.model_validate(req) for req in requests]


# --- NEW ENDPOINT: MAGASINIER - Confirmer la livraison ---
@router.put("/{request_id}/deliver", response_model=RequestResponse)
async def deliver_request(
    request_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER])),
):
    """
    Handles the HTTP request to deliver a stock request.
    Delegates all business logic to the request_service.
    """
    final_request = await request_service.deliver_request_service(
        db=db, request_id=request_id, current_user=current_user
    )
    return RequestResponse.model_validate(final_request)


# 7. CHEF_SERVICE - Valider réception (now confirms final reception)
@router.put("/{request_id}/receive", response_model=RequestResponse)
async def receive_request(
    request_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required(UserRole.CHEF_SERVICE)),
):
    async with db.tx() as transaction:
        request_to_receive = await transaction.request.find_first(
            where={
                "id": request_id,
                "requesterId": current_user.id,
                "status": "LIVREE_PAR_MAGASINIER",
            },  # Expect new status
            include={"items": True},
        )
        if not request_to_receive:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or not in 'LIVREE_PAR_MAGASINIER' status for the current user.",
            )

        # Update request status to RECEPTION_CONFIRMEE
        await transaction.request.update(
            where={"id": request_id},
            data={
                "status": "RECEPTION_CONFIRMEE",
                "receivedAt": datetime.now(),
            },  # receivedAt is now actual reception time
        )

        final_request = await transaction.request.find_unique(
            where={"id": request_id}, include=FULL_REQUEST_INCLUDE
        )
        return RequestResponse.model_validate(final_request)


# NEW ENDPOINT: MAGASINIER - Obtenir les données du bon de livraison
@router.get("/{request_id}/delivery-note-data", response_model=DeliveryNoteResponse)
async def get_delivery_note_data(
    request_id: str,
    db: Prisma = Depends(get_db),
    current_user: CurrentUser = Depends(role_required([UserRole.MAGASINIER])),
):
    request = await db.request.find_unique(
        where={"id": request_id},
        include={
            "requester": True,
            "receivedBy": True, # This is the deliverer (Magasinier)
            "items": {"include": {"product": True}},
        },
    )

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    # Ensure the request has been delivered
    if request.status not in ["LIVREE_PAR_MAGASINIER", "RECEPTION_CONFIRMEE", "LITIGE_RECEPTION"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery note can only be generated for delivered requests. Current status: {request.status}",
        )
    
    if not request.receivedBy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request has not been delivered yet.")

    delivery_items = []
    for item in request.items:
        if item.approvedQty is not None and item.approvedQty > 0:
            delivery_items.append(
                DeliveryNoteItem(
                    productId=item.productId,
                    productName=item.product.name,
                    productReference=item.product.reference,
                    deliveredQty=item.approvedQty,
                )
            )
    
    if not delivery_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No approved items to include in delivery note.")

    return DeliveryNoteResponse(
        requestId=request.id,
        requestNumber=request.requestNumber,
        requestDate=request.createdAt, # Added requestDate
        deliveryDate=request.receivedAt or datetime.now(),
        requesterName=request.requester.name,
        requesterDepartment=request.requester.department,
        delivererName=request.receivedBy.name,
        requesterObservations=request.requesterObservations, # New field
        items=delivery_items,
    )
