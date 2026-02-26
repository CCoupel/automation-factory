import React from 'react'
import { Box } from '@mui/material'
import PlaySectionContent from './PlaySectionContent'
import SectionLinks from '../common/SectionLinks'
import PortRenderer from './PortRenderer'
import DataLinkRenderer from './DataLinkRenderer'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { useCanvasDragDrop } from '../../hooks/useCanvasDragDrop'
import { usePortWiring } from '../../hooks/usePortWiring'
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
  const dataLinks = usePlaybookEditorStore(s => s.dataLinks)
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

  const { wiringFrom, mousePos, startWiring, completeWiring, cancelWiring } = usePortWiring()

  const getModDims = (mod: typeof modules[0]) =>
    getModuleDimensions(mod, modules, collapsedBlocks, collapsedBlockSections)
  const getModuleOrVirtualFn = (id: string) => getModuleOrVirtual(id, modules)
  const getLinkStyleFn = (type: string) => getLinkStyle(type)

  const getModWidth = (mod: typeof modules[0]) => getModDims(mod).width
  const getModHeight = (mod: typeof modules[0]) => getModDims(mod).height

  // Filter modules that have ports for this section
  const modulesWithPorts = modules.filter(
    m => m.ports && m.ports.length > 0 && m.parentSection === sectionName
  )

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

      {/* Data links layer (below execution links) */}
      {dataLinks.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <g style={{ pointerEvents: 'all' }}>
            <DataLinkRenderer
              dataLinks={dataLinks}
              modules={modules}
              getModuleWidth={getModWidth}
              getModuleHeight={getModHeight}
            />
          </g>
        </svg>
      )}

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

      {/* Port circles layer (on top) */}
      {modulesWithPorts.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <g style={{ pointerEvents: 'all' }}>
            <PortRenderer
              modules={modulesWithPorts}
              getModuleWidth={getModWidth}
              getModuleHeight={getModHeight}
              onPortMouseDown={(port, e) => {
                if (port.direction === 'output') {
                  startWiring(port, { x: e.clientX, y: e.clientY })
                }
              }}
              onPortMouseUp={(port) => {
                if (port.direction === 'input') {
                  completeWiring(port)
                }
              }}
            />
          </g>

          {/* Temporary wiring line */}
          {wiringFrom && mousePos && (
            <line
              x1={0}
              y1={0}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#00897B"
              strokeDasharray="4,4"
              strokeWidth={1.5}
              opacity={0.6}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>
      )}
    </Box>
  )
}

export default VisualCanvas
