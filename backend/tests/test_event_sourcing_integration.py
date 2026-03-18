"""
Integration tests for event-sourcing: GET endpoint with events_delta,
and WebSocket event_ack flow.
"""

import pytest
import pytest_asyncio
from unittest.mock import patch
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.core.security import create_access_token
from app.models.playbook import Playbook
from app.models.playbook_event import PlaybookEvent
from app.models.project import Project
from app.models.user import User


def _make_token(user: User) -> str:
    return create_access_token(data={"sub": user.id, "username": user.username})


# ---------------------------------------------------------------------------
# GET /api/playbooks/{id} — events_delta
# ---------------------------------------------------------------------------

class TestGetPlaybookEventsDelta:
    """GET /api/playbooks/{id} returns events_delta since snapshot_sequence."""

    @pytest.mark.asyncio
    async def test_empty_events_delta(self, authenticated_client, test_playbook):
        """When no events exist, events_delta is an empty list."""
        resp = await authenticated_client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["events_delta"] == []
        assert data["snapshot_sequence"] == 0

    @pytest.mark.asyncio
    async def test_events_delta_with_events(
        self, authenticated_client, test_session, test_playbook, test_user
    ):
        """Events inserted after snapshot_sequence appear in events_delta."""
        for i in range(1, 4):
            test_session.add(PlaybookEvent(
                playbook_id=test_playbook.id,
                user_id=test_user.id,
                event_type=f"action_{i}",
                data={"step": i},
                sequence_number=i,
            ))
        await test_session.commit()

        resp = await authenticated_client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["events_delta"]) == 3
        assert data["events_delta"][0]["sequence_number"] == 1
        assert data["events_delta"][2]["sequence_number"] == 3

    @pytest.mark.asyncio
    async def test_events_delta_respects_snapshot_sequence(
        self, authenticated_client, test_session, test_playbook, test_user
    ):
        """Only events after snapshot_sequence are returned."""
        for i in range(1, 6):
            test_session.add(PlaybookEvent(
                playbook_id=test_playbook.id,
                user_id=test_user.id,
                event_type=f"action_{i}",
                data={"step": i},
                sequence_number=i,
            ))
        test_playbook.snapshot_sequence = 3
        await test_session.commit()

        resp = await authenticated_client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["snapshot_sequence"] == 3
        assert len(data["events_delta"]) == 2
        assert data["events_delta"][0]["sequence_number"] == 4
        assert data["events_delta"][1]["sequence_number"] == 5


# ---------------------------------------------------------------------------
# WebSocket — event_ack on update with artifact_id
# ---------------------------------------------------------------------------

class TestWebSocketEventAck:
    """WS update with artifact_id should persist event and return event_ack."""

    @pytest_asyncio.fixture
    async def project_with_playbook(self, test_session, test_user):
        """Create a project with a playbook for WS testing."""
        project = Project(
            name="WS Test Project",
            description="For WS event ack test",
            owner_id=test_user.id,
        )
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        playbook = Playbook(
            name="WS Test Playbook",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)
        return project, playbook

    @pytest.mark.asyncio
    async def test_update_with_artifact_returns_ack(
        self, test_app, test_engine, test_user, project_with_playbook
    ):
        """Sending an update with artifact_id returns event_ack with sequence_number."""
        from starlette.testclient import TestClient

        project, playbook = project_with_playbook
        token = _make_token(test_user)
        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with TestClient(test_app) as client:
            with patch("app.api.endpoints.websocket.check_project_access_standalone", return_value="owner"), \
                 patch("app.api.endpoints.websocket.AsyncSessionLocal", factory):
                with client.websocket_connect(
                    f"/ws/project/{project.id}?token={token}"
                ) as ws:
                    # Read initial messages: connected + presence
                    msg1 = ws.receive_json()
                    msg2 = ws.receive_json()
                    types = {msg1["type"], msg2["type"]}
                    assert "connected" in types
                    assert "presence" in types

                    # Set artifact
                    ws.send_json({
                        "type": "set_artifact",
                        "artifact_id": playbook.id,
                    })
                    # Receive presence broadcast
                    _pres = ws.receive_json()
                    assert _pres["type"] == "presence"

                    # Send update with artifact_id
                    ws.send_json({
                        "type": "update",
                        "update_type": "content",
                        "artifact_id": playbook.id,
                        "event_type": "module_add",
                        "data": {"module": "apt"},
                    })

                    # Should receive event_ack
                    ack = ws.receive_json()
                    assert ack["type"] == "event_ack"
                    assert "sequence_number" in ack
                    assert ack["sequence_number"] == 1

    @pytest.mark.asyncio
    async def test_update_without_artifact_returns_ack_no_sequence(
        self, test_app, test_engine, test_user, project_with_playbook
    ):
        """Update without artifact_id returns event_ack but no sequence_number."""
        from starlette.testclient import TestClient

        project, playbook = project_with_playbook
        token = _make_token(test_user)
        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with TestClient(test_app) as client:
            with patch("app.api.endpoints.websocket.check_project_access_standalone", return_value="owner"), \
                 patch("app.api.endpoints.websocket.AsyncSessionLocal", factory):
                with client.websocket_connect(
                    f"/ws/project/{project.id}?token={token}"
                ) as ws:
                    # Read initial messages
                    ws.receive_json()  # connected or presence
                    ws.receive_json()  # connected or presence

                    # Send update WITHOUT artifact_id
                    ws.send_json({
                        "type": "update",
                        "update_type": "content",
                        "data": {"something": "else"},
                    })

                    # Should receive event_ack (no sequence_number)
                    ack = ws.receive_json()
                    assert ack["type"] == "event_ack"
                    assert "sequence_number" not in ack

    @pytest.mark.asyncio
    async def test_successive_updates_increment_sequence(
        self, test_app, test_engine, test_user, project_with_playbook
    ):
        """Two successive updates return incrementing sequence numbers."""
        from starlette.testclient import TestClient

        project, playbook = project_with_playbook
        token = _make_token(test_user)
        factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

        with TestClient(test_app) as client:
            with patch("app.api.endpoints.websocket.check_project_access_standalone", return_value="owner"), \
                 patch("app.api.endpoints.websocket.AsyncSessionLocal", factory):
                with client.websocket_connect(
                    f"/ws/project/{project.id}?token={token}"
                ) as ws:
                    ws.receive_json()  # connected or presence
                    ws.receive_json()  # connected or presence

                    # First update
                    ws.send_json({
                        "type": "update",
                        "update_type": "content",
                        "artifact_id": playbook.id,
                        "event_type": "module_add",
                        "data": {"step": 1},
                    })
                    ack1 = ws.receive_json()
                    assert ack1["sequence_number"] == 1

                    # Second update
                    ws.send_json({
                        "type": "update",
                        "update_type": "content",
                        "artifact_id": playbook.id,
                        "event_type": "link_add",
                        "data": {"step": 2},
                    })
                    ack2 = ws.receive_json()
                    assert ack2["sequence_number"] == 2
