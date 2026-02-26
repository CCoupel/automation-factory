"""
YAML Parser endpoint — converts Ansible YAML to the frontend graph structure.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.yaml_parser import YamlParseRequest, YamlParseResponse
from app.services.yaml_parser_service import yaml_parser_service

router = APIRouter(prefix="/yaml", tags=["YAML Parser"])


@router.post("/parse", response_model=YamlParseResponse)
async def parse_yaml(
    request: YamlParseRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Parse Ansible YAML content into the frontend Play[] graph structure.

    Returns plays with modules, links, variables, and attributes.
    """
    try:
        result = yaml_parser_service.parse(request.yaml_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse YAML: {str(e)}")

    # If the YAML loader reported errors (not warnings), return 400
    if result["errors"] and not result["plays"]:
        raise HTTPException(status_code=400, detail=result["errors"])

    return YamlParseResponse(**result)
