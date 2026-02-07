"""
Playbook Export API Endpoints

Provides endpoints for exporting playbook diagrams to various formats:
- ABD: Automation Factory Diagram (JSON)
- Mermaid: Markdown with flowchart
- SVG: Vector image
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.services.exporters import abd_exporter, mermaid_exporter, svg_exporter
from app.services.exporters.abd_exporter import ExportOptions as ABDOptions, UIState
from app.services.exporters.mermaid_exporter import MermaidOptions
from app.services.exporters.svg_exporter import SVGOptions


router = APIRouter(prefix="/export", tags=["Playbook Export"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ExportBaseRequest(BaseModel):
    """Base request for all exports"""
    plays: List[Dict[str, Any]] = Field(..., description="List of plays to export")
    playbook_name: str = Field("Untitled Playbook", description="Playbook name")
    playbook_id: Optional[str] = Field(None, description="Playbook ID if saved")


class ABDExportRequest(ExportBaseRequest):
    """Request for ABD export"""
    author: Optional[str] = Field(None, description="Author name")
    include_ui_state: bool = Field(True, description="Include UI state (collapsed blocks)")
    include_integrity: bool = Field(True, description="Include integrity checks")
    pretty_print: bool = Field(False, description="Pretty print JSON")
    # UI State
    collapsed_blocks: List[str] = Field(default_factory=list)
    collapsed_block_sections: List[str] = Field(default_factory=list)
    collapsed_play_sections: List[str] = Field(default_factory=list)
    active_play_index: int = Field(0)


class MermaidExportRequest(ExportBaseRequest):
    """Request for Mermaid export"""
    direction: str = Field("TB", description="Flowchart direction (TB, LR, BT, RL)")
    include_plays: bool = Field(True, description="Include play subgraphs")
    include_sections: bool = Field(True, description="Include section subgraphs")
    include_blocks: bool = Field(True, description="Include block subgraphs")
    as_markdown: bool = Field(True, description="Wrap in Markdown code block")


class SVGExportRequest(ExportBaseRequest):
    """Request for SVG export"""
    scale: float = Field(1.0, description="Scale factor")
    padding: int = Field(20, description="Padding in pixels")
    background_color: str = Field("#ffffff", description="Background color")
    collapsed_blocks: List[str] = Field(default_factory=list, description="IDs of collapsed blocks")


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ABDExportResponse(BaseModel):
    """Response for ABD export"""
    content: Dict[str, Any] = Field(..., description="ABD JSON content")
    filename: str = Field(..., description="Suggested filename")


class MermaidExportResponse(BaseModel):
    """Response for Mermaid export"""
    content: str = Field(..., description="Mermaid/Markdown content")
    filename: str = Field(..., description="Suggested filename")


class SVGExportResponse(BaseModel):
    """Response for SVG export"""
    content: str = Field(..., description="SVG content")
    filename: str = Field(..., description="Suggested filename")


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/abd", response_model=ABDExportResponse)
async def export_abd(request: ABDExportRequest) -> ABDExportResponse:
    """
    Export playbook diagram to ABD (Automation Factory Diagram) format.

    The ABD format is a JSON structure that includes:
    - Complete playbook structure with positions
    - UI state (collapsed blocks, active play)
    - Integrity checks (checksums, counts)
    - Compatibility information

    This format can be imported back into Automation Factory.
    """
    try:
        options = ABDOptions(
            include_ui_state=request.include_ui_state,
            include_integrity=request.include_integrity,
            pretty_print=request.pretty_print
        )

        ui_state = UIState(
            collapsed_blocks=request.collapsed_blocks,
            collapsed_block_sections=request.collapsed_block_sections,
            collapsed_play_sections=request.collapsed_play_sections,
            active_play_index=request.active_play_index
        )

        content = abd_exporter.export(
            plays=request.plays,
            playbook_name=request.playbook_name,
            options=options,
            playbook_id=request.playbook_id,
            author=request.author,
            ui_state=ui_state
        )

        filename = _generate_filename(request.playbook_name, ".abd")

        return ABDExportResponse(content=content, filename=filename)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/mermaid", response_model=MermaidExportResponse)
async def export_mermaid(request: MermaidExportRequest) -> MermaidExportResponse:
    """
    Export playbook diagram to Mermaid flowchart format.

    The Mermaid format generates a flowchart that can be rendered in:
    - GitHub README/Issues/PRs
    - GitLab
    - Notion
    - Any Mermaid-compatible viewer

    When as_markdown=True, the output is wrapped in a Markdown code block.
    """
    try:
        options = MermaidOptions(
            direction=request.direction,
            include_plays=request.include_plays,
            include_sections=request.include_sections,
            include_blocks=request.include_blocks
        )

        if request.as_markdown:
            content = mermaid_exporter.export_markdown(
                plays=request.plays,
                playbook_name=request.playbook_name,
                options=options
            )
            filename = _generate_filename(request.playbook_name, ".md")
        else:
            content = mermaid_exporter.export(
                plays=request.plays,
                options=options
            )
            filename = _generate_filename(request.playbook_name, ".mmd")

        return MermaidExportResponse(content=content, filename=filename)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/svg", response_model=SVGExportResponse)
async def export_svg(request: SVGExportRequest) -> SVGExportResponse:
    """
    Export playbook diagram to SVG vector image.

    The SVG format creates a vector image suitable for:
    - Documentation
    - Presentations
    - Printing
    - Web embedding

    The image preserves the visual layout from the canvas.
    """
    try:
        options = SVGOptions(
            scale=request.scale,
            padding=request.padding,
            background_color=request.background_color,
            collapsed_blocks=request.collapsed_blocks
        )

        content = svg_exporter.export(
            plays=request.plays,
            playbook_name=request.playbook_name,
            options=options
        )

        filename = _generate_filename(request.playbook_name, ".svg")

        return SVGExportResponse(content=content, filename=filename)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# DOWNLOAD ENDPOINTS (Return file directly)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/abd/download")
async def download_abd(request: ABDExportRequest) -> Response:
    """Download ABD file directly"""
    result = await export_abd(request)

    # Convert to JSON string
    import json
    if request.pretty_print:
        content = json.dumps(result.content, indent=2, ensure_ascii=False)
    else:
        content = json.dumps(result.content, ensure_ascii=False)

    return Response(
        content=content,
        media_type="application/vnd.automation-factory.diagram+json",
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"'
        }
    )


@router.post("/mermaid/download")
async def download_mermaid(request: MermaidExportRequest) -> Response:
    """Download Mermaid/Markdown file directly"""
    result = await export_mermaid(request)

    return Response(
        content=result.content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"'
        }
    )


@router.post("/svg/download")
async def download_svg(request: SVGExportRequest) -> Response:
    """Download SVG file directly"""
    result = await export_svg(request)

    return Response(
        content=result.content,
        media_type="image/svg+xml",
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"'
        }
    )


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _generate_filename(name: str, extension: str) -> str:
    """Generate safe filename from playbook name"""
    import re
    from datetime import datetime

    safe_name = (name or "playbook").lower()
    safe_name = re.sub(r"[^a-z0-9]+", "-", safe_name)
    safe_name = safe_name.strip("-")

    date = datetime.utcnow().strftime("%Y-%m-%d")
    return f"{safe_name}-{date}{extension}"
