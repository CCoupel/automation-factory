"""
Tests for common endpoints (/api/version, /api/ping, /health).
"""

import pytest


class TestCommonEndpoints:

    async def test_version(self, test_client):
        resp = await test_client.get("/api/version")
        assert resp.status_code == 200
        data = resp.json()
        assert "version" in data
        assert data["name"] == "Automation Factory API"

    async def test_ping(self, test_client):
        resp = await test_client.get("/api/ping")
        assert resp.status_code == 200
        assert resp.json()["message"] == "pong"

    async def test_health(self, test_client):
        resp = await test_client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
