"""
ABD (Ansible Builder Diagram) Exporter

Exports playbook diagrams to the proprietary .abd JSON format.
This format supports full backup/restore with positions, UI state, and integrity checks.
"""

import hashlib
import json
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from dataclasses import dataclass, asdict

from app.services.playbook_export_service import playbook_export_service


# Format constants
DIAGRAM_FORMAT = {
    "MAGIC": "ANSIBLE_BUILDER_DIAGRAM",
    "VERSION": "1.0.0",
    "MIN_APP_VERSION": "2.1.0",
    "FILE_EXTENSION": ".abd",
    "MIME_TYPE": "application/vnd.ansible-builder.diagram+json"
}

# Feature types
FEATURES = [
    "blocks", "roles", "assertions", "handlers",
    "variables", "pre_tasks", "post_tasks", "system_blocks", "collaboration"
]


@dataclass
class ExportOptions:
    """Options for ABD export"""
    include_ui_state: bool = True
    include_integrity: bool = True
    pretty_print: bool = False
    filename: Optional[str] = None


@dataclass
class UIState:
    """UI state to preserve"""
    collapsed_blocks: List[str]
    collapsed_block_sections: List[str]
    collapsed_play_sections: List[str]
    active_play_index: int = 0


class ABDExporter:
    """
    Exporter for Ansible Builder Diagram format.

    The ABD format structure:
    {
        "header": { magic, version, timestamps, generator },
        "metadata": { id, name, description, author, ansible config },
        "content": { plays },
        "uiState": { collapsed blocks, active play },
        "integrity": { checksum, counts },
        "compatibility": { features }
    }
    """

    def export(
        self,
        plays: List[Dict[str, Any]],
        playbook_name: str,
        options: Optional[ExportOptions] = None,
        playbook_id: Optional[str] = None,
        author: Optional[str] = None,
        ui_state: Optional[UIState] = None
    ) -> Dict[str, Any]:
        """
        Export plays to ABD format.

        Args:
            plays: List of play dictionaries
            playbook_name: Name of the playbook
            options: Export options
            playbook_id: Optional playbook ID
            author: Optional author name
            ui_state: Optional UI state to preserve

        Returns:
            ABD format dictionary
        """
        if options is None:
            options = ExportOptions()

        if ui_state is None:
            ui_state = UIState(
                collapsed_blocks=[],
                collapsed_block_sections=[],
                collapsed_play_sections=[],
                active_play_index=0
            )

        now = datetime.utcnow().isoformat() + "Z"
        features = self._detect_features(plays)

        # Build the ABD structure
        abd = {
            "header": self._build_header(now),
            "metadata": self._build_metadata(
                playbook_name, playbook_id, author, plays
            ),
            "content": {
                "plays": plays
            },
            "uiState": self._build_ui_state(ui_state, options),
            "integrity": self._build_integrity(plays, options),
            "compatibility": self._build_compatibility(features)
        }

        return abd

    def export_json(
        self,
        plays: List[Dict[str, Any]],
        playbook_name: str,
        options: Optional[ExportOptions] = None,
        **kwargs
    ) -> str:
        """Export to JSON string"""
        abd = self.export(plays, playbook_name, options, **kwargs)

        if options and options.pretty_print:
            return json.dumps(abd, indent=2, ensure_ascii=False)
        return json.dumps(abd, ensure_ascii=False)

    def _build_header(self, timestamp: str) -> Dict[str, Any]:
        """Build header section"""
        return {
            "magic": DIAGRAM_FORMAT["MAGIC"],
            "formatVersion": DIAGRAM_FORMAT["VERSION"],
            "minAppVersion": DIAGRAM_FORMAT["MIN_APP_VERSION"],
            "createdAt": timestamp,
            "modifiedAt": timestamp,
            "generator": {
                "name": "Ansible Builder",
                "version": DIAGRAM_FORMAT["MIN_APP_VERSION"],
                "platform": "web"
            }
        }

    def _build_metadata(
        self,
        name: str,
        playbook_id: Optional[str],
        author: Optional[str],
        plays: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build metadata section"""
        collections = playbook_export_service.get_all_collections(plays)

        return {
            "id": playbook_id,
            "name": name or "Untitled Playbook",
            "author": author,
            "ansible": {
                "collections": collections
            }
        }

    def _build_ui_state(
        self,
        ui_state: UIState,
        options: ExportOptions
    ) -> Dict[str, Any]:
        """Build UI state section"""
        if not options.include_ui_state:
            return {
                "collapsedBlocks": [],
                "collapsedBlockSections": [],
                "collapsedPlaySections": [],
                "activePlayIndex": 0
            }

        return {
            "collapsedBlocks": ui_state.collapsed_blocks,
            "collapsedBlockSections": ui_state.collapsed_block_sections,
            "collapsedPlaySections": ui_state.collapsed_play_sections,
            "activePlayIndex": ui_state.active_play_index
        }

    def _build_integrity(
        self,
        plays: List[Dict[str, Any]],
        options: ExportOptions
    ) -> Dict[str, Any]:
        """Build integrity section with checksum"""
        checksum = ""
        if options.include_integrity:
            content_str = json.dumps({"plays": plays}, sort_keys=True)
            checksum = hashlib.sha256(content_str.encode()).hexdigest()

        return {
            "checksum": checksum,
            "moduleCount": playbook_export_service.count_modules(plays),
            "linkCount": playbook_export_service.count_links(plays),
            "playCount": len(plays),
            "variableCount": playbook_export_service.count_variables(plays)
        }

    def _build_compatibility(
        self,
        features: List[str]
    ) -> Dict[str, Any]:
        """Build compatibility section"""
        # Essential features that require specific support
        essential = ["blocks", "system_blocks", "assertions"]
        required = [f for f in features if f in essential]

        return {
            "features": features,
            "requiredFeatures": required,
            "deprecatedFields": []
        }

    def _detect_features(self, plays: List[Dict[str, Any]]) -> List[str]:
        """Detect features used in the playbook"""
        features: Set[str] = set()

        for play in plays:
            # Check for variables
            if play.get("variables"):
                features.add("variables")

            # Check for roles
            attrs = play.get("attributes", {})
            if attrs.get("roles"):
                features.add("roles")

            # Check modules
            for module in play.get("modules", []):
                if module.get("isBlock"):
                    features.add("blocks")

                if module.get("isSystem"):
                    features.add("system_blocks")
                    if module.get("systemType") == "assertions":
                        features.add("assertions")

                parent_section = module.get("parentSection")
                if parent_section == "handlers":
                    features.add("handlers")
                elif parent_section == "pre_tasks":
                    features.add("pre_tasks")
                elif parent_section == "post_tasks":
                    features.add("post_tasks")

        return sorted(list(features))


# Singleton instance
abd_exporter = ABDExporter()
