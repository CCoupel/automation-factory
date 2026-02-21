"""
Tests for authentication endpoints (/api/auth/*).
"""

import pytest
from datetime import timedelta
from app.core.security import create_access_token


class TestRegister:

    async def test_register_success(self, test_client):
        resp = await test_client.post("/api/auth/register", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "secret123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["username"] == "newuser"
        assert "token" in data

    async def test_register_duplicate_email(self, test_client, test_user):
        resp = await test_client.post("/api/auth/register", json={
            "email": test_user.email,
            "username": "other",
            "password": "secret123",
        })
        assert resp.status_code == 400
        assert "Email already registered" in resp.json()["detail"]

    async def test_register_duplicate_username(self, test_client, test_user):
        resp = await test_client.post("/api/auth/register", json={
            "email": "other@example.com",
            "username": test_user.username,
            "password": "secret123",
        })
        assert resp.status_code == 400
        assert "Username already taken" in resp.json()["detail"]

    async def test_register_invalid_email(self, test_client):
        resp = await test_client.post("/api/auth/register", json={
            "email": "not-an-email",
            "username": "newuser",
            "password": "secret123",
        })
        assert resp.status_code == 422

    async def test_register_short_password(self, test_client):
        resp = await test_client.post("/api/auth/register", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "ab",
        })
        assert resp.status_code == 422


class TestLogin:

    async def test_login_success(self, test_client, test_user):
        resp = await test_client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == test_user.email
        assert "token" in data

    async def test_login_wrong_password(self, test_client, test_user):
        resp = await test_client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "wrong",
        })
        assert resp.status_code == 401
        assert "Incorrect email or password" in resp.json()["detail"]

    async def test_login_nonexistent_user(self, test_client):
        resp = await test_client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "whatever",
        })
        assert resp.status_code == 401

    async def test_login_inactive_user(self, test_client, test_session):
        from app.core.security import get_password_hash
        from app.models.user import User

        user = User(
            email="inactive@example.com",
            username="inactiveuser",
            hashed_password=get_password_hash("password123"),
            is_active=False,
            is_admin=False,
        )
        test_session.add(user)
        await test_session.commit()

        resp = await test_client.post("/api/auth/login", json={
            "email": "inactive@example.com",
            "password": "password123",
        })
        assert resp.status_code == 403
        assert "disabled" in resp.json()["detail"]


class TestVerify:

    async def test_verify_valid_token(self, authenticated_client, test_user):
        resp = await authenticated_client.get("/api/auth/verify")
        assert resp.status_code == 200
        assert resp.json()["email"] == test_user.email

    async def test_verify_invalid_token(self, test_client):
        resp = await test_client.get(
            "/api/auth/verify",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    async def test_verify_expired_token(self, test_client, test_user):
        token = create_access_token(
            data={"sub": test_user.id, "username": test_user.username},
            expires_delta=timedelta(seconds=-1),
        )
        resp = await test_client.get(
            "/api/auth/verify",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401


class TestChangePassword:

    async def test_change_password_success(self, authenticated_client):
        resp = await authenticated_client.put("/api/auth/change-password", json={
            "current_password": "password123",
            "new_password": "newpassword456",
        })
        assert resp.status_code == 200
        assert "successfully" in resp.json()["message"]

    async def test_change_password_wrong_current(self, authenticated_client):
        resp = await authenticated_client.put("/api/auth/change-password", json={
            "current_password": "wrong",
            "new_password": "newpassword456",
        })
        assert resp.status_code == 401


class TestLogout:

    async def test_logout(self, test_client):
        resp = await test_client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert "logged out" in resp.json()["message"]
