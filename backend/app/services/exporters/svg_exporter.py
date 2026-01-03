"""
SVG Exporter

Exports playbook diagrams to SVG vector image format.
Uses actual canvas positions (x, y coordinates) from modules.
"""

from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime
from html import escape

from app.services.playbook_export_service import (
    playbook_export_service,
    SectionType
)


# Color palette
COLORS = {
    "module": "#1976d2",
    "block": "#7b1fa2",
    "play": "#388e3c",
    "system": "#9e9e9e",
    "pre_tasks": "#2196f3",
    "tasks": "#4caf50",
    "post_tasks": "#ff9800",
    "handlers": "#9c27b0",
    "normal": "#7b1fa2",
    "rescue": "#f44336",
    "always": "#2196f3",
    "link_normal": "#666666",
    "link_rescue": "#f44336",
    "link_always": "#2196f3",
    "background": "#ffffff",
    "text": "#333333",
    "text_light": "#666666"
}

# Dimensions
DEFAULT_WIDTH = 200
DEFAULT_HEIGHT = 40
COLLAPSED_BLOCK_HEIGHT = 36
BLOCK_HEADER_HEIGHT = 28
SECTION_HEADER_HEIGHT = 20


@dataclass
class SVGOptions:
    """Options for SVG export"""
    scale: float = 1.0
    padding: int = 20
    background_color: str = "#ffffff"
    collapsed_blocks: Optional[List[str]] = None


