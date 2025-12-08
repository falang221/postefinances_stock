import json  # Import json module
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps userId to their active WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accepts a new WebSocket connection and stores it."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"New connection: User {user_id} connected.")

    def disconnect(self, user_id: str):
        """Removes a WebSocket connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"Connection closed: User {user_id} disconnected.")

    async def send_personal_message(self, message: Dict, user_id: str):
        """Sends a message to a specific user."""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(json.dumps(message))  # Send JSON string
            print(f"Sent message to {user_id}: '{message}'")

    async def broadcast(self, message: Dict):
        """Sends a message to all connected users."""
        for user_id, websocket in self.active_connections.items():
            await websocket.send_text(json.dumps(message))  # Send JSON string
        print(f"Broadcasted message to all users: '{message}'")

    async def send_to_users(self, message: Dict, user_ids: List[str]):
        """Sends a message to a specific list of users."""
        for user_id in user_ids:
            if user_id in self.active_connections:
                await self.send_personal_message(message, user_id)


# Create a single instance of the manager to be used across the application
manager = ConnectionManager()
