"""
Tests for project-centric WebSocket endpoints and check_project_access_standalone.
"""

import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.project import Project
from app.models.project_collaboration import ProjectShare, ProjectRole
from app.models.user import User
from app.services.project_access_service import check_project_access_standalone
from app.services.websocket_manager import websocket_manager, ProjectRoom


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def other_user(test_session):
    """Create a second user for access-denied tests."""
    from app.core.security import get_password_hash
    user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def shared_project(test_session, test_project, other_user):
    """Share test_project with other_user as editor."""
    share = ProjectShare(
        project_id=test_project.id,
        user_id=other_user.id,
        role=ProjectRole.EDITOR.value,
        created_by=test_project.owner_id,
    )
    test_session.add(share)
    await test_session.commit()
    return share


@pytest_asyncio.fixture
async def viewer_share(test_session, test_project, other_user):
    """Share test_project with other_user as viewer."""
    share = ProjectShare(
        project_id=test_project.id,
        user_id=other_user.id,
        role=ProjectRole.VIEWER.value,
        created_by=test_project.owner_id,
    )
    test_session.add(share)
    await test_session.commit()
    return share


def _make_token(user: User) -> str:
    return create_access_token(data={"sub": user.id, "username": user.username})


# ---------------------------------------------------------------------------
# Tests: check_project_access_standalone
# ---------------------------------------------------------------------------

class TestCheckProjectAccessStandalone:
    """Tests for the standalone project access checker."""

    @pytest.mark.asyncio
    async def test_owner_has_access(self, test_engine, test_project, test_user):
        """Owner gets 'owner' role."""
        from app.core.database import AsyncSessionLocal as RealSessionLocal
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with patch("app.services.project_access_service.AsyncSessionLocal", factory):
            role = await check_project_access_standalone(test_project.id, test_user.id)
        assert role == "owner"

    @pytest.mark.asyncio
    async def test_shared_editor_has_access(self, test_engine, test_project, other_user, shared_project):
        """Shared editor gets 'editor' role."""
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with patch("app.services.project_access_service.AsyncSessionLocal", factory):
            role = await check_project_access_standalone(test_project.id, other_user.id)
        assert role == "editor"

    @pytest.mark.asyncio
    async def test_no_access_returns_none(self, test_engine, test_project, other_user):
        """User without access gets None."""
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with patch("app.services.project_access_service.AsyncSessionLocal", factory):
            role = await check_project_access_standalone(test_project.id, other_user.id)
        assert role is None

    @pytest.mark.asyncio
    async def test_nonexistent_project_returns_none(self, test_engine, test_user):
        """Non-existent project returns None."""
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with patch("app.services.project_access_service.AsyncSessionLocal", factory):
            role = await check_project_access_standalone("nonexistent-id", test_user.id)
        assert role is None


# ---------------------------------------------------------------------------
# Tests: WebSocket connection
# ---------------------------------------------------------------------------

class TestProjectWebSocket:
    """Tests for /ws/project/{project_id} endpoint."""

    @pytest.mark.asyncio
    async def test_connect_without_token(self, test_app, test_project):
        """Connection without token is rejected with 4001."""
        from starlette.testclient import TestClient

        with TestClient(test_app) as client:
            with pytest.raises(Exception):
                with client.websocket_connect(f"/ws/project/{test_project.id}"):
                    pass

    @pytest.mark.asyncio
    async def test_connect_with_invalid_token(self, test_app, test_project):
        """Connection with invalid token is rejected."""
        from starlette.testclient import TestClient

        with TestClient(test_app) as client:
            with pytest.raises(Exception):
                with client.websocket_connect(f"/ws/project/{test_project.id}?token=invalid"):
                    pass

    @pytest.mark.asyncio
    async def test_connect_access_denied(self, test_app, test_engine, test_project, other_user):
        """User without project access is denied."""
        from starlette.testclient import TestClient
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
        token = _make_token(other_user)

        with TestClient(test_app) as client:
            with patch("app.api.endpoints.websocket.check_project_access_standalone", return_value=None):
                with pytest.raises(Exception):
                    with client.websocket_connect(f"/ws/project/{test_project.id}?token={token}"):
                        pass

    @pytest.mark.asyncio
    async def test_connect_success_owner(self, test_app, test_engine, test_project, test_user):
        """Owner can connect and receives connected + presence messages."""
        from starlette.testclient import TestClient

        token = _make_token(test_user)

        with TestClient(test_app) as client:
            with patch("app.api.endpoints.websocket.check_project_access_standalone", return_value="owner"):
                with client.websocket_connect(f"/ws/project/{test_project.id}?token={token}") as ws:
                    # First message: presence
                    msg1 = ws.receive_json()
                    assert msg1["type"] == "presence"
                    assert msg1["project_id"] == test_project.id

                    # Second message: connected with role
                    msg2 = ws.receive_json()
                    assert msg2["type"] == "connected"
                    assert msg2["role"] == "owner"
                    assert msg2["project_id"] == test_project.id


# ---------------------------------------------------------------------------
# Tests: broadcast_update with artifact_id
# ---------------------------------------------------------------------------

