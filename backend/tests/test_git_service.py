"""
Unit tests for GitService — structure detection logic.

Tests use a temporary directory to simulate a cloned repository,
no actual git operations are performed.
"""

import os
import pytest
import pytest_asyncio
import tempfile
from pathlib import Path

from app.services.git_service import GitService, DetectedArtifact
from app.models.project_artifact import ArtifactType


@pytest.fixture
def tmp_repo(tmp_path):
    """Create a temporary directory that simulates a cloned repo."""
    return tmp_path


@pytest.fixture
def git_service(tmp_path):
    """GitService with a temporary data_dir."""
    return GitService(data_dir=str(tmp_path / "data"))


def _write_file(base: Path, rel_path: str, content: str = ""):
    """Helper to create a file in the temp repo."""
    filepath = base / rel_path
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Classification tests
# ---------------------------------------------------------------------------

class TestClassifyFile:
    def test_root_yaml_classified_as_playbook(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("site.yml", "site.yml", roles_seen)
        assert result == ArtifactType.PLAYBOOK.value

    def test_root_yaml_file(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("deploy.yaml", "deploy.yaml", roles_seen)
        assert result == ArtifactType.PLAYBOOK.value

    def test_role_tasks_main(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("roles/webserver/tasks/main.yml", "main.yml", roles_seen)
        assert result == ArtifactType.ROLE.value
        assert "webserver" in roles_seen

    def test_role_handlers(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("roles/db/handlers/main.yml", "main.yml", roles_seen)
        assert result == ArtifactType.ROLE.value

    def test_role_defaults(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("roles/db/defaults/main.yml", "main.yml", roles_seen)
        assert result == ArtifactType.ROLE.value

    def test_inventory_dir(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("inventory/hosts.yml", "hosts.yml", roles_seen)
        assert result == ArtifactType.INVENTORY.value

    def test_hosts_file(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("hosts", "hosts", roles_seen)
        assert result == ArtifactType.INVENTORY.value

    def test_hosts_ini(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("hosts.ini", "hosts.ini", roles_seen)
        assert result == ArtifactType.INVENTORY.value

    def test_host_vars(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("host_vars/web1.yml", "web1.yml", roles_seen)
        assert result == ArtifactType.INVENTORY.value

    def test_group_vars(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("group_vars/all.yml", "all.yml", roles_seen)
        assert result == ArtifactType.INVENTORY.value

    def test_template_j2(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("templates/nginx.conf.j2", "nginx.conf.j2", roles_seen)
        assert result == ArtifactType.TEMPLATE.value

    def test_j2_file_anywhere(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("some/path/config.j2", "config.j2", roles_seen)
        assert result == ArtifactType.TEMPLATE.value

    def test_vars_dir(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("vars/main.yml", "main.yml", roles_seen)
        assert result == ArtifactType.VARIABLE_FILE.value

    def test_defaults_dir(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("defaults/main.yml", "main.yml", roles_seen)
        assert result == ArtifactType.VARIABLE_FILE.value

    def test_requirements_yml(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("requirements.yml", "requirements.yml", roles_seen)
        assert result == ArtifactType.COLLECTION_REQUIREMENTS.value

    def test_ansible_cfg(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("ansible.cfg", "ansible.cfg", roles_seen)
        assert result == ArtifactType.ANSIBLE_CFG.value

    def test_library_module(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("library/my_module.py", "my_module.py", roles_seen)
        assert result == ArtifactType.CUSTOM_MODULE.value

    def test_plugins_modules(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("plugins/modules/my_mod.py", "my_mod.py", roles_seen)
        assert result == ArtifactType.CUSTOM_MODULE.value

    def test_nested_yaml_as_file(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("some/dir/config.yml", "config.yml", roles_seen)
        assert result == ArtifactType.FILE.value

    def test_readme_skipped(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("README.md", "README.md", roles_seen)
        assert result is None

    def test_python_script_skipped(self, git_service):
        roles_seen = set()
        result = git_service._classify_file("scripts/setup.py", "setup.py", roles_seen)
        assert result is None


# ---------------------------------------------------------------------------
# Playbook content detection
# ---------------------------------------------------------------------------

class TestIsPlaybookContent:
    def test_valid_playbook(self, git_service):
        content = "- hosts: all\n  tasks:\n    - debug: msg=hello\n"
        assert git_service._is_playbook_content(content) is True

    def test_not_a_playbook(self, git_service):
        content = "packages:\n  - vim\n  - git\n"
        assert git_service._is_playbook_content(content) is False

    def test_invalid_yaml(self, git_service):
        content = "{{invalid yaml"
        assert git_service._is_playbook_content(content) is False

    def test_empty_list(self, git_service):
        content = "[]"
        assert git_service._is_playbook_content(content) is False


# ---------------------------------------------------------------------------
# Structure detection (full walk)
# ---------------------------------------------------------------------------

class TestDetectStructure:
    @pytest.mark.asyncio
    async def test_detect_ansible_structure(self, git_service, tmp_repo):
        """Detect various Ansible file types in a simulated repo."""
        _write_file(tmp_repo, "site.yml", "- hosts: all\n  tasks:\n    - debug: msg=hi\n")
        _write_file(tmp_repo, "roles/webserver/tasks/main.yml", "- name: Install nginx\n  apt: name=nginx\n")
        _write_file(tmp_repo, "roles/webserver/handlers/main.yml", "- name: Restart nginx\n  service: name=nginx state=restarted\n")
        _write_file(tmp_repo, "inventory/hosts.yml", "all:\n  hosts:\n    web1:\n")
        _write_file(tmp_repo, "group_vars/all.yml", "http_port: 80\n")
        _write_file(tmp_repo, "templates/nginx.conf.j2", "server { listen {{ http_port }}; }\n")
        _write_file(tmp_repo, "vars/main.yml", "packages:\n  - vim\n")
        _write_file(tmp_repo, "requirements.yml", "collections:\n  - community.general\n")
        _write_file(tmp_repo, "ansible.cfg", "[defaults]\nremote_user = deploy\n")
        _write_file(tmp_repo, "library/custom.py", "# custom module\n")
        _write_file(tmp_repo, "README.md", "# My Project\n")

        artifacts = await git_service.detect_structure(tmp_repo)

        types_found = {a.artifact_type for a in artifacts}
        paths = {a.path for a in artifacts}

        assert ArtifactType.PLAYBOOK.value in types_found
        assert ArtifactType.ROLE.value in types_found
        assert ArtifactType.INVENTORY.value in types_found
        assert ArtifactType.TEMPLATE.value in types_found
        assert ArtifactType.VARIABLE_FILE.value in types_found
        assert ArtifactType.COLLECTION_REQUIREMENTS.value in types_found
        assert ArtifactType.ANSIBLE_CFG.value in types_found
        assert ArtifactType.CUSTOM_MODULE.value in types_found

        # README.md should not be included
        assert "README.md" not in paths

    @pytest.mark.asyncio
    async def test_empty_repo(self, git_service, tmp_repo):
        """Empty repo returns no artifacts."""
        artifacts = await git_service.detect_structure(tmp_repo)
        assert artifacts == []


# ---------------------------------------------------------------------------
# Authenticated URL building
# ---------------------------------------------------------------------------

class TestBuildAuthenticatedUrl:
    def test_github_url(self, git_service):
        url = git_service._build_authenticated_url(
            "https://github.com/user/repo.git", "my-token"
        )
        assert url == "https://my-token@github.com/user/repo.git"

    def test_url_with_port(self, git_service):
        url = git_service._build_authenticated_url(
            "https://gitlab.example.com:8443/user/repo.git", "tok"
        )
        assert "tok@gitlab.example.com:8443" in url

    def test_url_with_existing_user(self, git_service):
        url = git_service._build_authenticated_url(
            "https://olduser@github.com/repo.git", "newtoken"
        )
        assert "newtoken@github.com" in url
