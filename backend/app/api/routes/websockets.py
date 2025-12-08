from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.auth import get_user_id_from_token
from app.websockets import manager

router = APIRouter()


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    The WebSocket endpoint for real-time notifications.
    It decodes the JWT token from the URL to identify the user.
    """
    user_id = get_user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # We can receive messages here if needed in the future
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
