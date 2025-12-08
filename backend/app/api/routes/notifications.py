from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from app.api.auth import get_user_id_from_token
from app.websockets import manager

router = APIRouter()


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
