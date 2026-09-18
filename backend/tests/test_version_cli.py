"""
Tests for scripts/version.py — the X.Y.Z.a versioning CLI (contracts/version-format.md, C-3).

The module lives outside `backend/` (at repo root, `scripts/version.py`) so it can be
used from CI without any Python dependency beyond stdlib. These tests import it
directly and monkeypatch its module-level path constants to point at temporary
copies of the real files, so no test ever touches the actual repository files.

Diff-size assertions enforce the "targeted regex write, never a full rewrite" rule
from the contract: each write must touch only the version line(s) it owns, nothing
else in the file.
"""
import re
import shutil
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import version as version_cli  # noqa: E402  (scripts/version.py)


def _diff_line_count(before: str, after: str) -> int:
    """Number of lines that differ between two texts (line-for-line, same length)."""
    before_lines = before.splitlines()
    after_lines = after.splitlines()
    assert len(before_lines) == len(after_lines), (
        "write helpers must never add/remove lines, only change existing ones"
    )
    return sum(1 for b, a in zip(before_lines, after_lines) if b != a)


@pytest.fixture
def version_files(tmp_path, monkeypatch):
    """Copy the 4 real files into tmp_path and point version_cli at the copies."""
    backend_dir = tmp_path / "backend" / "app"
    frontend_dir = tmp_path / "frontend"
    helm_dir = tmp_path / "helm" / "automation-factory"
    backend_dir.mkdir(parents=True)
    frontend_dir.mkdir(parents=True)
    helm_dir.mkdir(parents=True)

    version_py = backend_dir / "version.py"
    package_json = frontend_dir / "package.json"
    package_lock_json = frontend_dir / "package-lock.json"
    chart_yaml = helm_dir / "Chart.yaml"

    shutil.copy(version_cli.VERSION_PY, version_py)
    shutil.copy(version_cli.PACKAGE_JSON, package_json)
    shutil.copy(version_cli.PACKAGE_LOCK_JSON, package_lock_json)
    shutil.copy(version_cli.CHART_YAML, chart_yaml)

    monkeypatch.setattr(version_cli, "VERSION_PY", version_py)
    monkeypatch.setattr(version_cli, "PACKAGE_JSON", package_json)
    monkeypatch.setattr(version_cli, "PACKAGE_LOCK_JSON", package_lock_json)
    monkeypatch.setattr(version_cli, "CHART_YAML", chart_yaml)

    # Normalize the copies to a known starting version so tests are independent
    # of whatever the real repo files currently contain.
    version_py.write_text(
        re.sub(
            r'__version__\s*=\s*"[^"]+"',
            '__version__ = "2.4.3"',
            version_py.read_text(encoding="utf-8"),
        ),
        encoding="utf-8",
    )
    package_json.write_text(
        re.sub(
            r'"version":\s*"[^"]+"',
            '"version": "2.4.3"',
            package_json.read_text(encoding="utf-8"),
            count=1,
        ),
        encoding="utf-8",
    )
    package_lock_json.write_text(
        re.sub(
            r'"version":\s*"[^"]+"',
            '"version": "2.4.3"',
            package_lock_json.read_text(encoding="utf-8"),
            count=2,
        ),
        encoding="utf-8",
    )
    chart_yaml.write_text(
        re.sub(r"^version:.*$", "version: 2.4.3", chart_yaml.read_text(encoding="utf-8"), flags=re.MULTILINE),
        encoding="utf-8",
    )
    chart_yaml.write_text(
        re.sub(r'^appVersion:.*$', 'appVersion: "2.4.3"', chart_yaml.read_text(encoding="utf-8"), flags=re.MULTILINE),
        encoding="utf-8",
    )

    return {
        "version_py": version_py,
        "package_json": package_json,
        "package_lock_json": package_lock_json,
        "chart_yaml": chart_yaml,
    }


# ---------------------------------------------------------------------------
# split_version
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw, expected_base, expected_build",
    [
        ("2.4.4", "2.4.4", None),
        ("2.4.4.0", "2.4.4", 0),
        ("2.4.4.12", "2.4.4", 12),
    ],
)
def test_split_version(raw, expected_base, expected_build):
    base, build = version_cli.split_version(raw)
    assert base == expected_base
    assert build == expected_build


@pytest.mark.parametrize("invalid", ["2.4", "2.4.4-rc.1", "2.4.4_1", "abc", ""])
def test_split_version_rejects_invalid(invalid):
    with pytest.raises(version_cli.VersionError):
        version_cli.split_version(invalid)


# ---------------------------------------------------------------------------
# start
# ---------------------------------------------------------------------------

def test_start_writes_minimal_diff(version_files):
    before = {k: p.read_text(encoding="utf-8") for k, p in version_files.items()}

    parser = version_cli.build_parser()
    args = parser.parse_args(["start", "2.4.4"])
    assert args.func(args) == 0

    after = {k: p.read_text(encoding="utf-8") for k, p in version_files.items()}

    assert version_cli.read_version_py() == "2.4.4.0"
    assert version_cli.read_package_json() == "2.4.4.0"
    assert version_cli.read_chart_yaml() == ("2.4.4", "2.4.4")

    # version.py carries VERSION_FEATURES etc. — only the __version__ line changes.
    assert _diff_line_count(before["version_py"], after["version_py"]) == 1
    assert _diff_line_count(before["package_json"], after["package_json"]) == 1
    # package-lock.json: root "version" + packages[""].version (contract C-3 rule).
    assert _diff_line_count(before["package_lock_json"], after["package_lock_json"]) == 2
    # Chart.yaml: version: + appVersion: (both documented in C-3's "start" row).
    assert _diff_line_count(before["chart_yaml"], after["chart_yaml"]) == 2


