"""
Integration tests for the variable chain validation endpoint.
"""

import pytest
import pytest_asyncio
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_collaboration import ProjectShare


@pytest.mark.asyncio
class TestValidateVariableChainsEndpoint:
    """Test POST /projects/{project_id}/validate-variable-chains"""

    async def test_unauthenticated(self, test_client, test_project):
        resp = await test_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={"playbook_yaml": "---\n- hosts: all\n  tasks: []\n"},
        )
        assert resp.status_code == 403

    async def test_empty_playbook(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={"playbook_yaml": "---\n- hosts: all\n  tasks: []\n"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is True
        assert data["issues"] == []

    async def test_invalid_yaml(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={"playbook_yaml": "{{invalid: [yaml"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert len(data["issues"]) > 0

    async def test_with_role_specs(self, authenticated_client, test_project, test_session):
        """Test validation with actual role specs artifacts in the database."""
        # Create argument_specs artifact
        arg_artifact = ProjectArtifact(
            project_id=test_project.id,
            artifact_type="role",
            path="roles/webserver/meta/argument_specs.yml",
            raw_content="""
argument_specs:
  main:
    short_description: "Configure web server"
    options:
      http_port:
        type: int
        required: true
        description: "HTTP port number"
      server_name:
        type: str
        required: false
        description: "Server hostname"
""",
        )
        test_session.add(arg_artifact)

        # Create return_specs artifact
        ret_artifact = ProjectArtifact(
            project_id=test_project.id,
            artifact_type="role",
            path="roles/webserver/meta/return_specs.yml",
            raw_content="""
main:
  short_description: "Web server outputs"
  return_values:
    webserver_url:
      type: str
      description: "URL of the deployed web server"
      scope: host
      always_set: true
""",
        )
        test_session.add(ret_artifact)
        await test_session.commit()

        # Test with missing required variable
        playbook_yaml = """
- hosts: all
  roles:
    - role: webserver
"""
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={"playbook_yaml": playbook_yaml},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is False
        assert any("http_port" in i["message"] for i in data["issues"])
        assert "webserver" in data["role_specs"]

    async def test_with_provided_vars(self, authenticated_client, test_project, test_session):
        """Test validation with required vars provided."""
        arg_artifact = ProjectArtifact(
            project_id=test_project.id,
            artifact_type="role",
            path="roles/db/meta/argument_specs.yml",
            raw_content="""
argument_specs:
  main:
    options:
      db_name:
        type: str
        required: true
        description: "Database name"
""",
        )
        test_session.add(arg_artifact)
        await test_session.commit()

        playbook_yaml = """
- hosts: all
  roles:
    - role: db
      vars:
        db_name: mydb
"""
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={"playbook_yaml": playbook_yaml},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_valid"] is True

    async def test_missing_body(self, authenticated_client, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/validate-variable-chains",
            json={},
        )
        assert resp.status_code == 422
