"""
Integration tests for inventory endpoints
"""

import pytest
import pytest_asyncio

from app.models.project import Project


YAML_INVENTORY = """all:
  hosts:
    host1:
      ansible_host: 1.2.3.4
    host2:
      ansible_host: 5.6.7.8
  children:
    webservers:
      hosts:
        host1:
      vars:
        http_port: 80
"""

INI_INVENTORY = """[webservers]
web1 ansible_host=1.2.3.4
web2

[dbservers]
db1

[webservers:vars]
http_port=80
"""


class TestParseInventory:
    @pytest.mark.asyncio
    async def test_parse_yaml_inventory(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/parse",
            json={"raw_content": YAML_INVENTORY},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "yaml"
        assert len(data["data"]["hosts"]) == 2
        assert len(data["data"]["groups"]) >= 2
        host_names = {h["name"] for h in data["data"]["hosts"]}
        assert "host1" in host_names
        assert "host2" in host_names

    @pytest.mark.asyncio
    async def test_parse_ini_inventory(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/parse",
            json={"raw_content": INI_INVENTORY},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "ini"
        assert len(data["data"]["hosts"]) == 3

    @pytest.mark.asyncio
    async def test_parse_empty_content(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/parse",
            json={"raw_content": ""},
        )
        # Pydantic validation should reject empty content
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_parse_requires_auth(self, test_client, test_project):
        resp = await test_client.post(
            f"/api/projects/{test_project.id}/inventory/parse",
            json={"raw_content": YAML_INVENTORY},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_parse_nonexistent_project(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/projects/nonexistent-id/inventory/parse",
            json={"raw_content": YAML_INVENTORY},
        )
        assert resp.status_code == 404


class TestGenerateInventory:
    @pytest.mark.asyncio
    async def test_generate_yaml(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/generate",
            json={
                "hosts": [
                    {"name": "host1", "variables": {"ansible_host": "1.2.3.4"}},
                    {"name": "host2", "variables": {}},
                ],
                "groups": [
                    {"name": "webservers", "hosts": ["host1"], "children": [], "variables": {"http_port": 80}},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "yaml_content" in data
        assert "host1" in data["yaml_content"]
        assert "webservers" in data["yaml_content"]

    @pytest.mark.asyncio
    async def test_generate_with_validation_error(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/generate",
            json={
                "hosts": [],
                "groups": [
                    {"name": "web", "hosts": ["nonexistent"], "children": [], "variables": {}},
                ],
            },
        )
        assert resp.status_code == 400
        assert "validation failed" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_generate_empty_inventory(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/inventory/generate",
            json={"hosts": [], "groups": []},
        )
        assert resp.status_code == 200
        assert "yaml_content" in resp.json()

    @pytest.mark.asyncio
    async def test_generate_requires_auth(self, test_client, test_project):
        resp = await test_client.post(
            f"/api/projects/{test_project.id}/inventory/generate",
            json={"hosts": [], "groups": []},
        )
        assert resp.status_code == 403
