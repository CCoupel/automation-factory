"""
Admin Configuration API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
import json
import os
from app.core.dependencies import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/admin/configuration", tags=["admin-configuration"])

# Simple file-based storage for configuration (development)
CONFIG_FILE = "/tmp/admin_configuration.json"

def load_configuration() -> Dict[str, Any]:
    """Load configuration from file"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    
    # Default configuration
    return {
        "standard_namespaces": ["community"]
    }

def save_configuration(config: Dict[str, Any]):
    """Save configuration to file"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

@router.get("/standard-namespaces")
async def get_standard_namespaces(
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    Get current standard namespaces configuration
    
    Returns:
        Dict with namespaces list and metadata
    """
    try:
        config = load_configuration()
        namespaces = config.get("standard_namespaces", ["community"])
        
        return {
            "success": True,
            "namespaces": namespaces,
            "count": len(namespaces),
            "message": f"Retrieved {len(namespaces)} standard namespaces"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load configuration: {str(e)}"
        )

@router.put("/standard-namespaces")
async def update_standard_namespaces(
    request: Dict[str, List[str]],
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    Update standard namespaces configuration
    
    Args:
        request: Dict containing 'namespaces' list
        
    Returns:
        Success message with updated configuration
    """
    try:
        namespaces = request.get("namespaces", [])
        
        # Validate namespaces
        if not isinstance(namespaces, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="namespaces must be a list"
            )
        
        # Validate each namespace format
        for namespace in namespaces:
            if not isinstance(namespace, str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid namespace type: {type(namespace)}. Must be string."
                )
            
            # Basic validation for namespace format
            import re
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', namespace.strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid namespace format: '{namespace}'. Must start with letter and contain only letters, numbers, hyphens, and underscores."
                )
        
        # Remove duplicates and empty strings
        clean_namespaces = list(set([ns.strip() for ns in namespaces if ns.strip()]))
        
        # Load current config and update
        config = load_configuration()
        config["standard_namespaces"] = clean_namespaces
        
        # Save updated configuration
        save_configuration(config)
        
        return {
            "success": True,
            "namespaces": clean_namespaces,
            "count": len(clean_namespaces),
            "message": f"Updated standard namespaces configuration with {len(clean_namespaces)} namespaces",
            "updated_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update configuration: {str(e)}"
        )

@router.get("/info")
async def get_configuration_info(
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    Get general configuration information
    
    Returns:
        Configuration metadata and status
    """
    try:
        config = load_configuration()
        
        return {
            "success": True,
            "message": "Configuration information retrieved",
            "config_file": CONFIG_FILE,
            "config_exists": os.path.exists(CONFIG_FILE),
            "sections": {
                "standard_namespaces": {
                    "count": len(config.get("standard_namespaces", [])),
                    "namespaces": config.get("standard_namespaces", [])
                }
            },
            "last_modified": os.path.getmtime(CONFIG_FILE) if os.path.exists(CONFIG_FILE) else None,
            "admin_user": current_user.username
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration info: {str(e)}"
        )