"""
Tests for user favorites and preferences endpoints (/api/user/*).
"""

import pytest


class TestGetFavorites:

    async def test_get_favorites_empty(self, authenticated_client):
        resp = await authenticated_client.get("/api/user/favorites/namespaces")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    async def test_get_favorites_collections(self, authenticated_client):
        resp = await authenticated_client.get("/api/user/favorites/collections")
        assert resp.status_code == 200
        assert resp.json()["success"] is True


class TestAddFavorite:

    async def test_add_favorite_namespace(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/user/favorites/namespaces",
            json={"namespace": "community"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    async def test_add_favorite_empty_value(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/user/favorites/namespaces",
            json={"namespace": ""},
        )
        assert resp.status_code == 400


class TestRemoveFavorite:

    async def test_remove_favorite(self, authenticated_client):
        # Add first
        await authenticated_client.post(
            "/api/user/favorites/namespaces",
            json={"namespace": "ansible"},
        )
        # Remove
        resp = await authenticated_client.delete(
            "/api/user/favorites/namespaces/ansible"
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True


class TestPreferences:

    async def test_get_preferences(self, authenticated_client):
        resp = await authenticated_client.get("/api/user/preferences")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "preferences" in data

    async def test_update_preferences(self, authenticated_client):
        resp = await authenticated_client.put(
            "/api/user/preferences",
            json={"interface_settings": {"theme": "dark"}},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True
