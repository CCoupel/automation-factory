"""
Tests for backend/app/version.py — the X.Y.Z.a versioning scheme.

Covers `parse_version`, `get_display_version` and `get_version_info` across the
ENVIRONMENT x format matrix, plus an integration test of GET /api/version.

See contracts/http-endpoints.md (C-1) and contracts/version-format.md.
"""
import pytest

from app import version as version_module
from app.version import parse_version


# ---------------------------------------------------------------------------
# parse_version
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw, expected_base, expected_build",
    [
        ("2.4.4", "2.4.4", None),          # current scheme, released (no build)
        ("2.4.4.0", "2.4.4", 0),           # current scheme, first build candidate
        ("2.4.4.3", "2.4.4", 3),           # current scheme, build candidate
        ("2.4.3-rc.2", "2.4.3", None),     # legacy, read-only retrocompat
        ("2.3.0_1", "2.3.0", None),        # legacy, read-only retrocompat
        ("not-a-version", "not-a-version", None),  # invalid -> defensive fallback, no crash
        ("", "", None),                    # invalid -> defensive fallback, no crash
    ],
)
def test_parse_version(raw, expected_base, expected_build):
    base, build = parse_version(raw)
    assert base == expected_base
    assert build == expected_build


# ---------------------------------------------------------------------------
# get_display_version — matrix ENVIRONMENT x format
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw, expected_base",
    [
        ("2.4.4", "2.4.4"),
        ("2.4.4.3", "2.4.4"),
        ("2.4.3-rc.2", "2.4.3"),
        ("2.3.0_1", "2.3.0"),
    ],
)
@pytest.mark.parametrize("environment", ["PROD", "STAGING", "DEV"])
def test_get_display_version_matrix(monkeypatch, environment, raw, expected_base):
    monkeypatch.setattr(version_module, "__version__", raw)
    monkeypatch.setattr(version_module, "ENVIRONMENT", environment)

    display = version_module.get_display_version()

    if environment == "PROD":
        # PROD always hides the build segment / legacy RC suffix.
        assert display == expected_base
    else:
        # STAGING/DEV show the raw internal version untouched.
        assert display == raw


# ---------------------------------------------------------------------------
# get_version_info — matrix ENVIRONMENT x format (contract C-1)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "environment, raw, expected",
    [
        # current scheme, released (no build) -> never a build candidate, any env
        ("PROD", "2.4.4", {"version": "2.4.4", "base_version": "2.4.4", "build": None, "is_rc": False, "is_build_candidate": False}),
        ("STAGING", "2.4.4", {"version": "2.4.4", "base_version": "2.4.4", "build": None, "is_rc": False, "is_build_candidate": False}),
        ("DEV", "2.4.4", {"version": "2.4.4", "base_version": "2.4.4", "build": None, "is_rc": False, "is_build_candidate": False}),
        # current scheme, build candidate
        ("PROD", "2.4.4.3", {"version": "2.4.4", "base_version": "2.4.4", "build": 3, "is_rc": False, "is_build_candidate": False}),
        ("STAGING", "2.4.4.3", {"version": "2.4.4.3", "base_version": "2.4.4", "build": 3, "is_rc": True, "is_build_candidate": True}),
        ("DEV", "2.4.4.3", {"version": "2.4.4.3", "base_version": "2.4.4", "build": 3, "is_rc": True, "is_build_candidate": True}),
        # legacy formats: build is always None (retrocompat lecture), so never a build candidate
        ("STAGING", "2.4.3-rc.2", {"version": "2.4.3-rc.2", "base_version": "2.4.3", "build": None, "is_rc": False, "is_build_candidate": False}),
        ("DEV", "2.3.0_1", {"version": "2.3.0_1", "base_version": "2.3.0", "build": None, "is_rc": False, "is_build_candidate": False}),
        ("PROD", "2.4.3-rc.2", {"version": "2.4.3", "base_version": "2.4.3", "build": None, "is_rc": False, "is_build_candidate": False}),
        # invalid format -> defensive fallback, never crashes
        ("STAGING", "garbage", {"version": "garbage", "base_version": "garbage", "build": None, "is_rc": False, "is_build_candidate": False}),
    ],
)
def test_get_version_info_matrix(monkeypatch, environment, raw, expected):
    monkeypatch.setattr(version_module, "__version__", raw)
    monkeypatch.setattr(version_module, "ENVIRONMENT", environment)

    info = version_module.get_version_info()

    for key, value in expected.items():
        assert info[key] == value, f"{key}: got {info[key]!r}, expected {value!r} (env={environment}, raw={raw!r})"
    assert info["internal_version"] == raw
    assert info["environment"] == environment
    assert isinstance(info["features"], dict)


def test_get_version_info_features_lookup(monkeypatch):
    """features must be keyed by base_version, not by the raw internal version."""
    monkeypatch.setattr(version_module, "__version__", "2.3.6.5")
    monkeypatch.setattr(version_module, "ENVIRONMENT", "STAGING")

    info = version_module.get_version_info()

    assert info["base_version"] == "2.3.6"
    assert info["features"] == version_module.VERSION_FEATURES["2.3.6"]


# ---------------------------------------------------------------------------
# Integration: GET /api/version (contract C-1)
# ---------------------------------------------------------------------------

class TestVersionEndpointContract:

    async def test_staging_build_candidate_exposes_all_c1_fields(self, test_client, monkeypatch):
        monkeypatch.setattr(version_module, "__version__", "2.4.4.3")
        monkeypatch.setattr(version_module, "ENVIRONMENT", "STAGING")

        resp = await test_client.get("/api/version")
        assert resp.status_code == 200
        data = resp.json()

        assert data["version"] == "2.4.4.3"
        assert data["base_version"] == "2.4.4"
        assert data["internal_version"] == "2.4.4.3"
        assert data["build"] == 3
        assert data["environment"] == "STAGING"
        assert data["name"] == "Automation Factory API"
        assert "description" in data
        assert data["is_rc"] is True
        assert data["is_build_candidate"] is True
        assert "features" in data

    async def test_prod_hides_build_segment(self, test_client, monkeypatch):
        monkeypatch.setattr(version_module, "__version__", "2.4.4.3")
        monkeypatch.setattr(version_module, "ENVIRONMENT", "PROD")

        resp = await test_client.get("/api/version")
        data = resp.json()

        assert data["version"] == "2.4.4"
        assert data["internal_version"] == "2.4.4.3"  # debug: raw value still exposed
        assert data["build"] == 3
        assert data["is_rc"] is False
        assert data["is_build_candidate"] is False

    async def test_prod_released_version_no_build(self, test_client, monkeypatch):
        monkeypatch.setattr(version_module, "__version__", "2.4.4")
        monkeypatch.setattr(version_module, "ENVIRONMENT", "PROD")

        resp = await test_client.get("/api/version")
        data = resp.json()

        assert data["version"] == "2.4.4"
        assert data["build"] is None
        assert data["is_rc"] is False
        assert data["is_build_candidate"] is False

    async def test_legacy_rc_format_still_readable(self, test_client, monkeypatch):
        monkeypatch.setattr(version_module, "__version__", "2.4.3-rc.2")
        monkeypatch.setattr(version_module, "ENVIRONMENT", "STAGING")

        resp = await test_client.get("/api/version")
        data = resp.json()

        assert data["version"] == "2.4.3-rc.2"
        assert data["base_version"] == "2.4.3"
        assert data["build"] is None
        assert data["is_rc"] is False  # legacy format never reports as a build candidate
        assert data["is_build_candidate"] is False
