"""
Tests for playbook export endpoints (/api/export/*).

Export endpoints are unauthenticated — they accept playbook content directly.
"""

import pytest

SAMPLE_PLAYS = [
    {
        "id": "play-1",
        "name": "Install webserver",
        "hosts": "all",
        "become": True,
        "sections": {
            "pre_tasks": [],
            "roles": [],
            "tasks": [],
            "post_tasks": [],
            "handlers": [],
        },
    }
]


class TestABDExport:

    async def test_export_abd(self, test_client):
        resp = await test_client.post("/api/export/abd", json={
            "plays": SAMPLE_PLAYS,
            "playbook_name": "Test",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
        assert data["filename"].endswith(".abd")

    async def test_download_abd(self, test_client):
        resp = await test_client.post("/api/export/abd/download", json={
            "plays": SAMPLE_PLAYS,
            "playbook_name": "Test",
        })
        assert resp.status_code == 200
        assert "automation-factory" in resp.headers.get("content-type", "")


class TestMermaidExport:

    async def test_export_mermaid(self, test_client):
        resp = await test_client.post("/api/export/mermaid", json={
            "plays": SAMPLE_PLAYS,
            "playbook_name": "Test",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
        assert data["filename"].endswith(".md")


class TestSVGExport:

    async def test_export_svg(self, test_client):
        resp = await test_client.post("/api/export/svg", json={
            "plays": SAMPLE_PLAYS,
            "playbook_name": "Test",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
        assert data["filename"].endswith(".svg")
