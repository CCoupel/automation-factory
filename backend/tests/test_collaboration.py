"""
Tests for collaboration endpoints (/api/playbooks/{id}/shares, audit-log, shared-with-me).
"""

import pytest
from app.models.user import User
from app.models.playbook_collaboration import PlaybookShare, PlaybookRole
from app.core.security import get_password_hash, create_access_token
from httpx import ASGITransport, AsyncClient


async def _second_user(session):
    user = User(
        email="collab@example.com",
        username="collabuser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def _client_for(app, user):
    """Context-manager helper: returns an AsyncClient authenticated as *user*."""
    token = create_access_token(data={"sub": user.id, "username": user.username})
    transport = ASGITransport(app=app)
    return AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    )


# ---------------------------------------------------------------------------
# Share CRUD
# ---------------------------------------------------------------------------

class TestShareCreate:

    async def test_share_success(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/shares",
            json={"username": other.username, "role": "viewer"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "viewer"
        assert data["user"]["username"] == other.username

    async def test_share_self_denied(self, authenticated_client, test_playbook, test_user):
        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/shares",
            json={"username": test_user.username, "role": "viewer"},
        )
        assert resp.status_code == 400

    async def test_share_non_owner_denied(self, test_app, test_session, test_playbook):
        other = await _second_user(test_session)
        async with _client_for(test_app, other) as client:
            resp = await client.post(
                f"/api/playbooks/{test_playbook.id}/shares",
                json={"username": "anyone", "role": "viewer"},
            )
        assert resp.status_code == 403

    async def test_share_duplicate(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/shares",
            json={"username": other.username, "role": "viewer"},
        )
        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/shares",
            json={"username": other.username, "role": "editor"},
        )
        assert resp.status_code == 400
        assert "already shared" in resp.json()["detail"]

    async def test_share_invalid_role(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        resp = await authenticated_client.post(
            f"/api/playbooks/{test_playbook.id}/shares",
            json={"username": other.username, "role": "owner"},
        )
        assert resp.status_code == 400


class TestShareList:

    async def test_list_shares(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.get(
            f"/api/playbooks/{test_playbook.id}/shares"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1


class TestShareUpdate:

    async def test_update_role(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()
        await test_session.refresh(share)

        resp = await authenticated_client.put(
            f"/api/playbooks/{test_playbook.id}/shares/{share.id}",
            json={"role": "editor"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "editor"


class TestShareDelete:

    async def test_delete_share(self, authenticated_client, test_session, test_playbook):
        other = await _second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()
        await test_session.refresh(share)

        resp = await authenticated_client.delete(
            f"/api/playbooks/{test_playbook.id}/shares/{share.id}"
        )
        assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Shared with me
# ---------------------------------------------------------------------------

class TestSharedWithMe:

    async def test_shared_with_me(self, test_app, test_session, test_playbook):
        other = await _second_user(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=other.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_playbook.owner_id,
        )
        test_session.add(share)
        await test_session.commit()

        async with _client_for(test_app, other) as client:
            resp = await client.get("/api/playbooks/shared-with-me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["playbooks"][0]["name"] == test_playbook.name


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

class TestAuditLog:

    async def test_audit_log_created_on_playbook_create(
        self, authenticated_client, test_playbook
    ):
        resp = await authenticated_client.get(
            f"/api/playbooks/{test_playbook.id}/audit-log"
        )
        assert resp.status_code == 200

    async def test_audit_log_owner_only(self, test_app, test_session, test_playbook):
        other = await _second_user(test_session)
        async with _client_for(test_app, other) as client:
            resp = await client.get(
                f"/api/playbooks/{test_playbook.id}/audit-log"
            )
        assert resp.status_code == 403

    async def test_audit_log_limit(self, authenticated_client, test_playbook):
        resp = await authenticated_client.get(
            f"/api/playbooks/{test_playbook.id}/audit-log?limit=5"
        )
        assert resp.status_code == 200
