"""
Unit tests for ConflictResolutionService.
"""

import pytest

from app.schemas.git_sync import ConflictLevel
from app.services.conflict_resolution_service import ConflictResolutionService


@pytest.fixture
def service():
    return ConflictResolutionService()


# ── Level 0: One-side-only changes ──────────────────────────────


class TestOneSideOnly:

    def test_identical_content(self, service):
        result = service.classify_file("f.yml", "playbook", "base", "same", "same")
        assert result.level == ConflictLevel.ONE_SIDE_ONLY
        assert result.auto_merged is True
        assert result.merged_content == "same"

    def test_only_remote_changed(self, service):
        result = service.classify_file("f.yml", "file", "base", "base", "remote")
        assert result.level == ConflictLevel.ONE_SIDE_ONLY
        assert result.auto_merged is True
        assert result.merged_content == "remote"

    def test_only_local_changed(self, service):
        result = service.classify_file("f.yml", "file", "base", "local", "base")
        assert result.level == ConflictLevel.ONE_SIDE_ONLY
        assert result.auto_merged is True
        assert result.merged_content == "local"

    def test_new_file_only_on_remote(self, service):
        result = service.classify_file("new.yml", "file", None, None, "remote content")
        assert result.level == ConflictLevel.ONE_SIDE_ONLY
        assert result.auto_merged is True
        assert result.merged_content == "remote content"

    def test_new_file_only_on_local(self, service):
        result = service.classify_file("new.yml", "file", None, "local content", None)
        assert result.level == ConflictLevel.ONE_SIDE_ONLY
        assert result.auto_merged is True
        assert result.merged_content == "local content"


# ── Text diff ────────────────────────────────────────────────────


class TestTextDiff:

    def test_non_overlapping_text_changes(self, service):
        base = "line1\nline2\nline3\nline4\nline5\n"
        local = "LINE1\nline2\nline3\nline4\nline5\n"   # changed line 1
        remote = "line1\nline2\nline3\nline4\nLINE5\n"  # changed line 5

        result = service.classify_file("f.txt", "file", base, local, remote)
        assert result.auto_merged is True
        assert result.level == ConflictLevel.DIFFERENT_SECTIONS
        assert "LINE1" in result.merged_content
        assert "LINE5" in result.merged_content

    def test_overlapping_text_changes_conflict(self, service):
        base = "line1\nline2\nline3\n"
        local = "line1\nLOCAL2\nline3\n"
        remote = "line1\nREMOTE2\nline3\n"

        result = service.classify_file("f.txt", "file", base, local, remote)
        assert result.level == ConflictLevel.TRUE_CONFLICT
        assert result.auto_merged is False
        assert result.base_content == base
        assert result.local_content == local
        assert result.remote_content == remote

    def test_local_adds_lines_remote_modifies_different(self, service):
        base = "line1\nline2\n"
        local = "line1\nline2\nnew_local\n"   # added at end
        remote = "REMOTE1\nline2\n"            # modified line 1

        result = service.classify_file("f.txt", "file", base, local, remote)
        assert result.auto_merged is True
        assert "REMOTE1" in result.merged_content
        assert "new_local" in result.merged_content


# ── Playbook structural diff ────────────────────────────────────


class TestPlaybookDiff:

    def test_different_tasks_modified(self, service):
        base = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
"""
        local = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: latest
    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
"""
        remote = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
"""
        result = service.classify_file("site.yml", "playbook", base, local, remote)
        assert result.auto_merged is True
        assert result.level in (ConflictLevel.DIFFERENT_SECTIONS, ConflictLevel.COMPATIBLE_ADDS)

    def test_same_task_modified_both_sides(self, service):
        base = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
"""
        local = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: latest
"""
        remote = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: absent
"""
        result = service.classify_file("site.yml", "playbook", base, local, remote)
        assert result.level == ConflictLevel.TRUE_CONFLICT
        assert result.auto_merged is False

    def test_both_add_different_tasks(self, service):
        base = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
"""
        local = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
    - name: Install curl
      ansible.builtin.apt:
        name: curl
"""
        remote = """- hosts: all
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
    - name: Install git
      ansible.builtin.apt:
        name: git
"""
        result = service.classify_file("site.yml", "playbook", base, local, remote)
        assert result.auto_merged is True
        assert result.level == ConflictLevel.COMPATIBLE_ADDS


# ── Collection requirements diff ────────────────────────────────


class TestCollectionDiff:

    def test_different_collections_added(self, service):
        base = "collections:\n  - name: community.general\n    version: '>=1.0.0'\n"
        local = "collections:\n  - name: community.general\n    version: '>=1.0.0'\n  - name: ansible.posix\n"
        remote = "collections:\n  - name: community.general\n    version: '>=1.0.0'\n  - name: community.crypto\n"

        result = service.classify_file("requirements.yml", "collection_requirements", base, local, remote)
        assert result.auto_merged is True
        assert result.level == ConflictLevel.COMPATIBLE_ADDS

    def test_same_collection_different_versions(self, service):
        base = "collections:\n  - name: community.general\n    version: '>=1.0.0'\n"
        local = "collections:\n  - name: community.general\n    version: '>=2.0.0'\n"
        remote = "collections:\n  - name: community.general\n    version: '>=3.0.0'\n"

        result = service.classify_file("requirements.yml", "collection_requirements", base, local, remote)
        assert result.level == ConflictLevel.TRUE_CONFLICT
        assert result.auto_merged is False


# ── Edge cases ──────────────────────────────────────────────────


class TestEdgeCases:

    def test_empty_base_both_created(self, service):
        result = service.classify_file("f.txt", "file", None, "local", "remote")
        assert result.level == ConflictLevel.TRUE_CONFLICT
        assert result.auto_merged is False

    def test_malformed_yaml_falls_back_to_text(self, service):
        base = "not: valid: yaml: {{{"
        local = "not: valid: yaml: {{{ local"
        remote = "not: valid: yaml: {{{ remote"

        result = service.classify_file("bad.yml", "playbook", base, local, remote)
        # Should fall back to text diff without crashing
        assert result.level in (ConflictLevel.TRUE_CONFLICT, ConflictLevel.DIFFERENT_SECTIONS)
