"""
WebSocket Connection Manager for real-time collaboration

Manages WebSocket connections per playbook and broadcasts updates
to all connected users.
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class ConnectedUser:
    """Represents a connected user"""
    user_id: str
    username: str
    websocket: WebSocket
    connected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PlaybookRoom:
    """Represents a room for a playbook with connected users"""
    playbook_id: str
    connections: Dict[str, ConnectedUser] = field(default_factory=dict)

    def add_user(self, user_id: str, username: str, websocket: WebSocket):
        """Add a user to the room"""
        self.connections[user_id] = ConnectedUser(
            user_id=user_id,
            username=username,
            websocket=websocket
        )

    def remove_user(self, user_id: str):
        """Remove a user from the room"""
        if user_id in self.connections:
            del self.connections[user_id]

    def get_users(self) -> List[Dict]:
        """Get list of connected users"""
        return [
            {
                "user_id": conn.user_id,
                "username": conn.username,
                "connected_at": conn.connected_at.isoformat()
            }
            for conn in self.connections.values()
        ]

    def is_empty(self) -> bool:
        """Check if room is empty"""
        return len(self.connections) == 0


class WebSocketManager:
    """
    Manages WebSocket connections for real-time collaboration

    Features:
    - Room-based connections (one room per playbook)
    - Broadcast updates to all users in a room
    - Presence tracking (who is connected)
    - Message routing
    """

    def __init__(self):
        # playbook_id -> PlaybookRoom
        self.rooms: Dict[str, PlaybookRoom] = {}
        # user_id -> set of playbook_ids (user can be in multiple rooms)
        self.user_rooms: Dict[str, Set[str]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        playbook_id: str,
        user_id: str,
        username: str
    ):
        """
        Connect a user to a playbook room

        Args:
            websocket: The WebSocket connection
            playbook_id: The playbook to join
            user_id: The user's ID
            username: The user's username (for display)
        """
        await websocket.accept()

        # Create room if doesn't exist
        if playbook_id not in self.rooms:
            self.rooms[playbook_id] = PlaybookRoom(playbook_id=playbook_id)

        # Add user to room
        room = self.rooms[playbook_id]
        room.add_user(user_id, username, websocket)

        # Track user's rooms
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(playbook_id)

        logger.info(f"User {username} ({user_id}) connected to playbook {playbook_id}")

        # Notify others that user joined
        await self.broadcast_to_room(
            playbook_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "username": username,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )

        # Send current presence to the new user
        await self.send_personal(
            websocket,
            {
                "type": "presence",
                "users": room.get_users(),
                "playbook_id": playbook_id
            }
        )

    async def disconnect(self, playbook_id: str, user_id: str):
        """
        Disconnect a user from a playbook room

        Args:
            playbook_id: The playbook to leave
            user_id: The user's ID
        """
        if playbook_id not in self.rooms:
            return

        room = self.rooms[playbook_id]

        # Get username before removing
        username = None
        if user_id in room.connections:
            username = room.connections[user_id].username

        # Remove user from room
        room.remove_user(user_id)

        # Update user's rooms tracking
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(playbook_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]

        logger.info(f"User {username} ({user_id}) disconnected from playbook {playbook_id}")

        # Clean up empty room
        if room.is_empty():
            del self.rooms[playbook_id]
            logger.info(f"Room {playbook_id} is now empty and removed")
        else:
            # Notify others that user left
            await self.broadcast_to_room(
                playbook_id,
                {
                    "type": "user_left",
                    "user_id": user_id,
                    "username": username,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

    async def broadcast_to_room(
        self,
        playbook_id: str,
        message: dict,
        exclude_user: Optional[str] = None
    ):
        """
        Broadcast a message to all users in a room

        Args:
            playbook_id: The playbook room
            message: The message to send
            exclude_user: Optional user_id to exclude from broadcast
        """
        if playbook_id not in self.rooms:
            return

        room = self.rooms[playbook_id]
        disconnected = []

        for user_id, conn in room.connections.items():
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await conn.websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                disconnected.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected:
            await self.disconnect(playbook_id, user_id)

    async def send_personal(self, websocket: WebSocket, message: dict):
        """
        Send a message to a specific websocket

        Args:
            websocket: The target websocket
            message: The message to send
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")

    async def broadcast_update(
        self,
        playbook_id: str,
        user_id: str,
        username: str,
        update_type: str,
        data: dict
    ):
        """
        Broadcast a playbook update to all users in the room

        Args:
            playbook_id: The playbook that was updated
            user_id: The user who made the update
            username: The username for display
            update_type: Type of update (e.g., "content", "name", "task")
            data: The update data
        """
        await self.broadcast_to_room(
            playbook_id,
            {
                "type": "update",
                "update_type": update_type,
                "user_id": user_id,
                "username": username,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )

    def get_room_users(self, playbook_id: str) -> List[Dict]:
        """
        Get list of users connected to a playbook

        Args:
            playbook_id: The playbook ID

        Returns:
            List of connected users
        """
        if playbook_id not in self.rooms:
            return []
        return self.rooms[playbook_id].get_users()

    def get_user_count(self, playbook_id: str) -> int:
        """
        Get number of users connected to a playbook

        Args:
            playbook_id: The playbook ID

        Returns:
            Number of connected users
        """
        if playbook_id not in self.rooms:
            return 0
        return len(self.rooms[playbook_id].connections)

    def is_user_connected(self, playbook_id: str, user_id: str) -> bool:
        """
        Check if a user is connected to a playbook

        Args:
            playbook_id: The playbook ID
            user_id: The user ID

        Returns:
            True if user is connected
        """
        if playbook_id not in self.rooms:
            return False
        return user_id in self.rooms[playbook_id].connections


# Global instance
websocket_manager = WebSocketManager()
