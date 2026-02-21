"""
Tests for security utilities (password hashing, JWT tokens).
"""

import pytest
from datetime import timedelta
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)


class TestPasswordHashing:

    def test_hash_and_verify(self):
        hashed = get_password_hash("mysecret")
        assert verify_password("mysecret", hashed) is True

    def test_wrong_password(self):
        hashed = get_password_hash("mysecret")
        assert verify_password("wrong", hashed) is False


class TestJWT:

    def test_create_and_decode(self):
        token = create_access_token(data={"sub": "user-123", "username": "alice"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["username"] == "alice"

    def test_decode_invalid_token(self):
        assert decode_access_token("not.a.jwt") is None

    def test_expired_token(self):
        token = create_access_token(
            data={"sub": "user-123"},
            expires_delta=timedelta(seconds=-1),
        )
        assert decode_access_token(token) is None
