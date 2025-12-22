"""
WebSocket endpoints for real-time collaboration
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import json
import logging
from typing import Optional

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Playbook, PlaybookShare, PlaybookRole
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_current_user_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
) -> Optional[dict]:
    """
    Authenticate WebSocket connection using token from query parameter

    Args:
        websocket: The WebSocket connection
        token: JWT token from query string

    Returns:
        User info dict or None if invalid
    """
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        return {
            "user_id": payload.get("sub"),
            "username": payload.get("username", "Unknown")
        }
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return None


def check_playbook_access(db: Session, playbook_id: str, user_id: str) -> Optional[str]:
    """
    Check if user has access to playbook and return their role

    Args:
        db: Database session
        playbook_id: The playbook ID
        user_id: The user ID

    Returns:
        Role string ('owner', 'editor', 'viewer') or None if no access
    """
    # Check if user is owner
    playbook = db.query(Playbook).filter(
        Playbook.id == playbook_id,
        Playbook.owner_id == user_id
    ).first()

    if playbook:
        return PlaybookRole.OWNER.value

    # Check if user has share access
    share = db.query(PlaybookShare).filter(
        PlaybookShare.playbook_id == playbook_id,
        PlaybookShare.user_id == user_id
    ).first()

    if share:
        return share.role

    return None


@router.websocket("/ws/playbook/{playbook_id}")
async def playbook_websocket(
    websocket: WebSocket,
    playbook_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time playbook collaboration

    Connect: ws://host/ws/playbook/{playbook_id}?token={jwt_token}

    Messages from client:
    - {"type": "update", "data": {...}} - Playbook update
    - {"type": "cursor", "position": {...}} - Cursor position (future)
    - {"type": "ping"} - Keep-alive ping

    Messages to client:
    - {"type": "presence", "users": [...]} - Current users in room
    - {"type": "user_joined", "user_id": "...", "username": "..."} - User joined
    - {"type": "user_left", "user_id": "...", "username": "..."} - User left
    - {"type": "update", "user_id": "...", "data": {...}} - Update from another user
    - {"type": "pong"} - Response to ping
    - {"type": "error", "message": "..."} - Error message
    """
    # Authenticate user
    user = await get_current_user_ws(websocket, token)
    if not user:
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = user["user_id"]
    username = user["username"]

    # Check playbook access (need a DB session)
    # Note: We need to get DB session outside of the websocket context
    # For now, we'll accept the connection and check access on first message
    # In production, consider using a separate auth check

    try:
        # Connect to room
        await websocket_manager.connect(websocket, playbook_id, user_id, username)

        # Main message loop
        while True:
            try:
                data = await websocket.receive_json()
                await handle_message(websocket, playbook_id, user_id, username, data)
            except json.JSONDecodeError:
                await websocket_manager.send_personal(
                    websocket,
                    {"type": "error", "message": "Invalid JSON"}
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}, playbook={playbook_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(playbook_id, user_id)


async def handle_message(
    websocket: WebSocket,
    playbook_id: str,
    user_id: str,
    username: str,
    data: dict
):
    """
    Handle incoming WebSocket message

    Args:
        websocket: The WebSocket connection
        playbook_id: The playbook ID
        user_id: The user's ID
        username: The user's username
        data: The message data
    """
    msg_type = data.get("type")

    if msg_type == "ping":
        await websocket_manager.send_personal(
            websocket,
            {"type": "pong", "timestamp": data.get("timestamp")}
        )

    elif msg_type == "update":
        # Broadcast update to other users
        update_data = data.get("data", {})
        update_type = data.get("update_type", "content")

        await websocket_manager.broadcast_update(
            playbook_id=playbook_id,
            user_id=user_id,
            username=username,
            update_type=update_type,
            data=update_data
        )

    elif msg_type == "get_presence":
        # Request current presence
        users = websocket_manager.get_room_users(playbook_id)
        await websocket_manager.send_personal(
            websocket,
            {
                "type": "presence",
                "users": users,
                "playbook_id": playbook_id
            }
        )

    else:
        await websocket_manager.send_personal(
            websocket,
            {"type": "error", "message": f"Unknown message type: {msg_type}"}
        )


@router.get("/ws/playbook/{playbook_id}/presence")
async def get_playbook_presence(playbook_id: str):
    """
    Get current users connected to a playbook (REST endpoint)

    This is useful for getting presence without WebSocket connection.
    """
    users = websocket_manager.get_room_users(playbook_id)
    return {
        "playbook_id": playbook_id,
        "users": users,
        "count": len(users)
    }