class SVGExporter:
    """
    Exporter for SVG vector image format.

    Renders the playbook diagram as an SVG image using
    the actual canvas positions from the frontend.
    """

    def export(
        self,
        plays: List[Dict[str, Any]],
        playbook_name: str,
        options: Optional[SVGOptions] = None
    ) -> str:
        """
        Export plays to SVG format.

        Args:
            plays: List of play dictionaries
            playbook_name: Name of the playbook
            options: Export options

        Returns:
            SVG string
        """
        if options is None:
            options = SVGOptions()

        collapsed_blocks: Set[str] = set(options.collapsed_blocks or [])
        scale = options.scale
        padding = options.padding * scale

        # Calculate dimensions
        svg_width = self._calculate_width(plays, scale)
        elements: List[str] = []

        current_y = padding + 25 * scale

        # Title
        elements.append(self._render_title(playbook_name, padding, scale))

        # Render each play
        for i, play in enumerate(plays):
            play_svg, height = self._render_play(
                play, i, collapsed_blocks, current_y, scale, svg_width
            )
            elements.append(play_svg)
            current_y += height + padding

        total_height = current_y + padding

        # Footer
        elements.append(self._render_footer(padding, total_height, scale))

        # Build SVG
        return self._build_svg(
            svg_width, total_height, options.background_color, elements
        )

    def _build_svg(
        self,
        width: float,
        height: float,
        bg_color: str,
        elements: List[str]
    ) -> str:
        """Build complete SVG document"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"
  viewBox="0 0 {width} {height}">
  <defs><style>text {{ user-select: none; font-family: Arial, sans-serif; }}</style></defs>
  <rect width="100%" height="100%" fill="{bg_color}"/>
  {"".join(elements)}
</svg>'''

    def _render_title(
        self,
        playbook_name: str,
        padding: float,
        scale: float
    ) -> str:
        """Render playbook title"""
        return f'''
    <text x="{padding}" y="{padding + 14 * scale}"
      font-family="Arial, sans-serif" font-size="{15 * scale}" font-weight="bold"
      fill="{COLORS['text']}">{escape(playbook_name or 'Playbook')}</text>'''

    def _render_footer(
        self,
        padding: float,
        total_height: float,
        scale: float
    ) -> str:
        """Render footer with timestamp"""
        date = datetime.utcnow().strftime("%Y-%m-%d")
        return f'''
    <text x="{padding}" y="{total_height - 8 * scale}"
      font-family="Arial, sans-serif" font-size="{9 * scale}"
      fill="{COLORS['text_light']}">Ansible Builder v2.1.0 - {date}</text>'''

    def _render_play(
        self,
        play: Dict[str, Any],
        play_index: int,
        collapsed_blocks: Set[str],
        start_y: float,
        scale: float,
        svg_width: float
    ) -> Tuple[str, float]:
        """Render a play and return (svg, height)"""
        padding = 20 * scale
        header_height = 32 * scale
        font_size = 13 * scale

        elements: List[str] = []
        current_y = start_y

        # Play header
        play_name = play.get("name") or f"Play {play_index + 1}"
        elements.append(f'''
    <rect x="{padding / 2}" y="{current_y}" width="{svg_width - padding}" height="{header_height}"
      fill="{COLORS['play']}15" rx="{6 * scale}"/>
    <text x="{padding}" y="{current_y + header_height / 2 + 5 * scale}"
      font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
      fill="{COLORS['play']}">{escape(play_name)}</text>''')

        current_y += header_height + padding / 2

        # Render each section
        modules = play.get("modules", [])
        links = play.get("links", [])

        for section_name in ["pre_tasks", "tasks", "post_tasks", "handlers"]:
            section_svg, height = self._render_section(
                section_name, modules, links,
                collapsed_blocks, current_y, scale, svg_width
            )
            if section_svg and height > 0:
                elements.append(section_svg)
                current_y += height + padding / 3

        return "".join(elements), current_y - start_y

    def _render_section(
        self,
        section_name: str,
        modules: List[Dict[str, Any]],
        links: List[Dict[str, Any]],
        collapsed_blocks: Set[str],
        offset_y: float,
        scale: float,
        svg_width: float
    ) -> Tuple[str, float]:
        """Render a section and return (svg, height)"""
        # Get top-level modules for this section
        top_level = [
            m for m in modules
            if m.get("parentSection") == section_name and not m.get("parentId")
        ]

        if not top_level:
            return "", 0

        color = self._get_section_color(section_name)
        padding = 20 * scale
        header_height = 24 * scale
        font_size = 11 * scale

        elements: List[str] = []

        # Calculate bounds first to determine total section height
        # Pass all modules to properly calculate block dimensions
        bounds = self._calculate_bounds(top_level, collapsed_blocks, modules)
        if not bounds:
            # Section header only (no content)
            elements.append(f'''
    <rect x="{padding / 2}" y="{offset_y}" width="{svg_width - padding}" height="{header_height}"
      fill="{color}20" rx="{4 * scale}"/>
    <text x="{padding}" y="{offset_y + header_height / 2 + 4 * scale}"
      font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
      fill="{color}">{section_name.replace('_', ' ').upper()}</text>''')
            return "".join(elements), header_height

        # Calculate content dimensions
        content_height = (bounds["max_y"] - bounds["min_y"]) * scale + padding
        total_section_height = header_height + content_height + padding / 2

        # Section background (covers entire section including content)
        elements.append(f'''
    <rect x="{padding / 2}" y="{offset_y}" width="{svg_width - padding}" height="{total_section_height}"
      fill="{color}08" stroke="{color}30" stroke-width="{1 * scale}" rx="{4 * scale}"/>''')

        # Section header
        elements.append(f'''
    <rect x="{padding / 2}" y="{offset_y}" width="{svg_width - padding}" height="{header_height}"
      fill="{color}20" rx="{4 * scale}"/>
    <text x="{padding}" y="{offset_y + header_height / 2 + 4 * scale}"
      font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
      fill="{color}">{section_name.replace('_', ' ').upper()}</text>''')

        # Content positioning
        content_start_y = offset_y + header_height + padding / 2
        translate_x = padding - bounds["min_x"] * scale
        translate_y = content_start_y - bounds["min_y"] * scale

        elements.append(f'<g transform="translate({translate_x}, {translate_y})">')

        # Render links
        top_level_ids = {m["id"] for m in top_level}
        section_links = [
            l for l in links
            if l.get("from") in top_level_ids or l.get("to") in top_level_ids
        ]
        elements.append(self._render_links(section_links, modules, collapsed_blocks, scale))

        # Render modules
        for module in top_level:
            if module.get("isBlock"):
                if module["id"] in collapsed_blocks:
                    elements.append(self._render_block_collapsed(module, scale))
                else:
                    elements.append(self._render_block_expanded(
                        module, modules, links, scale
                    ))
            else:
                elements.append(self._render_task(module, scale))

        elements.append("</g>")

        return "".join(elements), total_section_height

    def _render_task(
        self,
        module: Dict[str, Any],
        scale: float,
        offset_x: float = 0,
        offset_y: float = 0
    ) -> str:
        """Render a task"""
        x = (module.get("x", 0) + offset_x) * scale
        y = (module.get("y", 0) + offset_y) * scale
        width = module.get("width", DEFAULT_WIDTH) * scale
        height = module.get("height", DEFAULT_HEIGHT) * scale
        radius = 4 * scale
        font_size = 11 * scale
        padding = 8 * scale

        label = playbook_export_service.get_module_label(module)
        label = self._truncate(label, width - padding * 2, font_size)

        if module.get("isPlay"):
            fill = COLORS["play"]
            stroke = COLORS["play"]
            text_color = "white"
            font_weight = "bold"
            text_x = x + width / 2
            text_anchor = "middle"
        elif module.get("isSystem"):
            fill = "#f5f5f5"
            stroke = COLORS["system"]
            text_color = COLORS["text_light"]
            font_weight = "normal"
            text_x = x + padding
            text_anchor = "start"
        else:
            fill = "white"
            stroke = COLORS["module"]
            text_color = COLORS["text"]
            font_weight = "normal"
            text_x = x + padding
            text_anchor = "start"

        return f'''
    <g class="task" data-id="{module['id']}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}"
        rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{1.5 * scale}"/>
      <text x="{text_x}" y="{y + height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="{font_weight}"
        fill="{text_color}" text-anchor="{text_anchor}">{escape(label)}</text>
    </g>'''

    def _render_block_collapsed(
        self,
        block: Dict[str, Any],
        scale: float
    ) -> str:
        """Render a collapsed block"""
        x = block.get("x", 0) * scale
        y = block.get("y", 0) * scale
        width = block.get("width", DEFAULT_WIDTH) * scale
        height = COLLAPSED_BLOCK_HEIGHT * scale
        radius = 4 * scale
        font_size = 11 * scale
        padding = 8 * scale

        color = COLORS["system"] if block.get("isSystem") else COLORS["block"]
        label = playbook_export_service.get_module_label(block)
        label = self._truncate(label, width - padding * 4, font_size)
        lock_icon = " [locked]" if block.get("isSystem") else ""
        dash = f'stroke-dasharray="{4 * scale} {2 * scale}"' if block.get("isSystem") else ""

        return f'''
    <g class="block-collapsed" data-id="{block['id']}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}"
        rx="{radius}" fill="{color}15" stroke="{color}" stroke-width="{1.5 * scale}"
        {dash}/>
      <text x="{x + padding}" y="{y + height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
        fill="{color}">{escape(label)}{lock_icon} &gt;</text>
    </g>'''

    def _render_block_expanded(
        self,
        block: Dict[str, Any],
        all_modules: List[Dict[str, Any]],
        all_links: List[Dict[str, Any]],
        scale: float
    ) -> str:
        """Render an expanded block with sections properly laid out"""
        block_x = block.get("x", 0)
        block_y = block.get("y", 0)
        x = block_x * scale
        y = block_y * scale
        # Calculate actual dimensions based on children (handles auto-resize)
        calc_width, calc_height = self._calculate_block_dimensions(block, all_modules)
        width = calc_width * scale
        height = calc_height * scale
        radius = 4 * scale
        font_size = 11 * scale
        padding = 8 * scale
        header_height = BLOCK_HEADER_HEIGHT * scale
        section_header_height = SECTION_HEADER_HEIGHT * scale
        task_height = DEFAULT_HEIGHT * scale
        task_spacing = 8 * scale

        color = COLORS["system"] if block.get("isSystem") else COLORS["block"]
        label = playbook_export_service.get_module_label(block)
        label = self._truncate(label, width - padding * 3, font_size)
        lock_icon = " [locked]" if block.get("isSystem") else ""
        dash = f'stroke-dasharray="{4 * scale} {2 * scale}"' if block.get("isSystem") else ""

        elements: List[str] = []

        # Block container
        elements.append(f'''
    <g class="block-expanded" data-id="{block['id']}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}"
        rx="{radius}" fill="{color}05" stroke="{color}" stroke-width="{1.5 * scale}"
        {dash}/>
      <rect x="{x}" y="{y}" width="{width}" height="{header_height}"
        rx="{radius}" fill="{color}20"/>
      <text x="{x + padding}" y="{y + header_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
        fill="{color}">{escape(label)}{lock_icon} v</text>
    </g>''')

        # Get block sections
        block_sections = block.get("blockSections", {})
        module_map = {m["id"]: m for m in all_modules}

        sections_config = [
            ("normal", "BLOCK", COLORS["normal"], block_sections.get("normal", [])),
            ("rescue", "RESCUE", COLORS["rescue"], block_sections.get("rescue", [])),
            ("always", "ALWAYS", COLORS["always"], block_sections.get("always", []))
        ]

        # Calculate section heights and layout
        current_section_y = y + header_height + 4 * scale
        start_node_width = 120 * scale
        start_node_height = 30 * scale

        for section_key, section_label, section_color, task_ids in sections_config:
            children = [module_map.get(tid) for tid in task_ids if module_map.get(tid)]

            if not children:
                continue

            # Section header
            elements.append(f'''
    <rect x="{x + 4 * scale}" y="{current_section_y}"
      width="{width - 8 * scale}" height="{section_header_height}"
      fill="{section_color}20" rx="{2 * scale}"/>
    <text x="{x + padding}" y="{current_section_y + section_header_height / 2 + 4 * scale}"
      font-family="Arial, sans-serif" font-size="{9 * scale}" font-weight="bold"
      fill="{section_color}">{section_label}</text>''')

            current_section_y += section_header_height + task_spacing

            # START node as full task
            start_x = x + 10 * scale
            start_y = current_section_y
            elements.append(f'''
    <g class="task" data-id="{block['id']}-{section_key}-start">
      <rect x="{start_x}" y="{start_y}" width="{start_node_width}" height="{start_node_height}"
        rx="{radius}" fill="{section_color}" stroke="{section_color}" stroke-width="{1.5 * scale}"/>
      <text x="{start_x + start_node_width / 2}" y="{start_y + start_node_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
        fill="white" text-anchor="middle">START</text>
    </g>''')

            current_section_y += start_node_height + task_spacing

            # Track positions for links
            task_x = x + 10 * scale
            prev_element = {
                "x": start_x,
                "y": start_y,
                "width": start_node_width,
                "height": start_node_height,
                "id": f"{block['id']}-{section_key}-start"
            }

            # Render children at their ORIGINAL positions (relative to block)
            for i, child in enumerate(children):
                if child:
                    # Use original position relative to block
                    child_x = x + child.get("x", 0) * scale
                    child_y = y + child.get("y", 0) * scale
                    child_width = child.get("width", DEFAULT_WIDTH) * scale
                    child_height = child.get("height", DEFAULT_HEIGHT) * scale

                    # Check if child is a nested block
                    if child.get("isBlock"):
                        # Calculate actual block dimensions based on its children
                        calc_w, calc_h = self._calculate_block_dimensions(child, all_modules)
                        block_width = calc_w * scale
                        block_height = calc_h * scale

                        # Draw link from previous element to this block
                        elements.append(self._render_single_link(
                            prev_element["x"], prev_element["y"],
                            prev_element["width"], prev_element["height"],
                            child_x, child_y,
                            block_width, block_height,
                            section_color, scale, f"link_{prev_element['id']}_{child['id']}"
                        ))

                        # Render nested block at its original position with calculated size
                        elements.append(self._render_nested_block(
                            child, all_modules, all_links, scale,
                            child_x, child_y, section_color
                        ))

                        prev_element = {
                            "x": child_x,
                            "y": child_y,
                            "width": block_width,
                            "height": block_height,
                            "id": child['id']
                        }
                    else:
                        child_label = playbook_export_service.get_module_label(child)
                        child_label = self._truncate(child_label, child_width - padding * 2, font_size)

                        # Draw link from previous element to this task
                        elements.append(self._render_single_link(
                            prev_element["x"], prev_element["y"],
                            prev_element["width"], prev_element["height"],
                            child_x, child_y,
                            child_width, child_height,
                            section_color, scale, f"link_{prev_element['id']}_{child['id']}"
                        ))

                        # Render task at its ORIGINAL position
                        elements.append(f'''
    <g class="task" data-id="{child['id']}">
      <rect x="{child_x}" y="{child_y}" width="{child_width}" height="{child_height}"
        rx="{radius}" fill="white" stroke="{section_color}" stroke-width="{1.5 * scale}"/>
      <text x="{child_x + padding}" y="{child_y + child_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="normal"
        fill="{COLORS['text']}" text-anchor="start">{escape(child_label)}</text>
    </g>''')

                        prev_element = {
                            "x": child_x,
                            "y": child_y,
                            "width": child_width,
                            "height": child_height,
                            "id": child['id']
                        }

        return "".join(elements)

    def _render_single_link(
        self,
        from_x: float, from_y: float,
        from_width: float, from_height: float,
        to_x: float, to_y: float,
        to_width: float, to_height: float,
        color: str, scale: float,
        link_id: str
    ) -> str:
        """Render a single link between two elements"""
        arrow_size = 6 * scale

        # Calculate connection points (bottom of source, top of target)
        start_x = from_x + from_width / 2
        start_y = from_y + from_height
        end_x = to_x + to_width / 2
        end_y = to_y

        # Vertical link with slight curve
        mid_y = (start_y + end_y) / 2

        return f'''
      <defs>
        <marker id="{link_id}" markerWidth="{arrow_size}" markerHeight="{arrow_size}"
          refX="{arrow_size - 1}" refY="{arrow_size / 2}" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, {arrow_size} {arrow_size / 2}, 0 {arrow_size}" fill="{color}"/>
        </marker>
      </defs>
      <path d="M {start_x} {start_y} C {start_x} {mid_y}, {end_x} {mid_y}, {end_x} {end_y}"
        fill="none" stroke="{color}" stroke-width="{1.5 * scale}"
        marker-end="url(#{link_id})" />'''

    def _render_nested_block(
        self,
        block: Dict[str, Any],
        all_modules: List[Dict[str, Any]],
        all_links: List[Dict[str, Any]],
        scale: float,
        x: float,
        y: float,
        parent_color: str
    ) -> str:
        """Render a nested block within a parent block section"""
        # Calculate actual dimensions based on children (handles auto-resize)
        calc_width, calc_height = self._calculate_block_dimensions(block, all_modules)
        width = calc_width * scale
        height = calc_height * scale
        radius = 4 * scale
        font_size = 11 * scale
        padding = 8 * scale
        header_height = BLOCK_HEADER_HEIGHT * scale
        section_header_height = SECTION_HEADER_HEIGHT * scale
        task_height = DEFAULT_HEIGHT * scale
        task_spacing = 8 * scale
        start_node_width = 100 * scale
        start_node_height = 24 * scale

        color = COLORS["block"]
        label = playbook_export_service.get_module_label(block)
        label = self._truncate(label, width - padding * 3, font_size)

        elements: List[str] = []

        # Nested block container
        elements.append(f'''
    <g class="block-nested" data-id="{block['id']}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}"
        rx="{radius}" fill="{color}08" stroke="{color}" stroke-width="{1.5 * scale}"/>
      <rect x="{x}" y="{y}" width="{width}" height="{header_height}"
        rx="{radius}" fill="{color}25"/>
      <text x="{x + padding}" y="{y + header_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="bold"
        fill="{color}">{escape(label)} v</text>
    </g>''')

        # Get nested block sections
        block_sections = block.get("blockSections", {})
        module_map = {m["id"]: m for m in all_modules}

        sections_config = [
            ("normal", "BLOCK", COLORS["normal"]),
            ("rescue", "RESCUE", COLORS["rescue"]),
            ("always", "ALWAYS", COLORS["always"])
        ]

        current_y = y + header_height + 4 * scale

        for section_key, section_label, section_color in sections_config:
            task_ids = block_sections.get(section_key, [])
            children = [module_map.get(tid) for tid in task_ids if module_map.get(tid)]

            if not children:
                continue

            # Section header
            elements.append(f'''
    <rect x="{x + 4 * scale}" y="{current_y}"
      width="{width - 8 * scale}" height="{section_header_height}"
      fill="{section_color}20" rx="{2 * scale}"/>
    <text x="{x + padding}" y="{current_y + section_header_height / 2 + 4 * scale}"
      font-family="Arial, sans-serif" font-size="{9 * scale}" font-weight="bold"
      fill="{section_color}">{section_label}</text>''')

            current_y += section_header_height + task_spacing

            # START node
            start_x = x + 8 * scale
            start_y = current_y
            elements.append(f'''
    <g class="task" data-id="{block['id']}-{section_key}-start">
      <rect x="{start_x}" y="{start_y}" width="{start_node_width}" height="{start_node_height}"
        rx="{radius}" fill="{section_color}" stroke="{section_color}" stroke-width="{1.5 * scale}"/>
      <text x="{start_x + start_node_width / 2}" y="{start_y + start_node_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{10 * scale}" font-weight="bold"
        fill="white" text-anchor="middle">START</text>
    </g>''')

            current_y += start_node_height + task_spacing

            # Track positions for links
            task_x = x + 8 * scale
            prev_element = {
                "x": start_x,
                "y": start_y,
                "width": start_node_width,
                "height": start_node_height,
                "id": f"{block['id']}-{section_key}-start"
            }

            # Render children at their ORIGINAL positions
            for child in children:
                if child:
                    # Use original position relative to this nested block
                    child_x = x + child.get("x", 0) * scale
                    child_y = y + child.get("y", 0) * scale
                    child_width = child.get("width", DEFAULT_WIDTH) * scale
                    child_height = child.get("height", DEFAULT_HEIGHT) * scale
                    child_label = playbook_export_service.get_module_label(child)
                    child_label = self._truncate(child_label, child_width - padding * 2, font_size)

                    # Draw link from previous element
                    elements.append(self._render_single_link(
                        prev_element["x"], prev_element["y"],
                        prev_element["width"], prev_element["height"],
                        child_x, child_y,
                        child_width, child_height,
                        section_color, scale, f"link_{prev_element['id']}_{child['id']}"
                    ))

                    elements.append(f'''
    <g class="task" data-id="{child['id']}">
      <rect x="{child_x}" y="{child_y}" width="{child_width}" height="{child_height}"
        rx="{radius}" fill="white" stroke="{section_color}" stroke-width="{1.5 * scale}"/>
      <text x="{child_x + padding}" y="{child_y + child_height / 2 + font_size / 3}"
        font-family="Arial, sans-serif" font-size="{font_size}" font-weight="normal"
        fill="{COLORS['text']}" text-anchor="start">{escape(child_label)}</text>
    </g>''')

                    prev_element = {
                        "x": child_x,
                        "y": child_y,
                        "width": child_width,
                        "height": child_height,
                        "id": child['id']
                    }

        return "".join(elements)

    def _calculate_block_dimensions(
        self,
        block: Dict[str, Any],
        all_modules: List[Dict[str, Any]]
    ) -> Tuple[float, float]:
        """
        Calculate the required dimensions for a block based on its children positions.
        Returns (width, height) in canvas units (not scaled).
        Uses the maximum of stored dimensions and calculated bounds from children.
        """
        block_sections = block.get("blockSections", {})
        module_map = {m["id"]: m for m in all_modules}

        # Start with stored dimensions
        stored_width = block.get("width", DEFAULT_WIDTH)
        stored_height = block.get("height", 200)

        max_child_x = 0
        max_child_y = 0

        for section_key in ["normal", "rescue", "always"]:
            task_ids = block_sections.get(section_key, [])
            children = [module_map.get(tid) for tid in task_ids if module_map.get(tid)]

            for child in children:
                if child:
                    # Child position is relative to block
                    cx = child.get("x", 0)
                    cy = child.get("y", 0)

                    # For nested blocks, recursively calculate their dimensions
                    if child.get("isBlock"):
                        cw, ch = self._calculate_block_dimensions(child, all_modules)
                    else:
                        cw = child.get("width", DEFAULT_WIDTH)
                        ch = child.get("height", DEFAULT_HEIGHT)

                    max_child_x = max(max_child_x, cx + cw)
                    max_child_y = max(max_child_y, cy + ch)

        # Add padding for block border
        padding = 20
        required_width = max_child_x + padding if max_child_x > 0 else stored_width
        required_height = max_child_y + padding if max_child_y > 0 else stored_height

        # Return the maximum of stored and required dimensions
        return (
            max(stored_width, required_width),
            max(stored_height, required_height)
        )

    def _render_links(
        self,
        links: List[Dict[str, Any]],
        modules: List[Dict[str, Any]],
        collapsed_blocks: Set[str],
        scale: float,
        offset_x: float = 0,
        offset_y: float = 0
    ) -> str:
        """Render links between modules"""
        elements: List[str] = []
        module_map = {m["id"]: m for m in modules}
        arrow_size = 6 * scale

        for link in links:
            from_module = module_map.get(link.get("from"))
            to_module = module_map.get(link.get("to"))

            if not from_module or not to_module:
                continue

            from_height = self._get_effective_height(from_module, collapsed_blocks)
            to_height = self._get_effective_height(to_module, collapsed_blocks)

            from_x = (from_module.get("x", 0) + offset_x + from_module.get("width", DEFAULT_WIDTH)) * scale
            from_y = (from_module.get("y", 0) + offset_y + from_height / 2) * scale
            to_x = (to_module.get("x", 0) + offset_x) * scale
            to_y = (to_module.get("y", 0) + offset_y + to_height / 2) * scale

            color = self._get_link_color(link.get("type"))
            dx = to_x - from_x
            cp_offset = max(20 * scale, abs(dx) * 0.3)
            marker_id = f"arr_{link['from'][-6:]}_{link['to'][-6:]}"
            is_dashed = link.get("type") == "rescue"

            dash_attr = f'stroke-dasharray="{4 * scale} {2 * scale}"' if is_dashed else ""

            elements.append(f'''
      <defs>
        <marker id="{marker_id}" markerWidth="{arrow_size}" markerHeight="{arrow_size}"
          refX="{arrow_size - 1}" refY="{arrow_size / 2}" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, {arrow_size} {arrow_size / 2}, 0 {arrow_size}" fill="{color}"/>
        </marker>
      </defs>
      <path d="M {from_x} {from_y} C {from_x + cp_offset} {from_y}, {to_x - cp_offset} {to_y}, {to_x} {to_y}"
        fill="none" stroke="{color}" stroke-width="{1.5 * scale}"
        marker-end="url(#{marker_id})" {dash_attr}/>''')

        return "".join(elements)

    def _calculate_width(
        self,
        plays: List[Dict[str, Any]],
        scale: float
    ) -> float:
        """Calculate total SVG width, using calculated block dimensions"""
        max_x = 0
        for play in plays:
            all_modules = play.get("modules", [])
            for m in all_modules:
                if not m.get("parentId"):
                    x = m.get("x", 0)
                    # Use calculated dimensions for blocks
                    if m.get("isBlock"):
                        width, _ = self._calculate_block_dimensions(m, all_modules)
                    else:
                        width = m.get("width", DEFAULT_WIDTH)
                    max_x = max(max_x, x + width)
        return max(800, max_x + 100) * scale

    def _calculate_bounds(
        self,
        modules: List[Dict[str, Any]],
        collapsed_blocks: Set[str],
        all_modules: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[Dict[str, float]]:
        """Calculate bounds of modules, using calculated dimensions for blocks"""
        if not modules:
            return None

        min_x = float("inf")
        min_y = float("inf")
        max_x = float("-inf")
        max_y = float("-inf")

        for m in modules:
            x = m.get("x", 0)
            y = m.get("y", 0)

            # For blocks, use calculated dimensions if all_modules is provided
            if m.get("isBlock") and all_modules:
                if m["id"] in collapsed_blocks:
                    width = m.get("width", DEFAULT_WIDTH)
                    height = COLLAPSED_BLOCK_HEIGHT
                else:
                    width, height = self._calculate_block_dimensions(m, all_modules)
            else:
                width = m.get("width", DEFAULT_WIDTH)
                height = self._get_effective_height(m, collapsed_blocks)

            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x + width)
            max_y = max(max_y, y + height)

        return {"min_x": min_x, "min_y": min_y, "max_x": max_x, "max_y": max_y}

    def _get_effective_height(
        self,
        module: Dict[str, Any],
        collapsed_blocks: Set[str]
    ) -> float:
        """Get effective height respecting collapsed state"""
        if module.get("isBlock") and module["id"] in collapsed_blocks:
            return COLLAPSED_BLOCK_HEIGHT
        return module.get("height", DEFAULT_HEIGHT)

    def _get_section_color(self, section: str) -> str:
        """Get color for section"""
        return COLORS.get(section, COLORS["tasks"])

    def _get_link_color(self, link_type: Optional[str]) -> str:
        """Get color for link type"""
        if link_type == "rescue":
            return COLORS["link_rescue"]
        if link_type == "always":
            return COLORS["link_always"]
        return COLORS["link_normal"]

    def _truncate(self, text: str, max_width: float, font_size: float) -> str:
        """Truncate text to fit width"""
        max_chars = int(max_width / (font_size * 0.6))
        if len(text) <= max_chars:
            return text
        return text[:max_chars - 1] + "..."


# Singleton instance
svg_exporter = SVGExporter()
