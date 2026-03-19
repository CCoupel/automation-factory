"""
WebSocket Connection Manager for real-time collaboration

Manages WebSocket connections per project and broadcasts updates
to all connected users.
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)


@dataclass
class ConnectedUser:
    """Represents a connected user"""
    user_id: str
    username: str
    websocket: WebSocket
    connected_at: datetime = field(default_factory=datetime.utcnow)
    current_artifact_id: Optional[str] = None


@dataclass
class ProjectRoom:
    """Represents a room for a project with connected users"""
    project_id: str
    connections: Dict[str, ConnectedUser] = field(default_factory=dict)
    # Event-sourcing: tracks per-artifact event counts since last snapshot
    events_since_snapshot: Dict[str, int] = field(default_factory=dict)
    # Inactivity timers per artifact_id
    _inactivity_timers: Dict[str, "asyncio.TimerHandle"] = field(default_factory=dict)

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
                "connected_at": conn.connected_at.isoformat(),
                "current_artifact_id": conn.current_artifact_id
            }
            for conn in self.connections.values()
        ]

    def is_empty(self) -> bool:
        """Check if room is empty"""
        return len(self.connections) == 0

    def users_on_artifact(self, artifact_id: str) -> int:
        """Count how many users have *artifact_id* as their current artifact."""
        return sum(
            1 for c in self.connections.values()
            if c.current_artifact_id == artifact_id
        )


class WebSocketManager:
    """
    Manages WebSocket connections for real-time collaboration

    Features:
    - Room-based connections (one room per project)
    - Broadcast updates to all users in a room
    - Presence tracking (who is connected)
    - Message routing
    """

    # Snapshot triggers
    INACTIVITY_SECONDS = 60
    EVENT_THRESHOLD = 500

    def __init__(self):
        # project_id -> ProjectRoom
        self.rooms: Dict[str, ProjectRoom] = {}
        # user_id -> set of project_ids (user can be in multiple rooms)
        self.user_rooms: Dict[str, Set[str]] = {}
        # Optional callback: async fn(project_id, artifact_id) called when a
        # snapshot should be taken.  Set by the WS endpoint module at startup.
        self._snapshot_callback: Optional[
            Callable[[str, str], Awaitable[None]]
        ] = None

    def register_snapshot_callback(
        self, callback: Callable[[str, str], Awaitable[None]]
    ):
        """Register async callback(project_id, artifact_id) for snapshot triggers."""
        self._snapshot_callback = callback

    async def connect(
        self,
        websocket: WebSocket,
        project_id: str,
        user_id: str,
        username: str
    ):
        """
        Connect a user to a project room

        Args:
            websocket: The WebSocket connection
            project_id: The project to join
            user_id: The user's ID
            username: The user's username (for display)
        """
        await websocket.accept()

        # Create room if doesn't exist
        if project_id not in self.rooms:
            self.rooms[project_id] = ProjectRoom(project_id=project_id)

        # Add user to room
        room = self.rooms[project_id]
        room.add_user(user_id, username, websocket)

        # Track user's rooms
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(project_id)

        logger.info(f"User {username} ({user_id}) connected to project {project_id}")

        # Notify others that user joined
        await self.broadcast_to_room(
            project_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "username": username,
                "current_artifact_id": None,
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
                "project_id": project_id
            }
        )

    async def disconnect(self, project_id: str, user_id: str):
        """
        Disconnect a user from a project room

        Args:
            project_id: The project to leave
            user_id: The user's ID
        """
        if project_id not in self.rooms:
            return

        room = self.rooms[project_id]

        # Get user info before removing
        username = None
        current_artifact_id = None
        if user_id in room.connections:
            username = room.connections[user_id].username
            current_artifact_id = room.connections[user_id].current_artifact_id

        # Remove user from room
        room.remove_user(user_id)

        # Snapshot trigger: last user on this artifact disconnected
        if (
            current_artifact_id
            and room.users_on_artifact(current_artifact_id) == 0
            and room.events_since_snapshot.get(current_artifact_id, 0) > 0
        ):
            logger.info(
                "Last-user snapshot trigger for project=%s artifact=%s",
                project_id, current_artifact_id,
            )
            room.events_since_snapshot[current_artifact_id] = 0
            # Cancel inactivity timer if any
            timer = room._inactivity_timers.pop(current_artifact_id, None)
            if timer is not None:
                timer.cancel()
            if self._snapshot_callback:
                asyncio.ensure_future(
                    self._snapshot_callback(project_id, current_artifact_id)
                )

        # Update user's rooms tracking
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(project_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]

        logger.info(f"User {username} ({user_id}) disconnected from project {project_id}")

        # Clean up empty room
        if room.is_empty():
            del self.rooms[project_id]
            logger.info(f"Room {project_id} is now empty and removed")
        else:
            # Notify others that user left
            await self.broadcast_to_room(
                project_id,
                {
                    "type": "user_left",
                    "user_id": user_id,
                    "username": username,
                    "current_artifact_id": current_artifact_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

    async def broadcast_to_room(
        self,
        project_id: str,
        message: dict,
        exclude_user: Optional[str] = None
    ):
        """
        Broadcast a message to all users in a room

        Args:
            project_id: The project room
            message: The message to send
            exclude_user: Optional user_id to exclude from broadcast
        """
        if project_id not in self.rooms:
            return

        room = self.rooms[project_id]
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
            await self.disconnect(project_id, user_id)

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
        project_id: str,
        user_id: str,
        username: str,
        update_type: str,
        data: dict,
        artifact_id: Optional[str] = None
    ):
        """
        Broadcast a project update to all users in the room

        Args:
            project_id: The project that was updated
            user_id: The user who made the update
            username: The username for display
            update_type: Type of update (e.g., "content", "name", "task")
            data: The update data
            artifact_id: Optional artifact ID for artifact-level updates
        """
        message = {
            "type": "update",
            "update_type": update_type,
            "user_id": user_id,
            "username": username,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        if artifact_id is not None:
            message["artifact_id"] = artifact_id

        await self.broadcast_to_room(
            project_id,
            message,
            exclude_user=user_id
        )

    # ------------------------------------------------------------------
    # Event-sourcing snapshot triggers
    # ------------------------------------------------------------------

    def record_event(self, project_id: str, artifact_id: str):
        """
        Track an incoming event for threshold-based snapshot and reset
        the inactivity timer.
        """
        room = self.rooms.get(project_id)
        if not room:
            return

        # Increment counter
        room.events_since_snapshot[artifact_id] = (
            room.events_since_snapshot.get(artifact_id, 0) + 1
        )

        # Reset inactivity timer
        self._reset_inactivity_timer(project_id, artifact_id)

        # Threshold check
        if room.events_since_snapshot[artifact_id] >= self.EVENT_THRESHOLD:
            room.events_since_snapshot[artifact_id] = 0
            self._fire_snapshot(project_id, artifact_id)

    def reset_event_counter(self, project_id: str, artifact_id: str):
        """Reset the event counter after a snapshot is taken."""
        room = self.rooms.get(project_id)
        if room:
            room.events_since_snapshot[artifact_id] = 0

    def _reset_inactivity_timer(self, project_id: str, artifact_id: str):
        """Cancel existing inactivity timer and start a new one."""
        room = self.rooms.get(project_id)
        if not room:
            return

        key = artifact_id
        # Cancel previous timer
        old = room._inactivity_timers.get(key)
        if old is not None:
            old.cancel()

        loop = asyncio.get_event_loop()
        handle = loop.call_later(
            self.INACTIVITY_SECONDS,
            lambda: asyncio.ensure_future(
                self._on_inactivity(project_id, artifact_id)
            ),
        )
        room._inactivity_timers[key] = handle

    async def _on_inactivity(self, project_id: str, artifact_id: str):
        """Fired after INACTIVITY_SECONDS without events."""
        logger.info(
            "Inactivity snapshot trigger for project=%s artifact=%s",
            project_id, artifact_id,
        )
        self.reset_event_counter(project_id, artifact_id)
        if self._snapshot_callback:
            await self._snapshot_callback(project_id, artifact_id)

    def _fire_snapshot(self, project_id: str, artifact_id: str):
        """Schedule a snapshot callback (threshold trigger)."""
        logger.info(
            "Threshold snapshot trigger for project=%s artifact=%s",
            project_id, artifact_id,
        )
        if self._snapshot_callback:
            asyncio.ensure_future(
                self._snapshot_callback(project_id, artifact_id)
            )

    def set_user_artifact(self, project_id: str, user_id: str, artifact_id: Optional[str]):
        """
        Set the current artifact a user is working on.

        Args:
            project_id: The project room
            user_id: The user's ID
            artifact_id: The artifact ID (or None to clear)
        """
        if project_id in self.rooms:
            room = self.rooms[project_id]
            if user_id in room.connections:
                room.connections[user_id].current_artifact_id = artifact_id

    def get_room_users(self, project_id: str) -> List[Dict]:
        """
        Get list of users connected to a project

        Args:
            project_id: The project ID

        Returns:
            List of connected users
        """
        if project_id not in self.rooms:
            return []
        return self.rooms[project_id].get_users()

    def get_user_count(self, project_id: str) -> int:
        """
        Get number of users connected to a project

        Args:
            project_id: The project ID

        Returns:
            Number of connected users
        """
        if project_id not in self.rooms:
            return 0
        return len(self.rooms[project_id].connections)

    def is_user_connected(self, project_id: str, user_id: str) -> bool:
        """
        Check if a user is connected to a project

        Args:
            project_id: The project ID
            user_id: The user ID

        Returns:
            True if user is connected
        """
        if project_id not in self.rooms:
            return False
        return user_id in self.rooms[project_id].connections


# Global instance
websocket_manager = WebSocketManager()