def test_start_rejects_build_segment(version_files):
    parser = version_cli.build_parser()
    args = parser.parse_args(["start", "2.4.4.0"])
    with pytest.raises(version_cli.VersionError):
        args.func(args)


# ---------------------------------------------------------------------------
# bump-build
# ---------------------------------------------------------------------------

def test_bump_build_increments(version_files):
    version_cli.write_version_py("2.4.4.0")
    version_cli.write_package_json("2.4.4.0")
    before_version_py = version_files["version_py"].read_text(encoding="utf-8")
    before_package_json = version_files["package_json"].read_text(encoding="utf-8")

    parser = version_cli.build_parser()
    args = parser.parse_args(["bump-build"])
    assert args.func(args) == 0

    assert version_cli.read_version_py() == "2.4.4.1"
    assert version_cli.read_package_json() == "2.4.4.1"
    assert _diff_line_count(before_version_py, version_files["version_py"].read_text(encoding="utf-8")) == 1
    assert _diff_line_count(before_package_json, version_files["package_json"].read_text(encoding="utf-8")) == 1


def test_bump_build_without_build_segment_errors(version_files):
    # version_files starts at plain "2.4.3" (no 4th segment).
    parser = version_cli.build_parser()
    args = parser.parse_args(["bump-build"])
    with pytest.raises(version_cli.VersionError):
        args.func(args)
    # Must not have mutated the file on failure.
    assert version_cli.read_version_py() == "2.4.3"


# ---------------------------------------------------------------------------
# release
# ---------------------------------------------------------------------------

def test_release_strips_build(version_files):
    version_cli.write_version_py("2.4.4.7")
    version_cli.write_package_json("2.4.4.7")

    parser = version_cli.build_parser()
    args = parser.parse_args(["release"])
    assert args.func(args) == 0

    assert version_cli.read_version_py() == "2.4.4"
    assert version_cli.read_package_json() == "2.4.4"


def test_release_is_idempotent(version_files):
    # version_files starts at plain "2.4.3" (already released, no build segment).
    parser = version_cli.build_parser()
    args = parser.parse_args(["release"])
    assert args.func(args) == 0
    assert version_cli.read_version_py() == "2.4.3"

    # Running it again must still succeed and change nothing.
    args = parser.parse_args(["release"])
    assert args.func(args) == 0
    assert version_cli.read_version_py() == "2.4.3"


# ---------------------------------------------------------------------------
# check
# ---------------------------------------------------------------------------

def test_check_passes_when_consistent(version_files, capsys):
    parser = version_cli.build_parser()
    args = parser.parse_args(["check"])
    assert args.func(args) == 0
    assert "OK" in capsys.readouterr().out


def test_check_fails_on_divergence(version_files):
    version_cli.write_chart_yaml("9.9.9")
    parser = version_cli.build_parser()
    args = parser.parse_args(["check"])
    assert args.func(args) == 1


def test_check_with_matching_tag_passes(version_files):
    parser = version_cli.build_parser()
    args = parser.parse_args(["check", "--tag", "v2.4.3"])
    assert args.func(args) == 0


def test_check_with_mismatched_tag_fails(version_files):
    parser = version_cli.build_parser()
    args = parser.parse_args(["check", "--tag", "v9.9.9"])
    assert args.func(args) == 1


@pytest.mark.parametrize("bad_tag", ["v2.4.4.1", "v2.4.4-rc.1", "2.4.4", "vX.Y.Z"])
def test_check_with_invalid_tag_format_fails(version_files, bad_tag):
    parser = version_cli.build_parser()
    args = parser.parse_args(["check", "--tag", bad_tag])
    assert args.func(args) == 1


# ---------------------------------------------------------------------------
# CRLF preservation (repo working tree is checked out with CRLF line endings on
# this Windows-mounted path — Path.read_text()/write_text() would silently
# translate the WHOLE file to LF on save, which is itself a full-file rewrite
# hidden inside a "1-line" regex change). _read_text/_write_text use
# open(..., newline="") specifically to avoid this.
# ---------------------------------------------------------------------------

def test_write_version_py_preserves_crlf(tmp_path, monkeypatch):
    version_py = tmp_path / "version.py"
    with open(version_py, "wb") as f:
        f.write(b'"""doc"""\r\n__version__ = "2.4.3"\r\nFEATURES = {}\r\n')
    monkeypatch.setattr(version_cli, "VERSION_PY", version_py)

    version_cli.write_version_py("2.4.4.0")

    raw = version_py.read_bytes()
    assert raw == b'"""doc"""\r\n__version__ = "2.4.4.0"\r\nFEATURES = {}\r\n'


def test_write_chart_yaml_preserves_crlf(tmp_path, monkeypatch):
    chart_yaml = tmp_path / "Chart.yaml"
    with open(chart_yaml, "wb") as f:
        f.write(b'apiVersion: v2\r\nversion: 2.4.3\r\nappVersion: "2.4.3"\r\nhome: https://example.com\r\n')
    monkeypatch.setattr(version_cli, "CHART_YAML", chart_yaml)

    version_cli.write_chart_yaml("2.4.4")

    raw = chart_yaml.read_bytes()
    assert raw == (
        b'apiVersion: v2\r\nversion: 2.4.4\r\nappVersion: "2.4.4"\r\nhome: https://example.com\r\n'
    )
