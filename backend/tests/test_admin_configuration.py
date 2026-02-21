"""
Tests for admin configuration endpoints (/api/admin/configuration/*).
"""

import pytest


class TestStandardNamespaces:

    async def test_get_standard_namespaces(self, admin_client):
        resp = await admin_client.get("/api/admin/configuration/standard-namespaces")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "namespaces" in data
        assert "count" in data

    async def test_get_standard_namespaces_non_admin(self, authenticated_client):
        resp = await authenticated_client.get("/api/admin/configuration/standard-namespaces")
        assert resp.status_code == 403

    async def test_update_standard_namespaces(self, admin_client):
        resp = await admin_client.put(
            "/api/admin/configuration/standard-namespaces",
            json={"namespaces": ["community", "ansible"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert set(data["namespaces"]) == {"community", "ansible"}

    async def test_update_standard_namespaces_deduplicates(self, admin_client):
        resp = await admin_client.put(
            "/api/admin/configuration/standard-namespaces",
            json={"namespaces": ["community", "community", "ansible"]},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 2

    async def test_update_standard_namespaces_invalid_format(self, admin_client):
        resp = await admin_client.put(
            "/api/admin/configuration/standard-namespaces",
            json={"namespaces": ["123invalid"]},
        )
        assert resp.status_code == 400


class TestConfigurationInfo:

    async def test_get_configuration_info(self, admin_client):
        resp = await admin_client.get("/api/admin/configuration/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "sections" in data

    async def test_get_configuration_info_non_admin(self, authenticated_client):
        resp = await authenticated_client.get("/api/admin/configuration/info")
        assert resp.status_code == 403
