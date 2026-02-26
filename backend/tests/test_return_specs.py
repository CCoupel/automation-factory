"""
Integration tests for return spec endpoints (/api/projects/{id}/roles/{path}/infer-return-specs).
"""

import pytest

from app.models.project_artifact import ProjectArtifact


TASKS_WITH_SET_FACT = """
- name: Set web port
  set_fact:
    web_port: 8080
    config_enabled: true

- name: Set config path
  ansible.builtin.set_fact:
    config_path: /etc/myapp/config.yml
  when: ansible_os_family == "Debian"
"""

TASKS_WITHOUT_SET_FACT = """
- name: Install package
  apt:
    name: nginx
    state: present
"""


async def _create_role_artifact(session, project_id: str, path: str, raw_content: str):
    """Helper to create a role artifact."""
    artifact = ProjectArtifact(
        project_id=project_id,
        artifact_type="role",
        path=path,
        raw_content=raw_content,
    )
    session.add(artifact)
    await session.commit()
    await session.refresh(artifact)
    return artifact


class TestInferReturnSpecs:
    @pytest.mark.asyncio
    async def test_infer_return_specs(self, authenticated_client, test_project, test_session):
        await _create_role_artifact(
            test_session,
            test_project.id,
            "roles/webserver/tasks/main.yml",
            TASKS_WITH_SET_FACT,
        )

        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/roles/roles/webserver/infer-return-specs"
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "web_port" in data["inferred"]
        assert data["inferred"]["web_port"]["type"] == "int"
        assert data["inferred"]["web_port"]["always_set"] is True

        assert "config_enabled" in data["inferred"]
        assert data["inferred"]["config_enabled"]["type"] == "bool"

        assert "config_path" in data["inferred"]
        assert data["inferred"]["config_path"]["always_set"] is False

    @pytest.mark.asyncio
    async def test_infer_no_tasks(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/roles/roles/emptyrole/infer-return-specs"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["inferred"] == {}
        assert len(data["warnings"]) > 0

    @pytest.mark.asyncio
    async def test_infer_no_set_facts(self, authenticated_client, test_project, test_session):
        await _create_role_artifact(
            test_session,
            test_project.id,
            "roles/basic/tasks/main.yml",
            TASKS_WITHOUT_SET_FACT,
        )

        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/roles/roles/basic/infer-return-specs"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["inferred"] == {}
        assert data["warnings"] == []

    @pytest.mark.asyncio
    async def test_infer_unauthenticated(self, test_client, test_project):
        resp = await test_client.post(
            f"/api/projects/{test_project.id}/roles/roles/webserver/infer-return-specs"
        )
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_infer_nonexistent_project(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/projects/nonexistent/roles/roles/webserver/infer-return-specs"
        )
        assert resp.status_code == 404
