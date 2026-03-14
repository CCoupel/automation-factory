import { Box, Paper, IconButton, TextField, Typography, Tooltip } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
import React from 'react'
import BlockSectionContent from './BlockSectionContent'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import StartTaskWithBadge from '../common/StartTaskWithBadge'
import ResizeHandles from '../common/ResizeHandles'
import { isSystemBlock } from '../../types/playbook'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { useCanvasDragDrop } from '../../hooks/useCanvasDragDrop'
import { useCanvasResize } from '../../hooks/useCanvasResize'
import {
  getBlockDimensions,
  getBlockSectionContentHeight,
  getModuleDimensions,
  getBlockTheme,
  getSectionColor,
  getPlaySectionColor,
  getLinkStyle,
  getStartChainCount,
  getModuleOrVirtual,
} from '../../utils/canvasHelpers'
import { CollaborationCallbacks } from '../zones/WorkZone'

interface PlaySectionContentProps {
  sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  collaborationCallbacks?: CollaborationCallbacks
}

const PlaySectionContent: React.FC<PlaySectionContentProps> = ({
  sectionName,
  collaborationCallbacks,
}) => {
  // Read from store
  const modules = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.modules || [])
  const links = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.links || [])
  const selectedModuleId = usePlaybookEditorStore(s => s.selectedModuleId)
  const draggedModuleId = usePlaybookEditorStore(s => s.draggedModuleId)
  const collapsedBlocks = usePlaybookEditorStore(s => s.collapsedBlocks)
  const collapsedBlockSections = usePlaybookEditorStore(s => s.collapsedBlockSections)
  const resizingBlock = usePlaybookEditorStore(s => s.resizingBlock)
  const hoveredLinkId = usePlaybookEditorStore(s => s.hoveredLinkId)
  const setHoveredLinkId = usePlaybookEditorStore(s => s.setHoveredLinkId)
  const highlightedElements = usePlaybookEditorStore(s => s.highlightedElements)
  const toggleBlockCollapse = usePlaybookEditorStore(s => s.toggleBlockCollapse)
  const isSectionCollapsedStore = usePlaybookEditorStore(s => s.isSectionCollapsed)
  const toggleBlockSection = usePlaybookEditorStore(s => s.toggleBlockSection)

  // Hooks
  const {
    handleModuleDragStart,
    handleModuleDragOver,
    handleModuleDropOnModule,
    handleBlockSectionDrop,
    updateTaskName,
    onSelectModule,
    deleteLink: deleteLinkFn,
  } = useCanvasDragDrop({ collaborationCallbacks })

  const { handleResizeStart } = useCanvasResize({ collaborationCallbacks })

  // Helpers
  const getBlockDims = (block: typeof modules[0]) =>
    getBlockDimensions(block, modules, collapsedBlocks, collapsedBlockSections)
  const getModDims = (mod: typeof modules[0]) =>
    getModuleDimensions(mod, modules, collapsedBlocks, collapsedBlockSections)
  const getBlockThemeFn = (id: string) => getBlockTheme(id, modules, links)
  const getLinkStyleFn = (type: string) => getLinkStyle(type)
  const getModuleOrVirtualFn = (id: string) => getModuleOrVirtual(id, modules)

  return (
    <>
      {modules
        .filter(m => m.parentSection === sectionName)
        .map(task => {
          // Block rendering
          if (task.isBlock) {
            const isSystem = isSystemBlock(task)
            const blockTheme = isSystem ? {
              bgColor: 'rgba(158, 158, 158, 0.15)',
              borderColor: '#9e9e9e',
              iconColor: '#757575',
              headerBgColor: 'rgba(158, 158, 158, 0.2)',
            } : getBlockThemeFn(task.id)
            const dimensions = getBlockDims(task)

            return (
              <Paper
                key={task.id}
                data-task-id={task.id}
                elevation={selectedModuleId === task.id ? 6 : (isSystem ? 1 : 3)}
                onClick={() => onSelectModule({
                  id: task.id, name: task.name, collection: task.collection,
                  taskName: task.taskName, when: task.when, ignoreErrors: task.ignoreErrors,
                  become: task.become, loop: task.loop, delegateTo: task.delegateTo,
                  isBlock: task.isBlock, isPlay: task.isPlay,
                })}
                draggable={true}
                onDragStart={(e) => handleModuleDragStart(task.id, e)}
                onDragOver={(e) => handleModuleDragOver(task.id, e)}
                onDrop={(e) => {
                  if (isSystem) {
                    const sourceId = e.dataTransfer.getData('existingModule')
                    if (sourceId) {
                      const sourceModule = modules.find(m => m.id === sourceId)
                      const isPlayStart = sourceModule?.isPlay && sourceModule?.parentSection === sectionName
                      const isSamePlaySection = sourceModule?.parentSection === sectionName && !sourceModule?.parentId
                      if (isPlayStart || isSamePlaySection) {
                        handleModuleDropOnModule(task.id, e)
                        return
                      }
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    return
                  }
                  handleModuleDropOnModule(task.id, e)
                }}
                sx={{
                  position: 'absolute',
                  left: task.x, top: task.y,
                  width: dimensions.width, height: dimensions.height,
                  p: 1, cursor: 'move',
                  border: `2px solid ${blockTheme.borderColor}`,
                  borderRadius: 2,
                  bgcolor: blockTheme.bgColor,
                  zIndex: draggedModuleId === task.id ? 10 : 1,
                  opacity: isSystem ? 0.85 : (draggedModuleId === task.id ? 0.7 : 1),
                  overflow: 'visible',
                  ...(highlightedElements?.has(task.id) && {
                    boxShadow: `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`,
                    border: `3px solid ${highlightedElements.get(task.id)}`,
                    transition: 'box-shadow 0.3s ease-in, border 0.3s ease-in',
                  }),
                  '&:hover': {
                    boxShadow: highlightedElements?.has(task.id)
                      ? `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`
                      : (isSystem ? 2 : 6),
                  },
                }}
              >
                {/* Block header */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pb: 0.5, borderBottom: `1px solid ${blockTheme.borderColor}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isSystem ? (
                        <Tooltip title="Bloc système - Généré automatiquement">
                          <LockIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                        </Tooltip>
                      ) : (
                        <AccountTreeIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                      )}
                      {isSystem ? (
                        <Typography sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: blockTheme.iconColor }}>
                          {task.taskName}
                        </Typography>
                      ) : (
                        <TextField
                          fullWidth variant="standard" value={task.taskName}
                          onChange={(e) => updateTaskName(task.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ '& .MuiInput-input': { fontWeight: 'bold', fontSize: '0.75rem', padding: '2px 0', color: blockTheme.iconColor } }}
                        />
                      )}
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleBlockCollapse(task.id) }} sx={{ p: 0.25 }}>
                      {collapsedBlocks.has(task.id) ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ExpandLessIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Box>
                  {!isSystem && (
                    <TaskAttributeIcons
                      attributes={{ when: task.when, ignoreErrors: task.ignoreErrors, become: task.become, loop: task.loop, delegateTo: task.delegateTo }}
                      size="small" sx={{ pl: 3, mt: 0.5 }}
                    />
                  )}
                </Box>

                {/* Block sections */}
                {!collapsedBlocks.has(task.id) && (
                  <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Normal section */}
                    <Box
                      onClick={(e) => { e.stopPropagation(); toggleBlockSection(task.id, 'normal') }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5,
                        bgcolor: `${getSectionColor('normal')}15`, cursor: 'pointer',
                        borderBottom: 1, borderColor: 'divider', flexShrink: 0,
                        '&:hover': { bgcolor: `${getSectionColor('normal')}25` },
                      }}
                    >
                      {isSectionCollapsedStore(task.id, 'normal') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('normal'), fontSize: '0.7rem' }}>
                        Tasks ({task.blockSections?.normal.length || 0})
                      </Typography>
                    </Box>
                    {!isSectionCollapsedStore(task.id, 'normal') && (
                      <Box
                        sx={{ height: getBlockSectionContentHeight(task, 'normal', modules, collapsedBlocks, collapsedBlockSections), position: 'relative', bgcolor: `${getSectionColor('normal')}08`, p: 0.5, overflow: 'auto', flexShrink: 0 }}
                        onDragOver={(e) => { e.preventDefault() }}
                        onDrop={(e) => { handleBlockSectionDrop(task.id, 'normal', e) }}
                      >
                        <BlockSectionContent blockId={task.id} section="normal" collaborationCallbacks={collaborationCallbacks} />
                        <SectionLinks
                          links={links} modules={modules} sectionType="block" sectionName="normal" parentId={task.id}
                          getLinkStyle={getLinkStyleFn} deleteLink={deleteLinkFn}
                          hoveredLinkId={hoveredLinkId} setHoveredLinkId={setHoveredLinkId}
                          getModuleOrVirtual={getModuleOrVirtualFn} getModuleDimensions={getModDims}
                        />
                      </Box>
                    )}

                    {/* Rescue & Always — only for non-system blocks */}
                    {!isSystem && (
                      <>
                        {(['rescue', 'always'] as const).map(sec => (
                          <React.Fragment key={sec}>
                            <Box
                              onClick={(e) => { e.stopPropagation(); toggleBlockSection(task.id, sec) }}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5,
                                bgcolor: `${getSectionColor(sec)}15`, cursor: 'pointer',
                                borderBottom: 1, borderColor: 'divider', flexShrink: 0,
                                '&:hover': { bgcolor: `${getSectionColor(sec)}25` },
                              }}
                            >
                              {isSectionCollapsedStore(task.id, sec) ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor(sec), fontSize: '0.7rem' }}>
                                {sec.charAt(0).toUpperCase() + sec.slice(1)} ({task.blockSections?.[sec].length || 0})
                              </Typography>
                            </Box>
                            {!isSectionCollapsedStore(task.id, sec) && (
                              <Box
                                sx={{ height: getBlockSectionContentHeight(task, sec, modules, collapsedBlocks, collapsedBlockSections), position: 'relative', bgcolor: `${getSectionColor(sec)}08`, p: 0.5, overflow: 'auto', flexShrink: 0 }}
                                onDragOver={(e) => { e.preventDefault() }}
                                onDrop={(e) => handleBlockSectionDrop(task.id, sec, e)}
                              >
                                <BlockSectionContent blockId={task.id} section={sec} collaborationCallbacks={collaborationCallbacks} />
                                <SectionLinks
                                  links={links} modules={modules} sectionType="block" sectionName={sec} parentId={task.id}
                                  getLinkStyle={getLinkStyleFn} deleteLink={deleteLinkFn}
                                  hoveredLinkId={hoveredLinkId} setHoveredLinkId={setHoveredLinkId}
                                  getModuleOrVirtual={getModuleOrVirtualFn} getModuleDimensions={getModDims}
                                />
                              </Box>
                            )}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </Box>
                )}

                {!collapsedBlocks.has(task.id) && (
                  <ResizeHandles
                    blockId={task.id}
                    color={getPlaySectionColor(sectionName)}
                    resizingBlock={resizingBlock}
                    onResizeStart={handleResizeStart}
                  />
                )}
              </Paper>
            )
          }

          // START task
          if (task.isPlay) {
            return (
              <StartTaskWithBadge
                key={task.id}
                startId={task.id}
                position={{ x: task.x, y: task.y }}
                color={getPlaySectionColor(sectionName)}
                badgeCount={getStartChainCount(task.id, links)}
                isDragged={draggedModuleId === task.id}
                onDragStart={(e) => handleModuleDragStart(task.id, e)}
                onDragOver={(e) => { e.preventDefault() }}
                onDrop={(e) => {
                  const sourceId = e.dataTransfer.getData('existingModule')
                  if (sourceId && sourceId !== task.id) {
                    e.preventDefault()
                    e.stopPropagation()
                    handleModuleDropOnModule(task.id, e)
                  }
                }}
              />
            )
          }

          // Normal task
          return (
            <Paper
              key={task.id}
              data-task-id={task.id}
              elevation={selectedModuleId === task.id ? 6 : 3}
              onClick={() => onSelectModule({
                id: task.id, name: task.name, collection: task.collection,
                taskName: task.taskName, when: task.when, ignoreErrors: task.ignoreErrors,
                become: task.become, loop: task.loop, delegateTo: task.delegateTo,
                isBlock: task.isBlock, isPlay: task.isPlay,
              })}
              draggable={true}
              onDragStart={(e) => handleModuleDragStart(task.id, e)}
              onDragOver={(e) => handleModuleDragOver(task.id, e)}
              onDrop={(e) => handleModuleDropOnModule(task.id, e)}
              sx={{
                position: 'absolute',
                left: task.x, top: task.y,
                width: 140, minHeight: 60, p: 1.5,
                cursor: 'move',
                border: 2, borderStyle: 'solid', borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                zIndex: draggedModuleId === task.id ? 10 : 1,
                opacity: draggedModuleId === task.id ? 0.7 : 1,
                ...(highlightedElements?.has(task.id) && {
                  boxShadow: `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`,
                  border: `3px solid ${highlightedElements.get(task.id)}`,
                  transition: 'box-shadow 0.3s ease-in, border 0.3s ease-in',
                }),
                '&:hover': {
                  boxShadow: highlightedElements?.has(task.id)
                    ? `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`
                    : 6,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Box
                  sx={{
                    minWidth: 18, height: 18, px: 0.5, borderRadius: '4px',
                    bgcolor: getPlaySectionColor(sectionName), color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.6rem', flexShrink: 0,
                  }}
                >
                  {modules.filter(m => m.parentSection === sectionName && !m.isPlay).indexOf(task) + 1}
                </Box>
                <TextField
                  fullWidth variant="standard" value={task.taskName}
                  onChange={(e) => updateTaskName(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiInput-input': { fontWeight: 'bold', fontSize: '0.75rem', padding: '0' },
                    '& .MuiInput-root:before': { borderBottom: 'none' },
                    '& .MuiInput-root:hover:not(.Mui-disabled):before': { borderBottom: '1px solid rgba(0, 0, 0, 0.42)' },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>
                {task.collection}.{task.name}
              </Typography>
              <TaskAttributeIcons
                attributes={{ when: task.when, ignoreErrors: task.ignoreErrors, become: task.become, loop: task.loop, delegateTo: task.delegateTo }}
                size="small" sx={{ mt: 0.25, minHeight: 14 }}
              />
            </Paper>
          )
        })}
    </>
  )
}

export default PlaySectionContent
