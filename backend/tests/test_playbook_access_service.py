"""
Tests for playbook_access_service — access control with project fallback.

Covers:
- Owner access
- Direct PlaybookShare access
- Project-level access via playbook.project_id
- Project-level access via ProjectArtifact fallback (403 fix)
- Role hierarchy enforcement
- PlaybookCreate with project_id
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.playbook import Playbook
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.project_collaboration import ProjectShare, ProjectRole
from app.models.playbook_collaboration import PlaybookShare, PlaybookRole
from app.services.playbook_access_service import (
    check_playbook_access,
    has_minimum_role,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_collaborator(session) -> User:
    """Create a second user for collaboration tests."""
    user = User(
        email="collab@example.com",
        username="collaborator",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def _make_token(user: User) -> str:
    return create_access_token(data={"sub": user.id, "username": user.username})


# ---------------------------------------------------------------------------
# check_playbook_access — Owner
# ---------------------------------------------------------------------------

class TestOwnerAccess:

    @pytest.mark.asyncio
    async def test_owner_gets_owner_role(self, test_session, test_playbook, test_user):
        """Owner of playbook gets 'owner' role."""
        playbook, role = await check_playbook_access(
            test_playbook.id, test_user.id, test_session,
            raise_on_forbidden=False,
        )
        assert playbook is not None
        assert role == "owner"

    @pytest.mark.asyncio
    async def test_owner_passes_any_required_role(self, test_session, test_playbook, test_user):
        """Owner satisfies any required_role check."""
        playbook, role = await check_playbook_access(
            test_playbook.id, test_user.id, test_session,
            required_role="editor",
        )
        assert role == "owner"


# ---------------------------------------------------------------------------
# check_playbook_access — Not found / No access
# ---------------------------------------------------------------------------

class TestNotFoundAndNoAccess:

    @pytest.mark.asyncio
    async def test_not_found_raises_404(self, test_session, test_user):
        """Non-existent playbook raises 404."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await check_playbook_access(
                "nonexistent-id", test_user.id, test_session,
                raise_on_not_found=True,
            )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_not_found_returns_none(self, test_session, test_user):
        """Non-existent playbook returns (None, None) when raise disabled."""
        playbook, role = await check_playbook_access(
            "nonexistent-id", test_user.id, test_session,
            raise_on_not_found=False,
        )
        assert playbook is None
        assert role is None

    @pytest.mark.asyncio
    async def test_no_access_raises_403(self, test_session, test_playbook):
        """User with no access gets 403."""
        collab = await _create_collaborator(test_session)
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await check_playbook_access(
                test_playbook.id, collab.id, test_session,
                raise_on_forbidden=True,
            )
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_no_access_returns_none(self, test_session, test_playbook):
        """User with no access returns (None, None) when raise disabled."""
        collab = await _create_collaborator(test_session)
        playbook, role = await check_playbook_access(
            test_playbook.id, collab.id, test_session,
            raise_on_forbidden=False,
        )
        assert playbook is None
        assert role is None


# ---------------------------------------------------------------------------
# check_playbook_access — Direct PlaybookShare
# ---------------------------------------------------------------------------

