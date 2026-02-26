"""
Git service for cloning repositories and detecting Ansible project structure.
"""

import asyncio
import logging
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, urlunparse

import yaml
from git import Repo, GitCommandError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project_artifact import ProjectArtifact, ArtifactType
from app.services.yaml_parser_service import YamlParserService

logger = logging.getLogger(__name__)


@dataclass
class DetectedArtifact:
    """A file detected in a cloned repository."""
    path: str
    artifact_type: str
    raw_content: str


class GitService:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.yaml_parser = YamlParserService()

    def _repo_path(self, project_id: str) -> Path:
        return Path(self.data_dir) / "projects" / project_id / "repo"

    def _build_authenticated_url(self, url: str, token: str) -> str:
        """Insert token into URL for authentication (works with GitHub/GitLab/Bitbucket PATs)."""
        parsed = urlparse(url)
        # Replace or add token as username in the URL
        netloc = f"{token}@{parsed.hostname}"
        if parsed.port:
            netloc += f":{parsed.port}"
        return urlunparse(parsed._replace(netloc=netloc))

    async def clone_repository(
        self, url: str, branch: str, project_id: str, token: Optional[str] = None
    ) -> Path:
        """Clone a git repository. Returns the repo path."""
        repo_path = self._repo_path(project_id)

        # Clean up any existing clone
        if repo_path.exists():
            shutil.rmtree(repo_path)

        repo_path.parent.mkdir(parents=True, exist_ok=True)

        clone_url = url
        if token:
            clone_url = self._build_authenticated_url(url, token)

        def _clone():
            Repo.clone_from(clone_url, str(repo_path), branch=branch, depth=1)

        await asyncio.to_thread(_clone)

        return repo_path

    async def detect_structure(self, repo_path: Path) -> list[DetectedArtifact]:
        """Walk the cloned repo and classify files by Ansible conventions."""
        artifacts: list[DetectedArtifact] = []
        roles_seen: set[str] = set()

        for root, dirs, files in os.walk(repo_path):
            # Skip .git directory
            dirs[:] = [d for d in dirs if d != ".git"]

            for filename in files:
                filepath = Path(root) / filename
                rel_path = str(filepath.relative_to(repo_path))

                artifact_type = self._classify_file(rel_path, filename, roles_seen)
                if artifact_type is None:
                    continue

                try:
                    raw_content = filepath.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    continue

                artifacts.append(DetectedArtifact(
                    path=rel_path,
                    artifact_type=artifact_type,
                    raw_content=raw_content,
                ))

        return artifacts

    def _classify_file(
        self, rel_path: str, filename: str, roles_seen: set[str]
    ) -> Optional[str]:
        """Classify a file path into an ArtifactType value or None to skip."""
        parts = Path(rel_path).parts

        # roles/*/tasks/main.yml (and siblings: handlers, defaults, vars, meta, files, templates)
        if len(parts) >= 3 and parts[0] == "roles":
            role_name = parts[1]
            if role_name not in roles_seen:
                roles_seen.add(role_name)
            return ArtifactType.ROLE.value

        # inventory/, hosts, host_vars/, group_vars/
        if parts[0] in ("inventory", "host_vars", "group_vars"):
            return ArtifactType.INVENTORY.value
        if filename in ("hosts", "hosts.ini", "hosts.yml", "hosts.yaml"):
            return ArtifactType.INVENTORY.value

        # templates/**/*.j2
        if parts[0] == "templates" or filename.endswith(".j2"):
            return ArtifactType.TEMPLATE.value

        # vars/**/*.yml, defaults/**/*.yml
        if parts[0] in ("vars", "defaults") and self._is_yaml(filename):
            return ArtifactType.VARIABLE_FILE.value

        # requirements.yml with collections: or roles: key
        if filename == "requirements.yml" or filename == "requirements.yaml":
            return ArtifactType.COLLECTION_REQUIREMENTS.value

        # ansible.cfg
        if filename == "ansible.cfg":
            return ArtifactType.ANSIBLE_CFG.value

        # library/**/*.py, plugins/modules/**/*.py
        if (parts[0] == "library" and filename.endswith(".py")) or \
           (len(parts) >= 3 and parts[0] == "plugins" and parts[1] == "modules" and filename.endswith(".py")):
            return ArtifactType.CUSTOM_MODULE.value

        # Root-level YAML with play-like structure → playbook
        if len(parts) == 1 and self._is_yaml(filename):
            return ArtifactType.PLAYBOOK.value

        # Other YAML/j2/cfg/ini files
        if self._is_yaml(filename) or filename.endswith((".j2", ".cfg", ".ini")):
            return ArtifactType.FILE.value

        # Skip non-relevant files (README, .py scripts, etc.)
        return None

    def _is_yaml(self, filename: str) -> bool:
        return filename.endswith((".yml", ".yaml"))

    def _is_playbook_content(self, raw_content: str) -> bool:
        """Check if YAML content looks like a playbook (list of dicts with 'hosts' key)."""
        try:
            data = yaml.safe_load(raw_content)
            if isinstance(data, list) and len(data) > 0:
                return any(
                    isinstance(item, dict) and "hosts" in item
                    for item in data
                )
        except yaml.YAMLError:
            pass
        return False

    async def import_project(
        self,
        url: str,
        branch: str,
        project_id: str,
        token: Optional[str],
        db: AsyncSession,
    ) -> tuple[list[ProjectArtifact], list[str]]:
        """
        Full import pipeline: clone → detect → parse playbooks → create artifacts.

        Returns (list of created ProjectArtifact, list of warnings).
        """
        warnings: list[str] = []

        # Clone
        repo_path = await self.clone_repository(url, branch, project_id, token)

        # Detect structure
        detected = await self.detect_structure(repo_path)

        # Create artifacts
        db_artifacts: list[ProjectArtifact] = []

        for item in detected:
            content = None

            # For files initially classified as playbook, verify content
            if item.artifact_type == ArtifactType.PLAYBOOK.value:
                if self._is_playbook_content(item.raw_content):
                    # Parse with YamlParserService
                    try:
                        parsed = self.yaml_parser.parse(item.raw_content)
                        if parsed.get("errors"):
                            warnings.append(
                                f"Parse warnings for {item.path}: {'; '.join(parsed['errors'])}"
                            )
                        if parsed.get("warnings"):
                            warnings.extend(
                                f"{item.path}: {w}" for w in parsed["warnings"]
                            )
                        content = parsed
                    except Exception as e:
                        warnings.append(f"Failed to parse {item.path}: {e}")
                else:
                    # Not a playbook, reclassify as generic file
                    item.artifact_type = ArtifactType.FILE.value

            artifact = ProjectArtifact(
                project_id=project_id,
                artifact_type=item.artifact_type,
                path=item.path,
                content=content,
                raw_content=item.raw_content,
            )
            db.add(artifact)
            db_artifacts.append(artifact)

        await db.flush()

        # Clean up cloned repo to save disk space
        try:
            shutil.rmtree(repo_path)
        except Exception as e:
            logger.warning(f"Failed to clean up repo at {repo_path}: {e}")

        return db_artifacts, warnings
