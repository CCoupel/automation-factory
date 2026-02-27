"""
Git credential CRUD endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.git_credential import GitCredential, GitProvider
from app.schemas.git_credential import (
    GitCredentialCreate, GitCredentialUpdate,
    GitCredentialResponse, GitCredentialListResponse
)
from app.utils.encryption import encrypt_token, decrypt_token, mask_token

router = APIRouter(prefix="/git-credentials", tags=["Git Credentials"])

# Valid provider values
VALID_PROVIDERS = {p.value for p in GitProvider}


def _credential_response(cred: GitCredential) -> GitCredentialResponse:
    """Build response from credential model (never exposes plaintext token)"""
    has_token = bool(cred.token_encrypted)
    token_masked = None
    if has_token:
        try:
            plaintext = decrypt_token(cred.token_encrypted)
            token_masked = mask_token(plaintext)
        except ValueError:
            token_masked = "****"

    return GitCredentialResponse(
        id=cred.id,
        user_id=cred.user_id,
        name=cred.name,
        provider=cred.provider,
        has_token=has_token,
        token_masked=token_masked,
        created_at=cred.created_at,
        updated_at=cred.updated_at,
    )


@router.get("", response_model=GitCredentialListResponse)
async def list_git_credentials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List git credentials owned by the current user.
    """
    result = await db.execute(
        select(GitCredential)
        .where(GitCredential.user_id == current_user.id)
        .order_by(GitCredential.created_at.desc())
    )
    credentials = result.scalars().all()

    return GitCredentialListResponse(
        credentials=[_credential_response(c) for c in credentials],
        total=len(credentials)
    )


@router.post("", response_model=GitCredentialResponse, status_code=status.HTTP_201_CREATED)
async def create_git_credential(
    cred_data: GitCredentialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new git credential. Token is encrypted before storage.
    """
    # Validate provider
    if cred_data.provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider '{cred_data.provider}'. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}"
        )

    credential = GitCredential(
        user_id=current_user.id,
        name=cred_data.name,
        provider=cred_data.provider,
        token_encrypted=encrypt_token(cred_data.token),
    )
    db.add(credential)
    await db.commit()
    await db.refresh(credential)

    return _credential_response(credential)


@router.get("/{credential_id}", response_model=GitCredentialResponse)
async def get_git_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a git credential by ID. Only the owner can access.
    """
    result = await db.execute(
        select(GitCredential).where(GitCredential.id == credential_id)
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Git credential not found"
        )

    if credential.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this credential"
        )

    return _credential_response(credential)


@router.put("/{credential_id}", response_model=GitCredentialResponse)
async def update_git_credential(
    credential_id: str,
    cred_data: GitCredentialUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a git credential. Only the owner can update. Token re-encrypted if changed.
    """
    result = await db.execute(
        select(GitCredential).where(GitCredential.id == credential_id)
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Git credential not found"
        )

    if credential.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this credential"
        )

    update_data = cred_data.model_dump(exclude_unset=True)

    # Validate provider if being updated
    if "provider" in update_data and update_data["provider"] not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider '{update_data['provider']}'. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}"
        )

    # Encrypt token if being updated
    if "token" in update_data:
        credential.token_encrypted = encrypt_token(update_data.pop("token"))

    for field, value in update_data.items():
        setattr(credential, field, value)

    await db.commit()
    await db.refresh(credential)

    return _credential_response(credential)


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_git_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a git credential. Only the owner can delete.
    Projects referencing this credential will have git_credentials_id set to null.
    """
    result = await db.execute(
        select(GitCredential).where(GitCredential.id == credential_id)
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Git credential not found"
        )

    if credential.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this credential"
        )

    await db.delete(credential)
    await db.commit()

    return None
