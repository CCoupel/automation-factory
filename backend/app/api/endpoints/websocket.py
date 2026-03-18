"""
WebSocket endpoints for real-time collaboration
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging
from typing import Optional

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_access_token
from app.core.dependencies import get_current_user
from app.models import Playbook, PlaybookShare, PlaybookRole
from app.models.user import User
from app.models.project_collaboration import ProjectRole
from app.services.websocket_manager import websocket_manager
from app.services.playbook_access_service import check_playbook_access_standalone
from app.services.project_access_service import check_project_access_standalone
from app.services import playbook_event_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Event-sourcing: snapshot callback
# ---------------------------------------------------------------------------

async def _take_snapshot(project_id: str, artifact_id: str):
    """
    Create a snapshot for a playbook (artifact_id) by folding pending events
    into the stored content.  Called by WebSocketManager on inactivity,
    threshold, or last-user-disconnect triggers.
    """
    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select as sa_select
            from app.models.playbook import Playbook as PB

            result = await db.execute(sa_select(PB).where(PB.id == artifact_id))
            playbook = result.scalar_one_or_none()
            if not playbook:
                logger.warning("Snapshot skipped — playbook %s not found", artifact_id)
                return

            events = await playbook_event_service.get_events_since(
                artifact_id, playbook.snapshot_sequence, db
            )
            if not events:
                return

            # Advance snapshot_sequence to the latest persisted event so that
            # future loads only replay the delta since this point.
            # We keep playbook.content (the last full snapshot) unchanged because
            # individual events carry only delta data, not the full playbook state.
            latest = events[-1]
            await playbook_event_service.create_snapshot(
                artifact_id, playbook.content, latest.sequence_number, db
            )
            await db.commit()
            websocket_manager.reset_event_counter(project_id, artifact_id)
            logger.info(
                "Snapshot created for playbook %s at seq %d (%d events folded)",
                artifact_id, latest.sequence_number, len(events),
            )
    except Exception as e:
        logger.error("Snapshot failed for playbook %s: %s", artifact_id, e)


websocket_manager.register_snapshot_callback(_take_snapshot)


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


# ---------------------------------------------------------------------------
# Project-centric WebSocket endpoint (new)
# ---------------------------------------------------------------------------

@router.websocket("/ws/project/{project_id}")
async def project_websocket(
    websocket: WebSocket,
    project_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time project collaboration

    Connect: ws://host/ws/project/{project_id}?token={jwt_token}

    Messages from client:
    - {"type": "update", "data": {...}, "artifact_id": "..."} - Project update
    - {"type": "cursor", "position": {...}} - Cursor position (future)
    - {"type": "ping"} - Keep-alive ping

    Messages to client:
    - {"type": "presence", "users": [...]} - Current users in room
    - {"type": "user_joined", "user_id": "...", "username": "..."} - User joined
    - {"type": "user_left", "user_id": "...", "username": "..."} - User left
    - {"type": "update", "user_id": "...", "data": {...}, "artifact_id": "..."} - Update from another user
    - {"type": "pong"} - Response to ping
    - {"type": "error", "message": "..."} - Error message
    """
    logger.info(f"[WS] Connection attempt - project={project_id}, token={'exists' if token else 'MISSING'}")

    # Authenticate user
    user = await get_current_user_ws(websocket, token)
    if not user:
        logger.warning(f"[WS] Auth failed for project={project_id}")
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = user["user_id"]
    username = user["username"]
    logger.info(f"[WS] User authenticated: {username} ({user_id})")

    try:
        # Check project access before connecting
        user_role = await check_project_access_standalone(project_id, user_id)
        logger.info(f"[WS] Access check - project={project_id}, user={user_id}, role={user_role}")
        if not user_role:
            logger.warning(f"[WS] Access denied for user={user_id} to project={project_id}")
            await websocket.close(code=4003, reason="Access denied to this project")
            return

        # Connect to room
        await websocket_manager.connect(websocket, project_id, user_id, username)

        # Send initial role info to client
        await websocket_manager.send_personal(
            websocket,
            {"type": "connected", "role": user_role, "project_id": project_id}
        )

        # Main message loop
        while True:
            try:
                data = await websocket.receive_json()
                await handle_project_message(websocket, project_id, user_id, username, user_role, data)
            except json.JSONDecodeError:
                await websocket_manager.send_personal(
                    websocket,
                    {"type": "error", "message": "Invalid JSON"}
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}, project={project_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(project_id, user_id)


async def handle_project_message(
    websocket: WebSocket,
    project_id: str,
    user_id: str,
    username: str,
    user_role: str,
    data: dict
):
    """
    Handle incoming WebSocket message for project rooms

    Args:
        websocket: The WebSocket connection
        project_id: The project ID
        user_id: The user's ID
        username: The user's username
        user_role: The user's role (owner, editor, viewer)
        data: The message data
    """
    msg_type = data.get("type")

    if msg_type == "ping":
        await websocket_manager.send_personal(
            websocket,
            {"type": "pong", "timestamp": data.get("timestamp")}
        )

    elif msg_type == "update":
        # Only owners and editors can send updates
        if user_role == ProjectRole.VIEWER.value:
            await websocket_manager.send_personal(
                websocket,
                {"type": "error", "message": "Viewers cannot send updates"}
            )
            return

        update_data = data.get("data", {})
        update_type = data.get("update_type", "content")
        # artifact_id is inside the data payload, not at the top level of the WS message
        artifact_id = update_data.get("artifact_id") if isinstance(update_data, dict) else None
        event_type = data.get("event_type", update_type)

        # Update types that are not playbook-content events and should not be persisted
        NON_PERSISTABLE = {"artifact_add", "artifact_update", "artifact_delete", "request_full_sync"}

        # --- Event sourcing: persist event BEFORE broadcasting ---
        sequence_number = None
        if artifact_id and update_type not in NON_PERSISTABLE:
            try:
                async with AsyncSessionLocal() as db:
                    event = await playbook_event_service.save_event(
                        playbook_id=artifact_id,
                        user_id=user_id,
                        event_type=event_type,
                        data=update_data,
                        db=db,
                    )
                    await db.commit()
                    sequence_number = event.sequence_number
                # Track for snapshot triggers
                websocket_manager.record_event(project_id, artifact_id)
            except Exception as e:
                logger.error("Failed to persist event: %s", e)
                # Don't return — still broadcast to collaborators

        # ACK to sender
        ack = {"type": "event_ack"}
        if sequence_number is not None:
            ack["sequence_number"] = sequence_number
        await websocket_manager.send_personal(websocket, ack)

        # Broadcast update to other users
        await websocket_manager.broadcast_update(
            project_id=project_id,
            user_id=user_id,
            username=username,
            update_type=update_type,
            data=update_data,
            artifact_id=artifact_id
        )

    elif msg_type == "set_artifact":
        # Any role can set their current artifact
        artifact_id = data.get("artifact_id") or None
        websocket_manager.set_user_artifact(project_id, user_id, artifact_id)

        # Broadcast updated presence to all room members
        users = websocket_manager.get_room_users(project_id)
        await websocket_manager.broadcast_to_room(
            project_id,
            {
                "type": "presence",
                "users": users,
                "project_id": project_id
            }
        )

    elif msg_type == "get_presence":
        # Request current presence
        users = websocket_manager.get_room_users(project_id)
        await websocket_manager.send_personal(
            websocket,
            {
                "type": "presence",
                "users": users,
                "project_id": project_id
            }
        )

    else:
        await websocket_manager.send_personal(
            websocket,
            {"type": "error", "message": f"Unknown message type: {msg_type}"}
        )


@router.get("/ws/project/{project_id}/presence")
async def get_project_presence(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get current users connected to a project (REST endpoint)

    This is useful for getting presence without WebSocket connection.
    Requires authentication.
    """
    users = websocket_manager.get_room_users(project_id)
    return {
        "project_id": project_id,
        "users": users,
        "count": len(users)
    }


# ---------------------------------------------------------------------------
# Legacy playbook-centric WebSocket endpoint (deprecated — remove after
# frontend migration is complete)
# ---------------------------------------------------------------------------

@router.websocket("/ws/playbook/{playbook_id}")
async def playbook_websocket(
    websocket: WebSocket,
    playbook_id: str,
    token: Optional[str] = Query(None)
):
    """
    [DEPRECATED] WebSocket endpoint for real-time playbook collaboration.
    Use /ws/project/{project_id} instead.

    Kept temporarily for legacy MainLayout route compatibility.
    """
    logger.info(f"[WS] Connection attempt (legacy) - playbook={playbook_id}, token={'exists' if token else 'MISSING'}")

    # Authenticate user
    user = await get_current_user_ws(websocket, token)
    if not user:
        logger.warning(f"[WS] Auth failed for playbook={playbook_id}")
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = user["user_id"]
    username = user["username"]
    logger.info(f"[WS] User authenticated: {username} ({user_id})")

    try:
        # Check playbook access before connecting
        user_role = await check_playbook_access_standalone(playbook_id, user_id)
        logger.info(f"[WS] Access check - playbook={playbook_id}, user={user_id}, role={user_role}")
        if not user_role:
            logger.warning(f"[WS] Access denied for user={user_id} to playbook={playbook_id}")
            await websocket.close(code=4003, reason="Access denied to this playbook")
            return

        # Connect to room
        await websocket_manager.connect(websocket, playbook_id, user_id, username)

        # Send initial role info to client
        await websocket_manager.send_personal(
            websocket,
            {"type": "connected", "role": user_role, "playbook_id": playbook_id}
        )

        # Main message loop
        while True:
            try:
                data = await websocket.receive_json()
                await handle_message(websocket, playbook_id, user_id, username, user_role, data)
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
    user_role: str,
    data: dict
):
    """
    Handle incoming WebSocket message (legacy playbook handler)
    """
    msg_type = data.get("type")

    if msg_type == "ping":
        await websocket_manager.send_personal(
            websocket,
            {"type": "pong", "timestamp": data.get("timestamp")}
        )

    elif msg_type == "update":
        # Only owners and editors can send updates
        if user_role == PlaybookRole.VIEWER.value:
            await websocket_manager.send_personal(
                websocket,
                {"type": "error", "message": "Viewers cannot send updates"}
            )
            return

        # Broadcast update to other users
        update_data = data.get("data", {})
        update_type = data.get("update_type", "content")

        await websocket_manager.broadcast_update(
            project_id=playbook_id,
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
    [DEPRECATED] Get current users connected to a playbook (REST endpoint).
    Use /ws/project/{project_id}/presence instead.
    """
    users = websocket_manager.get_room_users(playbook_id)
    return {
        "playbook_id": playbook_id,
        "users": users,
        "count": len(users)
    }
