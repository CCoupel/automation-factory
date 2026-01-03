"""
Playbook Export Service

Provides unified traversal of playbook structure for all export formats.
This service traverses the frontend Play[] structure following links from START nodes.
"""

from typing import Dict, List, Any, Optional, Set, Callable
from dataclasses import dataclass, field
from enum import Enum


class SectionType(str, Enum):
    """Play section types"""
    PRE_TASKS = "pre_tasks"
    TASKS = "tasks"
    POST_TASKS = "post_tasks"
    HANDLERS = "handlers"


class BlockSectionType(str, Enum):
    """Block section types"""
    NORMAL = "normal"
    RESCUE = "rescue"
    ALWAYS = "always"


@dataclass
class TraversedTask:
    """A traversed task with context"""
    module: Dict[str, Any]
    depth: int
    section: SectionType
    block_section: Optional[BlockSectionType] = None
    parent_block: Optional[Dict[str, Any]] = None


@dataclass
class TraversedBlock:
    """A traversed block with its sections"""
    block: Dict[str, Any]
    depth: int
    section: SectionType
    normal_tasks: List[TraversedTask] = field(default_factory=list)
    rescue_tasks: List[TraversedTask] = field(default_factory=list)
    always_tasks: List[TraversedTask] = field(default_factory=list)


@dataclass
class TraversedSection:
    """A traversed play section"""
    name: SectionType
    start_node: Optional[Dict[str, Any]] = None
    items: List[Any] = field(default_factory=list)  # TraversedTask | TraversedBlock


@dataclass
class TraversedPlay:
    """A traversed play"""
    play: Dict[str, Any]
    index: int
    sections: List[TraversedSection] = field(default_factory=list)


@dataclass
class TraversalResult:
    """Complete traversal result"""
    plays: List[TraversedPlay] = field(default_factory=list)


