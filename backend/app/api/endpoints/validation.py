"""
Variable chain validation endpoint

Validates variable flow across roles in a project playbook.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.variable_validation import (
    VariableChainValidationRequest,
    VariableChainValidationResponse,
)
from app.services.project_access_service import check_project_access
from app.services.variable_chain_validator import VariableChainValidator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Validation"])

validator = VariableChainValidator()


@router.post(
    "/{project_id}/validate-variable-chains",
    response_model=VariableChainValidationResponse,
)
async def validate_variable_chains(
    project_id: str,
    body: VariableChainValidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate variable chains across roles in a playbook.

    Checks that required role arguments are provided, types are compatible,
    and referenced variables are set by upstream roles.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")
    return await validator.validate(project_id, body.playbook_yaml, db)
