"""
Tests for playbook CRUD endpoints (/api/playbooks/*).
"""

import pytest
from app.models.playbook import Playbook
from app.models.playbook_collaboration import PlaybookShare, PlaybookRole
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_CONTENT = {"plays": [{"name": "play1", "hosts": "all", "tasks": []}]}


async def _create_second_user(session):
    """Create a second user for sharing tests."""
    user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

class TestListPlaybooks:

    async def test_list_empty(self, authenticated_client):
        resp = await authenticated_client.get("/api/playbooks")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_owned(self, authenticated_client, test_playbook):
        resp = await authenticated_client.get("/api/playbooks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Playbook"
        assert data[0]["user_role"] == "owner"

    async def test_list_includes_shared(self, test_app, test_session, test_playbook):
        """A playbook shared with another user should appear in their list."""
        other = await _create_second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.get("/api/playbooks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["is_shared"] is True


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class TestCreatePlaybook:

    async def test_create_success(self, authenticated_client):
        resp = await authenticated_client.post("/api/playbooks", json={
            "name": "New Playbook",
            "description": "desc",
            "content": SAMPLE_CONTENT,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Playbook"
        assert data["content"] == SAMPLE_CONTENT

    async def test_create_unauthenticated(self, test_client):
        resp = await test_client.post("/api/playbooks", json={
            "name": "X",
            "description": "",
            "content": SAMPLE_CONTENT,
        })
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Get
# ---------------------------------------------------------------------------

class TestGetPlaybook:

    async def test_get_as_owner(self, authenticated_client, test_playbook):
        resp = await authenticated_client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == test_playbook.name

    async def test_get_as_shared_viewer(self, test_app, test_session, test_playbook):
        other = await _create_second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 200

    async def test_get_no_access(self, test_app, test_session, test_playbook):
        other = await _create_second_user(test_session)

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.get(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 403

    async def test_get_not_found(self, authenticated_client):
        resp = await authenticated_client.get("/api/playbooks/nonexistent-id")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

class TestUpdatePlaybook:

    async def test_update_as_owner(self, authenticated_client, test_playbook):
        resp = await authenticated_client.put(
            f"/api/playbooks/{test_playbook.id}",
            json={"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_update_as_editor(self, test_app, test_session, test_playbook):
        other = await _create_second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.EDITOR.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.put(
                f"/api/playbooks/{test_playbook.id}",
                json={"name": "Editor Update"},
            )
        assert resp.status_code == 200

    async def test_update_as_viewer_denied(self, test_app, test_session, test_playbook):
        other = await _create_second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.put(
                f"/api/playbooks/{test_playbook.id}",
                json={"name": "Viewer Update"},
            )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

class TestDeletePlaybook:

    async def test_delete_as_owner(self, authenticated_client, test_playbook):
        resp = await authenticated_client.delete(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 204

    async def test_delete_as_non_owner_denied(self, test_app, test_session, test_playbook):
        other = await _create_second_user(test_session)

        from httpx import ASGITransport, AsyncClient
        token = create_access_token(data={"sub": other.id, "username": other.username})
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.delete(f"/api/playbooks/{test_playbook.id}")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Transfer ownership
# ---------------------------------------------------------------------------

class TestTransferOwnership:

    async def test_transfer_success(self, authenticated_client, test_session, test_playbook):
        other = await _create_second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.EDITOR.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/transfer-ownership",
            json={"new_owner_username": other.username, "keep_access": True},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["new_owner_username"] == other.username

    async def test_transfer_to_non_shared_user_denied(
        self, authenticated_client, test_session, test_playbook
    ):
        other = await _create_second_user(test_session)

        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/transfer-ownership",
            json={"new_owner_username": other.username, "keep_access": False},
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# YAML preview / validate preview
# ---------------------------------------------------------------------------

class TestPreview:

    async def test_yaml_preview(self, authenticated_client):
        resp = await authenticated_client.post("/api/playbooks/preview", json={
            "content": SAMPLE_CONTENT,
        })
        assert resp.status_code == 200
        assert "yaml" in resp.json()

    async def test_validate_preview(self, authenticated_client):
        resp = await authenticated_client.post("/api/playbooks/validate-preview", json={
            "content": SAMPLE_CONTENT,
        })
        assert resp.status_code == 200
        assert "is_valid" in resp.json()