class TestDirectPlaybookShare:

    @pytest.mark.asyncio
    async def test_shared_editor_access(self, test_session, test_playbook, test_user):
        """User shared as editor gets editor role."""
        collab = await _create_collaborator(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=collab.id,
            role=PlaybookRole.EDITOR.value,
            created_by=test_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        playbook, role = await check_playbook_access(
            test_playbook.id, collab.id, test_session,
        )
        assert role == "editor"

    @pytest.mark.asyncio
    async def test_shared_viewer_insufficient_for_editor(self, test_session, test_playbook, test_user):
        """Viewer cannot satisfy required_role=editor."""
        collab = await _create_collaborator(test_session)
        share = PlaybookShare(
            playbook_id=test_playbook.id,
            user_id=collab.id,
            role=PlaybookRole.VIEWER.value,
            created_by=test_user.id,
        )
        test_session.add(share)
        await test_session.commit()

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await check_playbook_access(
                test_playbook.id, collab.id, test_session,
                required_role="editor",
            )
        assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# check_playbook_access — Project-level access via playbook.project_id
# ---------------------------------------------------------------------------

class TestProjectLevelAccessDirect:

    @pytest.mark.asyncio
    async def test_collaborator_access_via_project_id(
        self, test_session, test_user, test_project
    ):
        """Collaborator on project can access playbook with project_id set."""
        # Create playbook with project_id
        playbook = Playbook(
            name="Project Playbook",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=test_project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        # Share project with collaborator
        collab = await _create_collaborator(test_session)
        project_share = ProjectShare(
            project_id=test_project.id,
            user_id=collab.id,
            role=ProjectRole.EDITOR.value,
            created_by=test_user.id,
        )
        test_session.add(project_share)
        await test_session.commit()

        # Collaborator should access playbook via project
        pb, role = await check_playbook_access(
            playbook.id, collab.id, test_session,
        )
        assert pb is not None
        assert role == "editor"

    @pytest.mark.asyncio
    async def test_collaborator_viewer_insufficient_via_project(
        self, test_session, test_user, test_project
    ):
        """Project viewer cannot satisfy required_role=editor on playbook."""
        playbook = Playbook(
            name="Project Playbook",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=test_project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        collab = await _create_collaborator(test_session)
        project_share = ProjectShare(
            project_id=test_project.id,
            user_id=collab.id,
            role=ProjectRole.VIEWER.value,
            created_by=test_user.id,
        )
        test_session.add(project_share)
        await test_session.commit()

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await check_playbook_access(
                playbook.id, collab.id, test_session,
                required_role="editor",
            )
        assert exc.value.status_code == 403


# ---------------------------------------------------------------------------
# check_playbook_access — Project-level access via ProjectArtifact fallback
# ---------------------------------------------------------------------------

class TestProjectArtifactFallback:
    """
    Tests the 403 fix: when playbook.project_id is NULL but a ProjectArtifact
    links the playbook to a project, collaborators should still get access.
    """

    @pytest.mark.asyncio
    async def test_collaborator_access_via_artifact_fallback(
        self, test_session, test_user, test_project
    ):
        """Collaborator accesses playbook via ProjectArtifact when project_id is NULL."""
        # Create playbook WITHOUT project_id
        playbook = Playbook(
            name="Standalone Playbook",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=None,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        # Create a ProjectArtifact linking playbook to project
        artifact = ProjectArtifact(
            project_id=test_project.id,
            artifact_type="playbook",
            path=f"playbooks/{playbook.id}.json",
            content={"playbook_id": playbook.id},
        )
        test_session.add(artifact)

        # Share project with collaborator
        collab = await _create_collaborator(test_session)
        project_share = ProjectShare(
            project_id=test_project.id,
            user_id=collab.id,
            role=ProjectRole.EDITOR.value,
            created_by=test_user.id,
        )
        test_session.add(project_share)
        await test_session.commit()

        # Collaborator should access playbook via artifact fallback
        pb, role = await check_playbook_access(
            playbook.id, collab.id, test_session,
        )
        assert pb is not None
        assert role == "editor"

    @pytest.mark.asyncio
    async def test_no_access_without_project_share(
        self, test_session, test_user, test_project
    ):
        """User without project share cannot access even with artifact existing."""
        playbook = Playbook(
            name="Standalone Playbook",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=None,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        artifact = ProjectArtifact(
            project_id=test_project.id,
            artifact_type="playbook",
            path=f"playbooks/{playbook.id}.json",
            content={"playbook_id": playbook.id},
        )
        test_session.add(artifact)
        await test_session.commit()

        collab = await _create_collaborator(test_session)
        # No project share for collab
        pb, role = await check_playbook_access(
            playbook.id, collab.id, test_session,
            raise_on_forbidden=False,
        )
        assert pb is None
        assert role is None

    @pytest.mark.asyncio
    async def test_no_artifact_no_project_access(
        self, test_session, test_user
    ):
        """Playbook with no project_id and no artifact gives no project-level access."""
        playbook = Playbook(
            name="Fully Standalone",
            content={"plays": []},
            owner_id=test_user.id,
            project_id=None,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        collab = await _create_collaborator(test_session)
        pb, role = await check_playbook_access(
            playbook.id, collab.id, test_session,
            raise_on_forbidden=False,
        )
        assert pb is None
        assert role is None


# ---------------------------------------------------------------------------
# has_minimum_role
# ---------------------------------------------------------------------------

class TestHasMinimumRole:

    def test_owner_exceeds_editor(self):
        assert has_minimum_role("owner", "editor") is True

    def test_editor_meets_editor(self):
        assert has_minimum_role("editor", "editor") is True

    def test_viewer_below_editor(self):
        assert has_minimum_role("viewer", "editor") is False

    def test_viewer_meets_viewer(self):
        assert has_minimum_role("viewer", "viewer") is True

    def test_unknown_role_fails(self):
        assert has_minimum_role("unknown", "viewer") is False


# ---------------------------------------------------------------------------
# PlaybookCreate with project_id — API integration
# ---------------------------------------------------------------------------

SAMPLE_CONTENT = {"plays": [{"name": "play1", "hosts": "all", "tasks": []}]}


class TestCreatePlaybookWithProject:

    @pytest.mark.asyncio
    async def test_create_with_project_id(self, authenticated_client, test_session, test_project):
        """Creating playbook with project_id sets the association."""
        resp = await authenticated_client.post("/api/playbooks", json={
            "name": "In-Project Playbook",
            "description": "desc",
            "content": SAMPLE_CONTENT,
            "project_id": test_project.id,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "In-Project Playbook"
        # project_id is not in PlaybookResponse schema, verify via DB
        from sqlalchemy import select as sa_select
        result = await test_session.execute(
            sa_select(Playbook).where(Playbook.id == data["id"])
        )
        pb = result.scalar_one()
        assert pb.project_id == test_project.id

    @pytest.mark.asyncio
    async def test_create_without_project_id(self, authenticated_client):
        """Creating playbook without project_id is allowed (standalone)."""
        resp = await authenticated_client.post("/api/playbooks", json={
            "name": "Standalone Playbook",
            "description": "desc",
            "content": SAMPLE_CONTENT,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Standalone Playbook"
        assert data.get("project_id") is None

    @pytest.mark.asyncio
    async def test_collaborator_accesses_playbook_in_shared_project(
        self, test_app, test_session, test_user, test_project
    ):
        """Collaborator on shared project can GET a playbook inside that project."""
        # Create playbook in project
        playbook = Playbook(
            name="Shared Project Playbook",
            content=SAMPLE_CONTENT,
            owner_id=test_user.id,
            project_id=test_project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        # Share project with collaborator
        collab = await _create_collaborator(test_session)
        project_share = ProjectShare(
            project_id=test_project.id,
            user_id=collab.id,
            role=ProjectRole.EDITOR.value,
            created_by=test_user.id,
        )
        test_session.add(project_share)
        await test_session.commit()

        # Collaborator GETs the playbook
        token = _make_token(collab)
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.get(f"/api/playbooks/{playbook.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Shared Project Playbook"

    @pytest.mark.asyncio
    async def test_non_collaborator_denied_playbook_in_project(
        self, test_app, test_session, test_user, test_project
    ):
        """User without project access cannot GET a playbook inside that project."""
        playbook = Playbook(
            name="Private Project Playbook",
            content=SAMPLE_CONTENT,
            owner_id=test_user.id,
            project_id=test_project.id,
        )
        test_session.add(playbook)
        await test_session.commit()
        await test_session.refresh(playbook)

        collab = await _create_collaborator(test_session)
        # No project share

        token = _make_token(collab)
        transport = ASGITransport(app=test_app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            resp = await client.get(f"/api/playbooks/{playbook.id}")
        assert resp.status_code == 403
