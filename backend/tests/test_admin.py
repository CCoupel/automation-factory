"""
Tests for admin endpoints (/api/admin/*).
"""

import pytest
from app.models.user import User
from app.models.playbook import Playbook
from app.core.security import get_password_hash, create_access_token
from httpx import ASGITransport, AsyncClient


async def _regular_user(session):
    user = User(
        email="regular@example.com",
        username="regular",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


class TestListUsers:

    async def test_list_users_admin(self, admin_client, admin_user):
        resp = await admin_client.get("/api/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert any(u["email"] == admin_user.email for u in data)

    async def test_list_users_non_admin_denied(self, authenticated_client):
        resp = await authenticated_client.get("/api/admin/users")
        assert resp.status_code == 403


class TestChangeUserPassword:

    async def test_change_user_password(self, admin_client, test_session):
        user = await _regular_user(test_session)
        resp = await admin_client.put(
            f"/api/admin/users/{user.id}/password",
            json={"new_password": "changed123"},
        )
        assert resp.status_code == 200
        assert "Password updated" in resp.json()["message"]


class TestUpdateUserStatus:

    async def test_toggle_user_status(self, admin_client, test_session):
        user = await _regular_user(test_session)
        resp = await admin_client.patch(
            f"/api/admin/users/{user.id}",
            json={"is_active": False},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    async def test_deactivate_self_denied(self, admin_client, admin_user):
        resp = await admin_client.patch(
            f"/api/admin/users/{admin_user.id}",
            json={"is_active": False},
        )
        assert resp.status_code == 400
        assert "Cannot deactivate your own account" in resp.json()["detail"]

    async def test_remove_own_admin_denied(self, admin_client, admin_user):
        resp = await admin_client.patch(
            f"/api/admin/users/{admin_user.id}",
            json={"is_admin": False},
        )
        assert resp.status_code == 400
        assert "Cannot remove your own admin privileges" in resp.json()["detail"]


class TestPurgeUserPlaybooks:

    async def test_purge_playbooks(self, admin_client, test_session):
        user = await _regular_user(test_session)
        pb = Playbook(
            name="To Delete",
            description="",
            content={"plays": []},
            owner_id=user.id,
        )
        test_session.add(pb)
        await test_session.commit()

        resp = await admin_client.delete(f"/api/admin/users/{user.id}/playbooks")
        assert resp.status_code == 200
        assert resp.json()["deleted_count"] == 1


class TestDeleteUser:

    async def test_delete_user(self, admin_client, test_session):
        user = await _regular_user(test_session)
        resp = await admin_client.delete(f"/api/admin/users/{user.id}")
        assert resp.status_code == 204

    async def test_delete_self_denied(self, admin_client, admin_user):
        resp = await admin_client.delete(f"/api/admin/users/{admin_user.id}")
        assert resp.status_code == 400
        assert "Cannot delete your own account" in resp.json()["detail"]
