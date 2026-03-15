import React from 'react'
import { Box } from '@mui/material'
import PlaySectionContent from './PlaySectionContent'
import SectionLinks from '../common/SectionLinks'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { useCanvasDragDrop } from '../../hooks/useCanvasDragDrop'
import {
  getPlaySectionColor,
  getLinkStyle,
  getModuleDimensions,
  getModuleOrVirtual,
} from '../../utils/canvasHelpers'
import { CollaborationCallbacks } from '../zones/WorkZone'

interface VisualCanvasProps {
  sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  collaborationCallbacks?: CollaborationCallbacks
}

const VisualCanvas: React.FC<VisualCanvasProps> = ({
  sectionName,
  collaborationCallbacks,
}) => {
  const modules = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.modules || [])
  const links = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.links || [])
  const hoveredLinkId = usePlaybookEditorStore(s => s.hoveredLinkId)
  const setHoveredLinkId = usePlaybookEditorStore(s => s.setHoveredLinkId)
  const collapsedBlocks = usePlaybookEditorStore(s => s.collapsedBlocks)
  const collapsedBlockSections = usePlaybookEditorStore(s => s.collapsedBlockSections)
  const selectModule = usePlaybookEditorStore(s => s.selectModule)

  const {
    handlePlaySectionDrop,
    handleDragOver,
    deleteLink,
  } = useCanvasDragDrop({ collaborationCallbacks })

  const getModDims = (mod: typeof modules[0]) =>
    getModuleDimensions(mod, modules, collapsedBlocks, collapsedBlockSections)
  const getModuleOrVirtualFn = (id: string) => getModuleOrVirtual(id, modules)
  const getLinkStyleFn = (type: string) => getLinkStyle(type)

  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        bgcolor: `${getPlaySectionColor(sectionName)}08`,
        overflow: 'auto',
        p: 2,
      }}
      onDrop={(e) => handlePlaySectionDrop(sectionName, e)}
      onDragOver={handleDragOver}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectModule(null)
        }
      }}
    >
      <PlaySectionContent
        sectionName={sectionName}
        collaborationCallbacks={collaborationCallbacks}
      />

      <SectionLinks
        links={links}
        modules={modules}
        sectionType="play"
        sectionName={sectionName}
        getLinkStyle={getLinkStyleFn}
        deleteLink={deleteLink}
        hoveredLinkId={hoveredLinkId}
        setHoveredLinkId={setHoveredLinkId}
        getModuleOrVirtual={getModuleOrVirtualFn}
        getModuleDimensions={getModDims}
      />
    </Box>
  )
}

export default VisualCanvas
