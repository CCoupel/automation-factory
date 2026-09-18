#!/usr/bin/env python3
"""
scripts/version.py — Outil unique de lecture/ecriture du versioning `X.Y.Z.a`.

Source unique de verite pour la version du projet Automation Factory. Toutes les
commandes lisent/ecrivent les fichiers par substitution regex CIBLEE : jamais de
reecriture complete d'un fichier (en particulier `backend/app/version.py`, qui
contient `VERSION_FEATURES`, ~400 lignes de contenu qu'il ne faut jamais ecraser).

Fichiers geres :
  - backend/app/version.py             ligne `__version__ = "X.Y.Z[.a]"` uniquement
  - frontend/package.json              champ racine "version"
  - frontend/package-lock.json         champ "version" racine + packages[""].version
  - helm/automation-factory/Chart.yaml champs `version:` et `appVersion:` (toujours
                                        X.Y.Z, jamais de 4e segment — SemVer strict Helm)

Stdlib Python uniquement (utilisable en CI sans dependance).

Voir contracts/version-format.md pour le contrat complet (commandes, regles, exemples).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VERSION_PY = REPO_ROOT / "backend" / "app" / "version.py"
PACKAGE_JSON = REPO_ROOT / "frontend" / "package.json"
PACKAGE_LOCK_JSON = REPO_ROOT / "frontend" / "package-lock.json"
CHART_YAML = REPO_ROOT / "helm" / "automation-factory" / "Chart.yaml"

# X.Y.Z (base only — Chart.yaml, argument de `start`, tag git)
BASE_ONLY_RE = re.compile(r"^\d+\.\d+\.\d+$")
# X.Y.Z ou X.Y.Z.a (n'importe quel fichier applicatif)
FULL_VERSION_RE = re.compile(r"^(\d+\.\d+\.\d+)(?:\.(\d+))?$")
TAG_RE = re.compile(r"^v\d+\.\d+\.\d+$")


class VersionError(RuntimeError):
    """Erreur de format de version ou de fichier introuvable/invalide."""


def split_version(version: str) -> tuple[str, int | None]:
    """Decompose 'X.Y.Z' ou 'X.Y.Z.a' en (base, build). Leve VersionError sinon."""
    match = FULL_VERSION_RE.match(version)
    if not match:
        raise VersionError(
            f"Format de version invalide : {version!r} (attendu X.Y.Z ou X.Y.Z.a)"
        )
    base = match.group(1)
    build = int(match.group(2)) if match.group(2) is not None else None
    return base, build


# ---------------------------------------------------------------------------
# backend/app/version.py
# ---------------------------------------------------------------------------

_VERSION_PY_RE = re.compile(r'(__version__\s*=\s*")([^"]+)(")')


def read_version_py() -> str:
    text = VERSION_PY.read_text(encoding="utf-8")
    match = _VERSION_PY_RE.search(text)
    if not match:
        raise VersionError(f'Ligne __version__ = "..." introuvable dans {VERSION_PY}')
    return match.group(2)


def write_version_py(new_version: str) -> None:
    text = VERSION_PY.read_text(encoding="utf-8")
    new_text, count = _VERSION_PY_RE.subn(
        lambda m: f"{m.group(1)}{new_version}{m.group(3)}", text, count=1
    )
    if count != 1:
        raise VersionError(f'Ligne __version__ = "..." introuvable dans {VERSION_PY}')
    VERSION_PY.write_text(new_text, encoding="utf-8")


# ---------------------------------------------------------------------------
# frontend/package.json (+ package-lock.json, aligne pour eviter un diff parasite)
# ---------------------------------------------------------------------------

_PACKAGE_VERSION_RE = re.compile(r'("version"\s*:\s*")([^"]+)(")')


def read_package_json() -> str:
    text = PACKAGE_JSON.read_text(encoding="utf-8")
    match = _PACKAGE_VERSION_RE.search(text)
    if not match:
        raise VersionError(f'Champ "version" introuvable dans {PACKAGE_JSON}')
    return match.group(2)


def write_package_json(new_version: str) -> None:
    text = PACKAGE_JSON.read_text(encoding="utf-8")
    new_text, count = _PACKAGE_VERSION_RE.subn(
        lambda m: f"{m.group(1)}{new_version}{m.group(3)}", text, count=1
    )
    if count != 1:
        raise VersionError(f'Champ "version" introuvable dans {PACKAGE_JSON}')
    PACKAGE_JSON.write_text(new_text, encoding="utf-8")

    if PACKAGE_LOCK_JSON.exists():
        lock_text = PACKAGE_LOCK_JSON.read_text(encoding="utf-8")
        # Les 2 premieres occurrences de "version" dans package-lock.json v3 sont
        # toujours le champ racine puis packages[""].version (avant toute entree
        # node_modules/*) — voir contracts/version-format.md.
        new_lock_text, lock_count = _PACKAGE_VERSION_RE.subn(
            lambda m: f"{m.group(1)}{new_version}{m.group(3)}", lock_text, count=2
        )
        if lock_count:
            PACKAGE_LOCK_JSON.write_text(new_lock_text, encoding="utf-8")


# ---------------------------------------------------------------------------
# helm/automation-factory/Chart.yaml
# ---------------------------------------------------------------------------

_CHART_VERSION_LINE_RE = re.compile(r"^(version:\s*).*$", re.MULTILINE)
_CHART_APPVERSION_LINE_RE = re.compile(r"^(appVersion:\s*).*$", re.MULTILINE)
_CHART_VERSION_VALUE_RE = re.compile(r"^version:\s*(\S+)\s*$", re.MULTILINE)
_CHART_APPVERSION_VALUE_RE = re.compile(r'^appVersion:\s*"?([^"\s]+)"?\s*$', re.MULTILINE)


def read_chart_yaml() -> tuple[str, str]:
    text = CHART_YAML.read_text(encoding="utf-8")
    version_match = _CHART_VERSION_VALUE_RE.search(text)
    app_version_match = _CHART_APPVERSION_VALUE_RE.search(text)
    if not version_match or not app_version_match:
        raise VersionError(f"Champs version:/appVersion: introuvables dans {CHART_YAML}")
    return version_match.group(1), app_version_match.group(1)


def write_chart_yaml(base_version: str) -> None:
    text = CHART_YAML.read_text(encoding="utf-8")
    text, n1 = _CHART_VERSION_LINE_RE.subn(rf"\g<1>{base_version}", text, count=1)
    text, n2 = _CHART_APPVERSION_LINE_RE.subn(rf'\g<1>"{base_version}"', text, count=1)
    if n1 != 1 or n2 != 1:
        raise VersionError(f"Champs version:/appVersion: introuvables dans {CHART_YAML}")
    CHART_YAML.write_text(text, encoding="utf-8")


# ---------------------------------------------------------------------------
# Commandes
# ---------------------------------------------------------------------------

def cmd_get(args: argparse.Namespace) -> int:
    raw = read_version_py()
    if args.base:
        base, _ = split_version(raw)
        print(base)
    elif args.build:
        _, build = split_version(raw)
        print("" if build is None else build)
    else:
        print(raw)
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    target = args.version
    if not BASE_ONLY_RE.match(target):
        raise VersionError(f"start attend un format X.Y.Z (sans build) : {target!r}")
    new_version = f"{target}.0"
    write_version_py(new_version)
    write_package_json(new_version)
    write_chart_yaml(target)
    print(new_version)
    return 0


def cmd_bump_build(args: argparse.Namespace) -> int:
    current = read_version_py()
    base, build = split_version(current)
    if build is None:
        raise VersionError(
            f"bump-build impossible : {current!r} n'a pas de 4e segment (build). "
            "Utiliser 'start X.Y.Z' pour ouvrir un cycle, ou verifier qu'un "
            "'release' n'a pas deja ete execute sur cette branche."
        )
    new_version = f"{base}.{build + 1}"
    write_version_py(new_version)
    write_package_json(new_version)
    print(new_version)
    return 0


def cmd_release(args: argparse.Namespace) -> int:
    current = read_version_py()
    base, build = split_version(current)
    if build is None:
        # Idempotent : deja publie (pas de 4e segment), rien a faire.
        print(base)
        return 0
    write_version_py(base)
    write_package_json(base)
    print(base)
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    errors: list[str] = []
    base_version_py: str | None = None
    base_package: str | None = None
    base_chart: str | None = None

    try:
        base_version_py, _ = split_version(read_version_py())
    except VersionError as exc:
        errors.append(str(exc))

    try:
        base_package, _ = split_version(read_package_json())
    except VersionError as exc:
        errors.append(str(exc))

    try:
        chart_version, chart_app_version = read_chart_yaml()
        if not BASE_ONLY_RE.match(chart_version) or not BASE_ONLY_RE.match(chart_app_version):
            errors.append(
                f"Chart.yaml doit etre X.Y.Z (sans 4e segment) : "
                f"version={chart_version!r} appVersion={chart_app_version!r}"
            )
        elif chart_version != chart_app_version:
            errors.append(
                f"Chart.yaml version:({chart_version}) != appVersion:({chart_app_version})"
            )
        else:
            base_chart = chart_version
    except VersionError as exc:
        errors.append(str(exc))

    bases = {b for b in (base_version_py, base_package, base_chart) if b is not None}
    if len(bases) > 1:
        errors.append(
            "Divergence de version de base entre fichiers : "
            f"version.py={base_version_py!r} package.json={base_package!r} Chart.yaml={base_chart!r}"
        )

    if args.tag:
        tag = args.tag
        if not TAG_RE.match(tag):
            errors.append(f"Tag invalide : {tag!r} (attendu vX.Y.Z)")
        else:
            tag_base = tag[1:]
            if bases and tag_base not in bases:
                errors.append(
                    f"Tag {tag!r} (base {tag_base!r}) != version de base des fichiers {sorted(bases)!r}"
                )

    if errors:
        for error in errors:
            print(f"ERREUR: {error}", file=sys.stderr)
        return 1

    print(f"OK: {base_version_py}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Outil unique de lecture/ecriture du versioning X.Y.Z.a (Automation Factory)."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_get = subparsers.add_parser("get", help="Affiche la version brute (__version__)")
    group = p_get.add_mutually_exclusive_group()
    group.add_argument("--base", action="store_true", help="Affiche uniquement X.Y.Z")
    group.add_argument("--build", action="store_true", help="Affiche uniquement le build 'a' (vide si absent)")
    p_get.set_defaults(func=cmd_get)

    p_start = subparsers.add_parser("start", help="Ouvre un cycle : X.Y.Z -> X.Y.Z.0")
    p_start.add_argument("version", help="Version de base du milestone, format X.Y.Z")
    p_start.set_defaults(func=cmd_start)

    p_bump = subparsers.add_parser("bump-build", help="Incremente le build : X.Y.Z.a -> X.Y.Z.(a+1)")
    p_bump.set_defaults(func=cmd_bump_build)

    p_release = subparsers.add_parser("release", help="Retire le build : X.Y.Z.a -> X.Y.Z (idempotent)")
    p_release.set_defaults(func=cmd_release)

    p_check = subparsers.add_parser("check", help="Verifie la coherence version.py/package.json/Chart.yaml")
    p_check.add_argument("--tag", default=None, help="Tag git a verifier, ex. vX.Y.Z")
    p_check.set_defaults(func=cmd_check)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except VersionError as exc:
        print(f"ERREUR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
