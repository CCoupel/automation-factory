"""
Integration tests for Projects, Project Artifacts, and Project Shares endpoints.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


# ============================================================================
# TestListProjects
# ============================================================================

class TestListProjects:

    async def test_list_empty(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.get("/api/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["projects"] == []

    async def test_list_owned(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.get("/api/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["projects"][0]["name"] == "Test Project"
        assert data["projects"][0]["user_role"] == "owner"
        assert data["projects"][0]["is_shared"] is False

    async def test_list_includes_shared(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        """A project shared with test_user appears in their list."""
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        # admin_user owns a project
        project = Project(name="Admin Project", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        # Share with test_user
        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="viewer", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.get("/api/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["projects"][0]["name"] == "Admin Project"
        assert data["projects"][0]["user_role"] == "viewer"
        assert data["projects"][0]["is_shared"] is True

    async def test_no_cross_tenant_leak(
        self, authenticated_client: AsyncClient, test_session, admin_user
    ):
        """test_user should not see admin_user's unshared project."""
        from app.models.project import Project

        project = Project(name="Secret Project", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()

        resp = await authenticated_client.get("/api/projects")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    async def test_unauthenticated(self, test_client: AsyncClient):
        resp = await test_client.get("/api/projects")
        assert resp.status_code == 403


# ============================================================================
# TestCreateProject
# ============================================================================

class TestCreateProject:

    async def test_create_minimal(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.post(
            "/api/projects", json={"name": "My Project"}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Project"
        assert data["description"] is None
        assert data["user_role"] == "owner"

    async def test_create_with_all_fields(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.post("/api/projects", json={
            "name": "Full Project",
            "description": "A complete project",
            "git_url": "https://github.com/example/repo.git",
            "git_branch": "develop",
            "settings": {"timeout": 30},
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Full Project"
        assert data["description"] == "A complete project"
        assert data["git_url"] == "https://github.com/example/repo.git"
        assert data["git_branch"] == "develop"
        assert data["settings"] == {"timeout": 30}

    async def test_missing_name_422(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.post("/api/projects", json={})
        assert resp.status_code == 422

    async def test_unauthenticated_401_or_403(self, test_client: AsyncClient):
        resp = await test_client.post("/api/projects", json={"name": "X"})
        assert resp.status_code in (401, 403)


# ============================================================================
# TestGetProject
# ============================================================================

class TestGetProject:

    async def test_as_owner(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.get(f"/api/projects/{test_project.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Project"
        assert resp.json()["user_role"] == "owner"

    async def test_as_shared_viewer(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        project = Project(name="Shared Proj", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="viewer", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.get(f"/api/projects/{project.id}")
        assert resp.status_code == 200
        assert resp.json()["user_role"] == "viewer"

    async def test_no_access_403(
        self, authenticated_client: AsyncClient, test_session, admin_user
    ):
        from app.models.project import Project

        project = Project(name="Forbidden", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        resp = await authenticated_client.get(f"/api/projects/{project.id}")
        assert resp.status_code == 403

    async def test_not_found_404(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.get("/api/projects/nonexistent")
        assert resp.status_code == 404


# ============================================================================
# TestUpdateProject
# ============================================================================

class TestUpdateProject:

    async def test_as_owner(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.put(
            f"/api/projects/{test_project.id}",
            json={"name": "Renamed Project"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Project"

    async def test_as_editor(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        project = Project(name="Editor Proj", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="editor", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.put(
            f"/api/projects/{project.id}",
            json={"description": "Updated by editor"}
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated by editor"

    async def test_viewer_403(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        project = Project(name="View Only", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="viewer", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.put(
            f"/api/projects/{project.id}",
            json={"name": "Nope"}
        )
        assert resp.status_code == 403

    async def test_not_found_404(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.put(
            "/api/projects/nonexistent", json={"name": "X"}
        )
        assert resp.status_code == 404


# ============================================================================
# TestDeleteProject
# ============================================================================

class TestDeleteProject:

    async def test_as_owner(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.delete(f"/api/projects/{test_project.id}")
        assert resp.status_code == 204

        # Verify deleted
        resp2 = await authenticated_client.get(f"/api/projects/{test_project.id}")
        assert resp2.status_code == 404

    async def test_editor_403(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        project = Project(name="Undeletable", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="editor", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        resp = await authenticated_client.delete(f"/api/projects/{project.id}")
        assert resp.status_code == 403

    async def test_not_found_404(self, authenticated_client: AsyncClient):
        resp = await authenticated_client.delete("/api/projects/nonexistent")
        assert resp.status_code == 404

    async def test_cascades_artifacts(
        self, authenticated_client: AsyncClient, test_project
    ):
        """Deleting a project cascades to its artifacts."""
        # Create artifact via API
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "playbook", "path": "site.yml"}
        )
        assert create_resp.status_code == 201
        artifact_id = create_resp.json()["id"]

        # Delete project
        resp = await authenticated_client.delete(f"/api/projects/{test_project.id}")
        assert resp.status_code == 204

        # Artifact endpoint should 404 (project gone)
        resp2 = await authenticated_client.get(
            f"/api/projects/{test_project.id}/artifacts/{artifact_id}"
        )
        assert resp2.status_code == 404

    async def test_detaches_playbooks(
        self, authenticated_client: AsyncClient, test_session, test_user, test_project
    ):
        """Deleting a project sets playbook.project_id to null (not deleted)."""
        from app.models.playbook import Playbook
        from sqlalchemy import select

        playbook = Playbook(
            name="Attached PB", content={"plays": []},
            owner_id=test_user.id, project_id=test_project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)
        pb_id = playbook.id

        resp = await authenticated_client.delete(f"/api/projects/{test_project.id}")
        assert resp.status_code == 204

        # Playbook still exists with project_id = None
        test_session.expire_all()
        result = await test_session.execute(
            select(Playbook).where(Playbook.id == pb_id)
        )
        pb = result.scalar_one_or_none()
        assert pb is not None
        assert pb.project_id is None


# ============================================================================
# TestProjectArtifacts
# ============================================================================

class TestProjectArtifacts:

    async def test_create_artifact(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={
                "artifact_type": "playbook",
                "path": "site.yml",
                "raw_content": "---\n- hosts: all\n",
            }
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["artifact_type"] == "playbook"
        assert data["path"] == "site.yml"
        assert data["version"] == 1

    async def test_invalid_type_400(self, authenticated_client: AsyncClient, test_project):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "invalid_type", "path": "x.yml"}
        )
        assert resp.status_code == 400

    async def test_duplicate_path_400(self, authenticated_client: AsyncClient, test_project):
        await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "file", "path": "dup.yml"}
        )
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "file", "path": "dup.yml"}
        )
        assert resp.status_code == 400

    async def test_list_artifacts(self, authenticated_client: AsyncClient, test_project):
        # Create two artifacts
        await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "playbook", "path": "a.yml"}
        )
        await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "role", "path": "roles/myrole"}
        )

        resp = await authenticated_client.get(f"/api/projects/{test_project.id}/artifacts")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    async def test_get_artifact(self, authenticated_client: AsyncClient, test_project):
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "inventory", "path": "hosts.ini"}
        )
        aid = create_resp.json()["id"]

        resp = await authenticated_client.get(
            f"/api/projects/{test_project.id}/artifacts/{aid}"
        )
        assert resp.status_code == 200
        assert resp.json()["path"] == "hosts.ini"

    async def test_update_increments_version(
        self, authenticated_client: AsyncClient, test_project
    ):
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "file", "path": "readme.md"}
        )
        aid = create_resp.json()["id"]
        assert create_resp.json()["version"] == 1

        update_resp = await authenticated_client.put(
            f"/api/projects/{test_project.id}/artifacts/{aid}",
            json={"raw_content": "# Updated"}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["version"] == 2

    async def test_delete_artifact(self, authenticated_client: AsyncClient, test_project):
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/artifacts",
            json={"artifact_type": "template", "path": "tmpl.j2"}
        )
        aid = create_resp.json()["id"]

        resp = await authenticated_client.delete(
            f"/api/projects/{test_project.id}/artifacts/{aid}"
        )
        assert resp.status_code == 204

        # Verify gone
        resp2 = await authenticated_client.get(
            f"/api/projects/{test_project.id}/artifacts/{aid}"
        )
        assert resp2.status_code == 404

    async def test_viewer_can_read_not_write(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare
        from app.models.project_artifact import ProjectArtifact

        project = Project(name="Viewer Proj", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="viewer", created_by=admin_user.id,
        )
        test_session.add(share)

        artifact = ProjectArtifact(
            project_id=project.id, artifact_type="file", path="data.txt",
        )
        test_session.add(artifact)
        await test_session.commit()
        await test_session.refresh(artifact)

        # Viewer can read
        resp = await authenticated_client.get(
            f"/api/projects/{project.id}/artifacts"
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        # Viewer cannot create
        resp2 = await authenticated_client.post(
            f"/api/projects/{project.id}/artifacts",
            json={"artifact_type": "file", "path": "new.txt"}
        )
        assert resp2.status_code == 403


# ============================================================================
# TestProjectShares
# ============================================================================

class TestProjectShares:

    async def test_create_share(
        self, authenticated_client: AsyncClient, test_project, admin_user
    ):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "editor"}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == admin_user.id
        assert data["role"] == "editor"
        assert data["user"]["username"] == "admin"

    async def test_non_owner_403(
        self, authenticated_client: AsyncClient, test_session, test_user, admin_user
    ):
        from app.models.project import Project
        from app.models.project_collaboration import ProjectShare

        project = Project(name="Not Mine", owner_id=admin_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        # Share with test_user as editor (not owner)
        share = ProjectShare(
            project_id=project.id, user_id=test_user.id,
            role="editor", created_by=admin_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        # test_user (editor) tries to share — should fail
        resp = await authenticated_client.post(
            f"/api/projects/{project.id}/shares",
            json={"username": "admin", "role": "viewer"}
        )
        assert resp.status_code == 403

    async def test_self_share_400(
        self, authenticated_client: AsyncClient, test_project
    ):
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "testuser", "role": "viewer"}
        )
        assert resp.status_code == 400

    async def test_duplicate_share_400(
        self, authenticated_client: AsyncClient, test_project, admin_user
    ):
        await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "viewer"}
        )
        resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "editor"}
        )
        assert resp.status_code == 400

    async def test_list_shares(
        self, authenticated_client: AsyncClient, test_project, admin_user
    ):
        await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "viewer"}
        )

        resp = await authenticated_client.get(
            f"/api/projects/{test_project.id}/shares"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["shares"][0]["role"] == "viewer"

    async def test_update_role(
        self, authenticated_client: AsyncClient, test_project, admin_user
    ):
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "viewer"}
        )
        share_id = create_resp.json()["id"]

        resp = await authenticated_client.put(
            f"/api/projects/{test_project.id}/shares/{share_id}",
            json={"role": "editor"}
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "editor"

    async def test_delete_share(
        self, authenticated_client: AsyncClient, test_project, admin_user
    ):
        create_resp = await authenticated_client.post(
            f"/api/projects/{test_project.id}/shares",
            json={"username": "admin", "role": "viewer"}
        )
        share_id = create_resp.json()["id"]

        resp = await authenticated_client.delete(
            f"/api/projects/{test_project.id}/shares/{share_id}"
        )
        assert resp.status_code == 204

        # Verify gone
        resp2 = await authenticated_client.get(
            f"/api/projects/{test_project.id}/shares"
        )
        assert resp2.json()["total"] == 0
