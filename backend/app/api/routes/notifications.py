from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from app.api.auth import get_user_id_from_token, get_current_user, CurrentUser
from app.websockets import manager
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/counts")
async def get_counts(
    current_user: CurrentUser = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
):
    """
    Retrieves the counts of pending actions and notifications for the current user.
    The response structure depends on the user's role.
    """
    counts = await notification_service.get_notification_counts(current_user)
    return counts


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection alive, or handle incoming messages if needed
            # For now, we just expect the client to send a ping or nothing
            # If the client sends a message, we can process it here
            message = await websocket.receive_text()
            print(f"Received message from {user_id}: {message}")
            # Optionally, send a response back
            # await manager.send_personal_message(f"Echo: {message}", user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id)
