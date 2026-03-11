"""
Conflict Resolution Service - Three-way diff engine for YAML sync.

Classifies file conflicts by level:
  0 - ONE_SIDE_ONLY: only one side changed → auto-merge
  1 - DIFFERENT_SECTIONS: both changed different sections → auto-merge
  2 - COMPATIBLE_ADDS: both added at compatible positions → auto-merge
  3 - TRUE_CONFLICT: same element changed differently → manual resolution
"""

import difflib
import logging

import yaml

from app.schemas.git_sync import ConflictLevel, FileSyncStatus
from app.services.collection_service import CollectionService
from app.services.yaml_parser_service import YamlParserService

logger = logging.getLogger(__name__)


class ConflictResolutionService:

    def __init__(self):
        self.yaml_parser = YamlParserService()
        self.collection_service = CollectionService()

    def classify_file(
        self,
        path: str,
        artifact_type: str,
        base: str | None,
        local: str | None,
        remote: str | None,
    ) -> FileSyncStatus:
        """
        Classify a file conflict and attempt auto-merge.

        Args:
            path: relative file path
            artifact_type: e.g. "playbook", "collection_requirements"
            base: content at merge-base (None if file didn't exist)
            local: current local content (None if deleted locally)
            remote: current remote content (None if deleted remotely)
        """
        # If only one side changed, take the changed version
        if local == remote:
            return FileSyncStatus(
                path=path,
                artifact_type=artifact_type,
                level=ConflictLevel.ONE_SIDE_ONLY,
                auto_merged=True,
                merged_content=local,
            )

        local_changed = local != base
        remote_changed = remote != base

        if not local_changed:
            return FileSyncStatus(
                path=path,
                artifact_type=artifact_type,
                level=ConflictLevel.ONE_SIDE_ONLY,
                auto_merged=True,
                merged_content=remote,
            )

        if not remote_changed:
            return FileSyncStatus(
                path=path,
                artifact_type=artifact_type,
                level=ConflictLevel.ONE_SIDE_ONLY,
                auto_merged=True,
                merged_content=local,
            )

        # Both sides changed differently — try structural diff
        if artifact_type == "playbook":
            return self._diff_playbook(path, base, local, remote)
        elif artifact_type == "collection_requirements":
            return self._diff_collection_requirements(path, base, local, remote)
        else:
            return self._text_diff(path, artifact_type, base, local, remote)

    def _diff_playbook(
        self,
        path: str,
        base: str | None,
        local: str | None,
        remote: str | None,
    ) -> FileSyncStatus:
        """Structural diff for Ansible playbooks using task signatures."""
        try:
            base_tasks = self._extract_task_signatures(base) if base else {}
            local_tasks = self._extract_task_signatures(local) if local else {}
            remote_tasks = self._extract_task_signatures(remote) if remote else {}

            # Compute change sets relative to base
            local_added = set(local_tasks.keys()) - set(base_tasks.keys())
            local_removed = set(base_tasks.keys()) - set(local_tasks.keys())
            local_modified = {
                k for k in local_tasks.keys() & base_tasks.keys()
                if local_tasks[k] != base_tasks[k]
            }

            remote_added = set(remote_tasks.keys()) - set(base_tasks.keys())
            remote_removed = set(base_tasks.keys()) - set(remote_tasks.keys())
            remote_modified = {
                k for k in remote_tasks.keys() & base_tasks.keys()
                if remote_tasks[k] != base_tasks[k]
            }

            local_all_changes = local_added | local_removed | local_modified
            remote_all_changes = remote_added | remote_removed | remote_modified

            overlap = local_all_changes & remote_all_changes

            structural_diff = {
                "local_added": sorted(local_added),
                "local_removed": sorted(local_removed),
                "local_modified": sorted(local_modified),
                "remote_added": sorted(remote_added),
                "remote_removed": sorted(remote_removed),
                "remote_modified": sorted(remote_modified),
                "overlapping": sorted(overlap),
            }

            if overlap:
                return FileSyncStatus(
                    path=path,
                    artifact_type="playbook",
                    level=ConflictLevel.TRUE_CONFLICT,
                    auto_merged=False,
                    base_content=base,
                    local_content=local,
                    remote_content=remote,
                    structural_diff=structural_diff,
                )

            # Non-overlapping: auto-merge by applying both change sets to base YAML
            merged = self._merge_playbook_changes(
                base, local, remote, base_tasks, local_tasks, remote_tasks,
                local_added, local_removed, local_modified,
                remote_added, remote_removed, remote_modified,
            )

            level = ConflictLevel.COMPATIBLE_ADDS if (local_added or remote_added) else ConflictLevel.DIFFERENT_SECTIONS

            return FileSyncStatus(
                path=path,
                artifact_type="playbook",
                level=level,
                auto_merged=True,
                merged_content=merged,
                structural_diff=structural_diff,
            )

        except Exception:
            logger.warning("Playbook structural diff failed for %s, falling back to text diff", path)
            return self._text_diff(path, "playbook", base, local, remote)

    def _extract_task_signatures(self, content: str) -> dict[str, str]:
        """
        Extract task signatures from playbook YAML.

        Returns dict mapping task signature (name or module key) to the
        YAML dump of the task dict, for comparison purposes.
        """
        tasks: dict[str, str] = {}
        try:
            docs = yaml.safe_load(content)
            if not isinstance(docs, list):
                return tasks

            for play_idx, play in enumerate(docs):
                if not isinstance(play, dict):
                    continue
                for section in ("pre_tasks", "tasks", "post_tasks", "handlers"):
                    task_list = play.get(section, [])
                    if not isinstance(task_list, list):
                        continue
                    for task_idx, task in enumerate(task_list):
                        if not isinstance(task, dict):
                            continue
                        sig = self._task_signature(task, play_idx, section, task_idx)
                        tasks[sig] = yaml.dump(task, default_flow_style=False, sort_keys=True)
        except yaml.YAMLError:
            pass
        return tasks

    def _task_signature(self, task: dict, play_idx: int, section: str, task_idx: int) -> str:
        """Build a unique signature for a task."""
        name = task.get("name", "")
        if name:
            return f"p{play_idx}:{section}:{name}"
        # Fallback: use position
        return f"p{play_idx}:{section}:#{task_idx}"

    def _merge_playbook_changes(
        self,
        base: str | None,
        local: str | None,
        remote: str | None,
        base_tasks: dict,
        local_tasks: dict,
        remote_tasks: dict,
        local_added: set,
        local_removed: set,
        local_modified: set,
        remote_added: set,
        remote_removed: set,
        remote_modified: set,
    ) -> str:
        """
        Merge non-overlapping playbook changes.

        Strategy: start from base YAML, apply remote changes to the parsed
        structure, then apply local changes. Since there's no overlap this is safe.
        For simplicity, we reconstruct from local version and inject remote-only changes.
        """
        try:
            base_docs = yaml.safe_load(base) if base else []
            local_docs = yaml.safe_load(local) if local else []
            remote_docs = yaml.safe_load(remote) if remote else []

            if not isinstance(base_docs, list):
                base_docs = []
            if not isinstance(local_docs, list):
                local_docs = []
            if not isinstance(remote_docs, list):
                remote_docs = []

            # Start from local version (has local changes already applied)
            merged = local_docs

            # Apply remote modifications to tasks that local didn't touch
            for play_idx, play in enumerate(merged):
                if not isinstance(play, dict):
                    continue
                for section in ("pre_tasks", "tasks", "post_tasks", "handlers"):
                    task_list = play.get(section, [])
                    if not isinstance(task_list, list):
                        continue
                    for task_idx, task in enumerate(task_list):
                        if not isinstance(task, dict):
                            continue
                        sig = self._task_signature(task, play_idx, section, task_idx)
                        if sig in remote_modified:
                            # Replace with remote version
                            remote_task = self._find_task_by_sig(remote_docs, sig, play_idx, section)
                            if remote_task is not None:
                                task_list[task_idx] = remote_task

            # Apply remote removals
            for play_idx, play in enumerate(merged):
                if not isinstance(play, dict):
                    continue
                for section in ("pre_tasks", "tasks", "post_tasks", "handlers"):
                    task_list = play.get(section, [])
                    if not isinstance(task_list, list):
                        continue
                    to_remove = []
                    for task_idx, task in enumerate(task_list):
                        if not isinstance(task, dict):
                            continue
                        sig = self._task_signature(task, play_idx, section, task_idx)
                        if sig in remote_removed:
                            to_remove.append(task_idx)
                    for idx in reversed(to_remove):
                        task_list.pop(idx)

            # Apply remote additions (append to end of relevant section)
            for sig in remote_added:
                parts = sig.split(":", 2)
                if len(parts) < 3:
                    continue
                play_idx = int(parts[0][1:])  # strip 'p'
                section = parts[1]
                remote_task = self._find_task_by_sig(remote_docs, sig, play_idx, section)
                if remote_task is not None and play_idx < len(merged):
                    play = merged[play_idx]
                    if isinstance(play, dict):
                        if section not in play:
                            play[section] = []
                        play[section].append(remote_task)

            return yaml.dump(merged, default_flow_style=False, sort_keys=False)

        except Exception:
            logger.warning("Playbook merge failed, returning local version")
            return local or ""

    def _find_task_by_sig(
        self, docs: list, sig: str, play_idx: int, section: str
    ) -> dict | None:
        """Find a task in docs matching the given signature."""
        if play_idx >= len(docs):
            return None
        play = docs[play_idx]
        if not isinstance(play, dict):
            return None
        task_list = play.get(section, [])
        if not isinstance(task_list, list):
            return None
        for task_idx, task in enumerate(task_list):
            if not isinstance(task, dict):
                continue
            if self._task_signature(task, play_idx, section, task_idx) == sig:
                return task
        return None

    def _diff_collection_requirements(
        self,
        path: str,
        base: str | None,
        local: str | None,
        remote: str | None,
    ) -> FileSyncStatus:
        """Structural diff for requirements.yml using collection/role names."""
        try:
            base_data, _ = self.collection_service.parse(base) if base else (None, [])
            local_data, _ = self.collection_service.parse(local) if local else (None, [])
            remote_data, _ = self.collection_service.parse(remote) if remote else (None, [])

            base_cols = {c.name: c for c in (base_data.collections if base_data else [])}
            local_cols = {c.name: c for c in (local_data.collections if local_data else [])}
            remote_cols = {c.name: c for c in (remote_data.collections if remote_data else [])}

            base_roles = {r.name: r for r in (base_data.roles if base_data else [])}
            local_roles = {r.name: r for r in (local_data.roles if local_data else [])}
            remote_roles = {r.name: r for r in (remote_data.roles if remote_data else [])}

            conflicts = []
            structural_diff = {"collections": {}, "roles": {}}

            # Check collections
            all_col_names = set(local_cols.keys()) | set(remote_cols.keys()) | set(base_cols.keys())
            for name in all_col_names:
                in_base = name in base_cols
                in_local = name in local_cols
                in_remote = name in remote_cols
                local_changed = (not in_base and in_local) or (in_base and in_local and local_cols[name] != base_cols[name])
                remote_changed = (not in_base and in_remote) or (in_base and in_remote and remote_cols[name] != base_cols[name])

                if local_changed and remote_changed:
                    # Both changed same collection
                    if in_local and in_remote and local_cols[name] != remote_cols[name]:
                        conflicts.append(f"collection:{name}")
                        structural_diff["collections"][name] = "conflict"

            # Check roles
            all_role_names = set(local_roles.keys()) | set(remote_roles.keys()) | set(base_roles.keys())
            for name in all_role_names:
                in_base = name in base_roles
                in_local = name in local_roles
                in_remote = name in remote_roles
                local_changed = (not in_base and in_local) or (in_base and in_local and local_roles[name] != base_roles[name])
                remote_changed = (not in_base and in_remote) or (in_base and in_remote and remote_roles[name] != base_roles[name])

                if local_changed and remote_changed:
                    if in_local and in_remote and local_roles[name] != remote_roles[name]:
                        conflicts.append(f"role:{name}")
                        structural_diff["roles"][name] = "conflict"

            if conflicts:
                return FileSyncStatus(
                    path=path,
                    artifact_type="collection_requirements",
                    level=ConflictLevel.TRUE_CONFLICT,
                    auto_merged=False,
                    base_content=base,
                    local_content=local,
                    remote_content=remote,
                    structural_diff=structural_diff,
                )

            # Auto-merge: combine both change sets
            merged = self._merge_requirements(
                base_data, local_data, remote_data,
                base_cols, local_cols, remote_cols,
                base_roles, local_roles, remote_roles,
            )

            return FileSyncStatus(
                path=path,
                artifact_type="collection_requirements",
                level=ConflictLevel.COMPATIBLE_ADDS,
                auto_merged=True,
                merged_content=merged,
                structural_diff=structural_diff,
            )

        except Exception:
            logger.warning("Collection diff failed for %s, falling back to text diff", path)
            return self._text_diff(path, "collection_requirements", base, local, remote)

    def _merge_requirements(
        self, base_data, local_data, remote_data,
        base_cols, local_cols, remote_cols,
        base_roles, local_roles, remote_roles,
    ) -> str:
        """Merge non-conflicting requirements changes."""
        from app.schemas.collection import CollectionRequirement, RequirementsData, RoleRequirement

        # Start from local, add remote-only additions and changes
        merged_cols = dict(local_cols)
        merged_roles = dict(local_roles)

        # Add remote additions/changes not touched by local
        for name, col in remote_cols.items():
            local_changed = name not in base_cols and name in local_cols
            local_modified = name in base_cols and name in local_cols and local_cols[name] != base_cols[name]
            if not local_changed and not local_modified:
                merged_cols[name] = col

        # Remove things remote removed (if local didn't touch them)
        for name in base_cols:
            if name not in remote_cols:
                local_changed = name in local_cols and local_cols[name] != base_cols[name]
                if not local_changed and name in merged_cols:
                    del merged_cols[name]

        # Same for roles
        for name, role in remote_roles.items():
            local_changed = name not in base_roles and name in local_roles
            local_modified = name in base_roles and name in local_roles and local_roles[name] != base_roles[name]
            if not local_changed and not local_modified:
                merged_roles[name] = role

        for name in base_roles:
            if name not in remote_roles:
                local_changed = name in local_roles and local_roles[name] != base_roles[name]
                if not local_changed and name in merged_roles:
                    del merged_roles[name]

        merged_data = RequirementsData(
            collections=list(merged_cols.values()),
            roles=list(merged_roles.values()),
        )
        return self.collection_service.generate(merged_data)

    def _text_diff(
        self,
        path: str,
        artifact_type: str,
        base: str | None,
        local: str | None,
        remote: str | None,
    ) -> FileSyncStatus:
        """Three-way text-level merge using difflib."""
        base_lines = (base or "").splitlines(keepends=True)
        local_lines = (local or "").splitlines(keepends=True)
        remote_lines = (remote or "").splitlines(keepends=True)

        # Get change ranges for each side
        local_opcodes = difflib.SequenceMatcher(None, base_lines, local_lines).get_opcodes()
        remote_opcodes = difflib.SequenceMatcher(None, base_lines, remote_lines).get_opcodes()

        # Build line-level change maps (which base lines each side touched)
        local_changed_lines = set()
        for tag, i1, i2, j1, j2 in local_opcodes:
            if tag != "equal":
                for i in range(i1, max(i2, i1 + 1)):
                    local_changed_lines.add(i)

        remote_changed_lines = set()
        for tag, i1, i2, j1, j2 in remote_opcodes:
            if tag != "equal":
                for i in range(i1, max(i2, i1 + 1)):
                    remote_changed_lines.add(i)

        overlap = local_changed_lines & remote_changed_lines

        structural_diff = {
            "local_changed_lines": sorted(local_changed_lines),
            "remote_changed_lines": sorted(remote_changed_lines),
            "overlapping_lines": sorted(overlap),
        }

        if overlap:
            return FileSyncStatus(
                path=path,
                artifact_type=artifact_type,
                level=ConflictLevel.TRUE_CONFLICT,
                auto_merged=False,
                base_content=base,
                local_content=local,
                remote_content=remote,
                structural_diff=structural_diff,
            )

        # Non-overlapping: merge by applying both diffs
        merged = self._merge_text(base_lines, local_lines, remote_lines, local_opcodes, remote_opcodes)

        return FileSyncStatus(
            path=path,
            artifact_type=artifact_type,
            level=ConflictLevel.DIFFERENT_SECTIONS,
            auto_merged=True,
            merged_content=merged,
            structural_diff=structural_diff,
        )

    def _merge_text(
        self,
        base_lines: list[str],
        local_lines: list[str],
        remote_lines: list[str],
        local_opcodes: list,
        remote_opcodes: list,
    ) -> str:
        """
        Merge non-overlapping text changes.

        Strategy: apply remote changes to base, then apply local changes.
        Since they don't overlap, order doesn't matter.
        """
        # Build a map: base line index → replacement lines from remote
        remote_replacements: dict[int, list[str]] = {}
        remote_deleted: set[int] = set()
        remote_insertions_after: dict[int, list[str]] = {}

        for tag, i1, i2, j1, j2 in remote_opcodes:
            if tag == "replace":
                for i in range(i1, i2):
                    remote_deleted.add(i)
                remote_replacements[i1] = list(remote_lines[j1:j2])
            elif tag == "delete":
                for i in range(i1, i2):
                    remote_deleted.add(i)
            elif tag == "insert":
                remote_insertions_after[i1] = list(remote_lines[j1:j2])

        # Start from local version (already has local changes)
        # But we need to map remote changes onto it
        # Simpler approach: start from base, apply both
        result: list[str] = []
        i = 0
        while i < len(base_lines):
            # Check for remote insertion before this line
            if i in remote_insertions_after and i not in remote_replacements:
                result.extend(remote_insertions_after[i])

            if i in remote_replacements:
                result.extend(remote_replacements[i])
                # Skip all deleted base lines in this replacement
                while i < len(base_lines) and i in remote_deleted:
                    i += 1
            elif i in remote_deleted:
                i += 1
            else:
                result.append(base_lines[i])
                i += 1

        # Handle insertion at end
        if len(base_lines) in remote_insertions_after:
            result.extend(remote_insertions_after[len(base_lines)])

        # Now apply local changes on top of base (since we started from base + remote)
        # Actually, the simpler correct approach: start from local, splice in remote-only changes
        # Let's use a cleaner strategy.

        # Clean approach: use local as base, map remote changes that don't touch local-changed lines
        result = list(local_lines)

        # Map base line positions to local line positions
        base_to_local: dict[int, int] = {}
        for tag, i1, i2, j1, j2 in local_opcodes:
            if tag == "equal":
                for offset in range(i2 - i1):
                    base_to_local[i1 + offset] = j1 + offset

        # Apply remote-only changes by mapping base positions to local positions
        # This is complex; for non-overlapping changes, a simpler approach:
        # rebuild from base, choosing local version for local-changed regions,
        # remote version for remote-changed regions, and base for unchanged.

        result = []
        local_change_map: dict[int, tuple[str, int, int, int, int]] = {}
        for tag, i1, i2, j1, j2 in local_opcodes:
            for i in range(i1, i2):
                local_change_map[i] = (tag, i1, i2, j1, j2)

        remote_change_map: dict[int, tuple[str, int, int, int, int]] = {}
        for tag, i1, i2, j1, j2 in remote_opcodes:
            for i in range(i1, i2):
                remote_change_map[i] = (tag, i1, i2, j1, j2)

        processed_local: set[tuple] = set()
        processed_remote: set[tuple] = set()
        i = 0
        while i < len(base_lines):
            local_op = local_change_map.get(i)
            remote_op = remote_change_map.get(i)

            if local_op and local_op[0] != "equal" and local_op not in processed_local:
                processed_local.add(local_op)
                tag, i1, i2, j1, j2 = local_op
                result.extend(local_lines[j1:j2])
                i = i2
            elif remote_op and remote_op[0] != "equal" and remote_op not in processed_remote:
                processed_remote.add(remote_op)
                tag, i1, i2, j1, j2 = remote_op
                result.extend(remote_lines[j1:j2])
                i = i2
            else:
                result.append(base_lines[i])
                i += 1

        # Handle insertions at end (past base_lines)
        for tag, i1, i2, j1, j2 in local_opcodes:
            if tag == "insert" and i1 == len(base_lines) and (tag, i1, i2, j1, j2) not in processed_local:
                result.extend(local_lines[j1:j2])
        for tag, i1, i2, j1, j2 in remote_opcodes:
            if tag == "insert" and i1 == len(base_lines) and (tag, i1, i2, j1, j2) not in processed_remote:
                result.extend(remote_lines[j1:j2])

        return "".join(result)


# Singleton
conflict_resolution_service = ConflictResolutionService()
