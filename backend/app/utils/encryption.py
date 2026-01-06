"""
Encryption utilities for secure token storage.

Uses Fernet symmetric encryption (AES-128-CBC) with a key derived from SECRET_KEY.
"""

import base64
import hashlib
import logging
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_encryption_key() -> bytes:
    """
    Derive a Fernet-compatible key from SECRET_KEY.

    Fernet requires a 32-byte base64-encoded key.
    We use SHA256 to get consistent 32 bytes from any SECRET_KEY length.
    """
    key_bytes = settings.SECRET_KEY.encode('utf-8')
    hashed = hashlib.sha256(key_bytes).digest()
    return base64.urlsafe_b64encode(hashed)


def encrypt_token(token: str) -> str:
    """
    Encrypt a token for database storage.

    Args:
        token: Plain text token to encrypt

    Returns:
        Base64-encoded encrypted token string
    """
    if not token:
        return ""

    try:
        fernet = Fernet(get_encryption_key())
        encrypted = fernet.encrypt(token.encode('utf-8'))
        return encrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        raise ValueError("Failed to encrypt token")


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a token from database storage.

    Args:
        encrypted_token: Base64-encoded encrypted token

    Returns:
        Decrypted plain text token

    Raises:
        ValueError: If decryption fails (e.g., key changed)
    """
    if not encrypted_token:
        return ""

    try:
        fernet = Fernet(get_encryption_key())
        decrypted = fernet.decrypt(encrypted_token.encode('utf-8'))
        return decrypted.decode('utf-8')
    except InvalidToken:
        logger.error("Failed to decrypt token - encryption key may have changed")
        raise ValueError("Failed to decrypt token - encryption key may have changed")
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        raise ValueError(f"Failed to decrypt token: {e}")


def mask_token(token: str) -> str:
    """
    Create a masked version of a token for display.

    Shows first 4 and last 4 characters with ... in between.

    Args:
        token: Plain text token to mask

    Returns:
        Masked token string (e.g., "abc1...xyz9")
    """
    if not token:
        return ""

    if len(token) < 8:
        return "****"

    return f"{token[:4]}...{token[-4:]}"
