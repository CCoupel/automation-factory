"""
Return spec endpoints for Ansible roles

Provides inference of return specs from role task scanning.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project_artifact import ProjectArtifact
from app.schemas.return_spec import InferredReturnSpecResponse, ReturnSpecEntry
from app.services.project_access_service import check_project_access
from app.services.return_spec_service import ReturnSpecService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Return Specs"])

return_spec_service = ReturnSpecService()


@router.post(
    "/{project_id}/roles/{role_path:path}/infer-return-specs",
    response_model=InferredReturnSpecResponse,
)
async def infer_return_specs(
    project_id: str,
    role_path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Infer return specs by scanning role tasks for set_fact calls.

    Finds all task artifacts for the given role path and scans them
    for set_fact module usage to infer potential return specifications.

    Args:
        project_id: Project ID
        role_path: Role path prefix (e.g. "roles/webserver")
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    # Find task artifacts for this role
    tasks_path = f"{role_path}/tasks/"
    result = await db.execute(
        select(ProjectArtifact).where(
            and_(
                ProjectArtifact.project_id == project_id,
                ProjectArtifact.artifact_type == "role",
                ProjectArtifact.path.startswith(tasks_path),
            )
        )
    )
    task_artifacts = result.scalars().all()

    if not task_artifacts:
        return InferredReturnSpecResponse(inferred={}, warnings=["No task files found for this role."])

    all_inferred: dict[str, ReturnSpecEntry] = {}
    warnings: list[str] = []

    for artifact in task_artifacts:
        raw = artifact.raw_content
        if not raw:
            warnings.append(f"No content in {artifact.path}")
            continue

        try:
            found = return_spec_service.infer_from_tasks(raw)
            for var_name, var_spec in found.items():
                if var_name in all_inferred:
                    warnings.append(f"Variable '{var_name}' set in multiple task files")
                all_inferred[var_name] = ReturnSpecEntry(**var_spec)
        except Exception as e:
            logger.warning("Error scanning %s: %s", artifact.path, e)
            warnings.append(f"Error scanning {artifact.path}: {str(e)}")

    return InferredReturnSpecResponse(inferred=all_inferred, warnings=warnings)