class PlaybookExportService:
    """
    Service for traversing playbook structure for export.

    The playbook structure from frontend is:
    {
        "plays": [
            {
                "id": "play-1",
                "name": "Play 1",
                "modules": [...],  // All modules including START, tasks, blocks
                "links": [...],    // Links between modules
                "variables": [...],
                "attributes": {...}
            }
        ]
    }
    """

    def traverse(self, plays: List[Dict[str, Any]]) -> TraversalResult:
        """
        Traverse all plays and return structured result.

        Args:
            plays: List of play dictionaries from frontend

        Returns:
            TraversalResult with all plays, sections, and items
        """
        result = TraversalResult()

        for index, play in enumerate(plays):
            traversed_play = self._traverse_play(play, index)
            result.plays.append(traversed_play)

        return result

    def _traverse_play(self, play: Dict[str, Any], index: int) -> TraversedPlay:
        """Traverse a single play"""
        traversed = TraversedPlay(play=play, index=index)

        modules = play.get("modules", [])
        links = play.get("links", [])

        # Build module map for quick lookup
        module_map = {m["id"]: m for m in modules}

        # Traverse each section
        for section_type in SectionType:
            section = self._traverse_section(
                play, section_type, modules, links, module_map
            )
            traversed.sections.append(section)

        return traversed

    def _traverse_section(
        self,
        play: Dict[str, Any],
        section_type: SectionType,
        modules: List[Dict[str, Any]],
        links: List[Dict[str, Any]],
        module_map: Dict[str, Dict[str, Any]]
    ) -> TraversedSection:
        """Traverse a section of a play"""
        section = TraversedSection(name=section_type)

        # Find the START node for this section
        start_node = None
        for m in modules:
            if m.get("isPlay") and m.get("parentSection") == section_type.value:
                start_node = m
                break

        if not start_node:
            return section

        section.start_node = start_node

        # Build adjacency list for this section's links
        adjacency: Dict[str, List[str]] = {}
        for link in links:
            if link.get("type") == section_type.value:
                from_id = link["from"]
                if from_id not in adjacency:
                    adjacency[from_id] = []
                adjacency[from_id].append(link["to"])

        # Traverse from START node
        visited: Set[str] = set()

        def traverse(node_id: str, depth: int):
            if node_id in visited:
                return
            visited.add(node_id)

            next_ids = adjacency.get(node_id, [])
            for next_id in next_ids:
                module = module_map.get(next_id)
                if not module:
                    continue

                # Skip modules inside blocks (handled by block traversal)
                if module.get("parentId"):
                    traverse(next_id, depth)
                    continue

                if module.get("isBlock"):
                    # Traverse block with its sections
                    block = self._traverse_block(
                        module, section_type, modules, links, module_map, depth
                    )
                    section.items.append(block)
                elif not module.get("isPlay"):
                    # Regular task (including system blocks like assertions)
                    task = TraversedTask(
                        module=module,
                        depth=depth,
                        section=section_type
                    )
                    section.items.append(task)

                traverse(next_id, depth)

        traverse(start_node["id"], 0)

        return section

    def _traverse_block(
        self,
        block: Dict[str, Any],
        section_type: SectionType,
        all_modules: List[Dict[str, Any]],
        all_links: List[Dict[str, Any]],
        module_map: Dict[str, Dict[str, Any]],
        depth: int
    ) -> TraversedBlock:
        """Traverse a block and its sections"""
        traversed = TraversedBlock(
            block=block,
            depth=depth,
            section=section_type
        )

        block_sections = block.get("blockSections", {})

        # Process each block section
        for block_section_type in BlockSectionType:
            task_ids = block_sections.get(block_section_type.value, [])
            tasks = []

            for task_id in task_ids:
                module = module_map.get(task_id)
                if module and not module.get("isPlay") and not module.get("isBlock"):
                    task = TraversedTask(
                        module=module,
                        depth=depth + 1,
                        section=section_type,
                        block_section=block_section_type,
                        parent_block=block
                    )
                    tasks.append(task)

            if block_section_type == BlockSectionType.NORMAL:
                traversed.normal_tasks = tasks
            elif block_section_type == BlockSectionType.RESCUE:
                traversed.rescue_tasks = tasks
            elif block_section_type == BlockSectionType.ALWAYS:
                traversed.always_tasks = tasks

        return traversed

    def get_module_label(self, module: Dict[str, Any]) -> str:
        """Get display label for a module"""
        if module.get("isSystem"):
            system_type = module.get("systemType", "system")
            source_var = module.get("sourceVariable", "")
            if source_var:
                return f"Assert: {source_var}"
            return f"[{system_type}]"

        if module.get("isBlock"):
            return module.get("taskName") or module.get("name") or "Block"

        if module.get("isPlay"):
            return "START"

        task_name = module.get("taskName")
        if task_name:
            return task_name

        collection = module.get("collection", "")
        name = module.get("name", "module")
        if collection:
            return f"{collection}.{name}"
        return name

    def get_all_collections(self, plays: List[Dict[str, Any]]) -> List[str]:
        """Get all unique collections used in the playbook"""
        collections: Set[str] = set()

        for play in plays:
            for module in play.get("modules", []):
                collection = module.get("collection")
                if collection and not module.get("isPlay") and not module.get("isSystem"):
                    collections.add(collection)

        return sorted(list(collections))

    def count_modules(self, plays: List[Dict[str, Any]]) -> int:
        """Count total modules across all plays"""
        return sum(len(play.get("modules", [])) for play in plays)

    def count_links(self, plays: List[Dict[str, Any]]) -> int:
        """Count total links across all plays"""
        return sum(len(play.get("links", [])) for play in plays)

    def count_variables(self, plays: List[Dict[str, Any]]) -> int:
        """Count total variables across all plays"""
        return sum(len(play.get("variables", [])) for play in plays)


# Singleton instance
playbook_export_service = PlaybookExportService()
