"""
Integration tests for Collection/Requirements endpoints.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

pytestmark = pytest.mark.anyio


REQUIREMENTS_YAML = """
collections:
  - name: community.general
    version: ">=5.0.0"
  - name: ansible.posix
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
"""


class TestParseRequirements:

    async def test_parse_success(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/parse",
            json={"raw_content": REQUIREMENTS_YAML},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]["collections"]) == 2
        assert data["data"]["collections"][0]["name"] == "community.general"
        assert data["data"]["collections"][0]["version"] == ">=5.0.0"
        assert len(data["data"]["roles"]) == 1
        assert data["data"]["roles"][0]["name"] == "geerlingguy.docker"

    async def test_parse_invalid_yaml(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/parse",
            json={"raw_content": "collections:\n  - [bad: yaml: :"},
        )
        assert resp.status_code == 400

    async def test_parse_empty_content_rejected(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/parse",
            json={"raw_content": ""},
        )
        assert resp.status_code == 422  # Pydantic validation (min_length=1)

    async def test_parse_project_not_found(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.post(
            "/api/projects/nonexistent-id/collections/parse",
            json={"raw_content": REQUIREMENTS_YAML},
        )
        assert resp.status_code == 404

    async def test_parse_unauthorized(self, test_client, test_project):
        """Unauthenticated request should be rejected."""
        resp = await test_client.post(
            f"/api/projects/{test_project.id}/collections/parse",
            json={"raw_content": REQUIREMENTS_YAML},
        )
        assert resp.status_code in (401, 403)


class TestGenerateRequirements:

    async def test_generate_success(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/generate",
            json={
                "collections": [
                    {"name": "community.general", "version": ">=5.0.0"},
                    {"name": "ansible.posix"},
                ],
                "roles": [
                    {"name": "geerlingguy.docker", "version": "6.1.0"},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "community.general" in data["yaml_content"]
        assert "geerlingguy.docker" in data["yaml_content"]

    async def test_generate_validation_error(self, authenticated_client: AsyncClient, test_project):
        """Duplicate collection names should cause a validation error."""
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/generate",
            json={
                "collections": [
                    {"name": "community.general"},
                    {"name": "community.general"},
                ],
            },
        )
        assert resp.status_code == 400
        assert "Duplicate" in resp.json()["detail"]

    async def test_generate_invalid_fqcn(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/collections/generate",
            json={
                "collections": [{"name": "no-dot-name"}],
            },
        )
        assert resp.status_code == 400
        assert "FQCN" in resp.json()["detail"]

    async def test_generate_project_not_found(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.post(
            "/api/projects/nonexistent-id/collections/generate",
            json={"collections": [], "roles": []},
        )
        assert resp.status_code == 404


class TestSearchCollections:

    async def test_search_success(self, authenticated_client: AsyncClient, test_project):
        mock_results = [
            {
                "namespace": "community",
                "name": "general",
                "fqcn": "community.general",
                "version": "9.0.0",
                "description": "General community modules",
                "download_count": 1000000,
            }
        ]
        with patch(
            "app.api.endpoints.collection.galaxy_roles_service.search_collections",
            new_callable=AsyncMock,
            return_value=mock_results,
        ):
            resp = await authenticated_client.get(
                f"/api/projects/{test_project.id}/collections/search",
                params={"query": "community"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["fqcn"] == "community.general"
        assert data[0]["download_count"] == 1000000

    async def test_search_missing_query(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.get(
            f"/api/projects/{test_project.id}/collections/search",
        )
        assert resp.status_code == 422  # Missing required query param

    async def test_search_invalid_source(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.get(
            f"/api/projects/{test_project.id}/collections/search",
            params={"query": "test", "source": "invalid"},
        )
        assert resp.status_code == 422

    async def test_search_project_not_found(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.get(
            "/api/projects/nonexistent-id/collections/search",
            params={"query": "community"},
        )
        assert resp.status_code == 404