class TestBroadcastUpdateArtifactId:
    """Tests for artifact_id in broadcast_update."""

    @pytest.mark.asyncio
    async def test_broadcast_update_with_artifact_id(self):
        """broadcast_update includes artifact_id when provided."""
        mgr = websocket_manager.__class__()

        # Mock a room with a fake connection
        mock_ws = AsyncMock()
        mock_ws.send_json = AsyncMock()
        mock_ws.accept = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-2", "viewer", mock_ws)
        mgr.rooms["proj-1"] = room

        await mgr.broadcast_update(
            project_id="proj-1",
            user_id="user-1",
            username="editor",
            update_type="content",
            data={"key": "value"},
            artifact_id="artifact-42"
        )

        mock_ws.send_json.assert_called_once()
        sent = mock_ws.send_json.call_args[0][0]
        assert sent["type"] == "update"
        assert sent["artifact_id"] == "artifact-42"
        assert sent["data"] == {"key": "value"}

    @pytest.mark.asyncio
    async def test_broadcast_update_without_artifact_id(self):
        """broadcast_update omits artifact_id when not provided."""
        mgr = websocket_manager.__class__()

        mock_ws = AsyncMock()
        mock_ws.send_json = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-2", "viewer", mock_ws)
        mgr.rooms["proj-1"] = room

        await mgr.broadcast_update(
            project_id="proj-1",
            user_id="user-1",
            username="editor",
            update_type="content",
            data={"key": "value"}
        )

        sent = mock_ws.send_json.call_args[0][0]
        assert "artifact_id" not in sent


# ---------------------------------------------------------------------------
# Tests: REST presence endpoint
# ---------------------------------------------------------------------------

class TestProjectPresenceEndpoint:
    """Tests for /ws/project/{project_id}/presence REST endpoint."""

    @pytest.mark.asyncio
    async def test_presence_empty(self, authenticated_client, test_project):
        """Presence for a project with no connections returns empty list."""
        resp = await authenticated_client.get(f"/ws/project/{test_project.id}/presence")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == test_project.id
        assert data["users"] == []
        assert data["count"] == 0

    @pytest.mark.asyncio
    async def test_presence_unauthenticated(self, test_client, test_project):
        """Unauthenticated request to presence endpoint is rejected."""
        resp = await test_client.get(f"/ws/project/{test_project.id}/presence")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: set_artifact message and artifact in presence
# ---------------------------------------------------------------------------

class TestSetArtifact:
    """Tests for set_artifact WS message and current_artifact_id in presence."""

    @pytest.mark.asyncio
    async def test_set_artifact_updates_presence(self):
        """set_user_artifact updates the user's current_artifact_id in presence."""
        mgr = websocket_manager.__class__()

        mock_ws = AsyncMock()
        mock_ws.send_json = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-1", "alice", mock_ws)
        mgr.rooms["proj-1"] = room

        # Initially null
        users = mgr.get_room_users("proj-1")
        assert users[0]["current_artifact_id"] is None

        # Set artifact
        mgr.set_user_artifact("proj-1", "user-1", "artifact-99")

        users = mgr.get_room_users("proj-1")
        assert users[0]["current_artifact_id"] == "artifact-99"

    @pytest.mark.asyncio
    async def test_set_artifact_broadcasts_presence(self):
        """set_artifact triggers a presence broadcast to all room members."""
        from app.services.websocket_manager import WebSocketManager

        mgr = WebSocketManager()

        mock_ws1 = AsyncMock()
        mock_ws1.send_json = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws2.send_json = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-1", "alice", mock_ws1)
        room.add_user("user-2", "bob", mock_ws2)
        mgr.rooms["proj-1"] = room

        # Simulate set_artifact: update + broadcast
        mgr.set_user_artifact("proj-1", "user-1", "artifact-42")
        users = mgr.get_room_users("proj-1")
        await mgr.broadcast_to_room(
            "proj-1",
            {"type": "presence", "users": users, "project_id": "proj-1"}
        )

        # Both users should receive the presence broadcast
        assert mock_ws1.send_json.called
        assert mock_ws2.send_json.called

        sent = mock_ws1.send_json.call_args[0][0]
        assert sent["type"] == "presence"
        # Find user-1 in the users list
        user1_presence = next(u for u in sent["users"] if u["user_id"] == "user-1")
        assert user1_presence["current_artifact_id"] == "artifact-42"

    @pytest.mark.asyncio
    async def test_user_joined_includes_null_artifact(self):
        """user_joined message includes current_artifact_id as null initially."""
        mgr = websocket_manager.__class__()

        # Add an existing user to the room
        mock_ws_existing = AsyncMock()
        mock_ws_existing.send_json = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-1", "alice", mock_ws_existing)
        mgr.rooms["proj-1"] = room
        mgr.user_rooms["user-1"] = {"proj-1"}

        # Connect a new user (simulates the broadcast part)
        mock_ws_new = AsyncMock()
        mock_ws_new.accept = AsyncMock()
        mock_ws_new.send_json = AsyncMock()

        await mgr.connect(mock_ws_new, "proj-1", "user-2", "bob")

        # The existing user should have received user_joined
        calls = mock_ws_existing.send_json.call_args_list
        joined_msg = next(c[0][0] for c in calls if c[0][0].get("type") == "user_joined")
        assert joined_msg["user_id"] == "user-2"
        assert joined_msg["current_artifact_id"] is None

    @pytest.mark.asyncio
    async def test_multiple_users_different_artifacts(self):
        """Multiple users with different artifacts show correct presence."""
        mgr = websocket_manager.__class__()

        mock_ws1 = AsyncMock()
        mock_ws1.send_json = AsyncMock()
        mock_ws2 = AsyncMock()
        mock_ws2.send_json = AsyncMock()

        room = ProjectRoom(project_id="proj-1")
        room.add_user("user-1", "alice", mock_ws1)
        room.add_user("user-2", "bob", mock_ws2)
        mgr.rooms["proj-1"] = room

        mgr.set_user_artifact("proj-1", "user-1", "artifact-A")
        mgr.set_user_artifact("proj-1", "user-2", "artifact-B")

        users = mgr.get_room_users("proj-1")
        user_map = {u["user_id"]: u for u in users}
        assert user_map["user-1"]["current_artifact_id"] == "artifact-A"
        assert user_map["user-2"]["current_artifact_id"] == "artifact-B"
