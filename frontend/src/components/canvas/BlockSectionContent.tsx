import React from 'react'
import { Box, Paper, TextField, Typography, IconButton, Tooltip } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
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
  getLinkStyle,
  getStartChainCount,
  getModuleOrVirtual,
} from '../../utils/canvasHelpers'
import { CollaborationCallbacks } from '../zones/WorkZone'

interface BlockSectionContentProps {
  blockId: string
  section: 'normal' | 'rescue' | 'always'
  collaborationCallbacks?: CollaborationCallbacks
}

const BlockSectionContent: React.FC<BlockSectionContentProps> = ({
  blockId,
  section,
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

  // Find parent block
  const parentBlock = modules.find(m => m.id === blockId)
  if (!parentBlock || !parentBlock.blockSections) {
    return null
  }

  const taskIds = parentBlock.blockSections[section] || []

  const getTaskTheme = (taskId: string) => {
    const task = modules.find(m => m.id === taskId)
    if (!task) return { borderColor: '#1976d2', bgColor: '#e3f2fd', iconColor: '#1976d2', numberBgColor: '#1976d2' }

    if (task.isBlock) {
      return { borderColor: '#9c27b0', bgColor: '#f3e5f5', iconColor: '#9c27b0', numberBgColor: '#9c27b0' }
    }

    return { borderColor: '#1976d2', bgColor: '#e3f2fd', iconColor: '#1976d2', numberBgColor: '#1976d2' }
  }

  if (taskIds.length === 0) {
    return (
      <>
        <StartTaskWithBadge
          startId={`${blockId}-${section}-start`}
          position={{ x: 20, y: 10 }}
          color={getSectionColor(section)}
          badgeCount={getStartChainCount(`${blockId}-${section}-start`, links)}
          isDragged={false}
          onDragStart={(e) => handleModuleDragStart(`${blockId}-${section}-start`, e)}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            const sourceId = e.dataTransfer.getData('existingModule')
            if (sourceId && sourceId !== `${blockId}-${section}-start`) {
              e.preventDefault()
              e.stopPropagation()
              handleModuleDropOnModule(`${blockId}-${section}-start`, e)
            }
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            left: 100, top: 10, right: 10, bottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'text.secondary', fontSize: '0.75rem',
          }}
        >
          Drop tasks or blocks here
        </Box>

        <SectionLinks
          links={links}
          modules={modules}
          sectionType="block"
          sectionName={section}
          parentId={blockId}
          getLinkStyle={getLinkStyleFn}
          deleteLink={deleteLinkFn}
          hoveredLinkId={hoveredLinkId}
          setHoveredLinkId={setHoveredLinkId}
          getModuleOrVirtual={getModuleOrVirtualFn}
          getModuleDimensions={getModDims}
        />
      </>
    )
  }

  return (
    <>
      <StartTaskWithBadge
        startId={`${blockId}-${section}-start`}
        position={{ x: 20, y: 10 }}
        color={getSectionColor(section)}
        badgeCount={getStartChainCount(`${blockId}-${section}-start`, links)}
        isDragged={false}
        onDragStart={(e) => handleModuleDragStart(`${blockId}-${section}-start`, e)}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={(e) => {
          const sourceId = e.dataTransfer.getData('existingModule')
          if (sourceId && sourceId !== `${blockId}-${section}-start`) {
            e.preventDefault()
            e.stopPropagation()
            handleModuleDropOnModule(`${blockId}-${section}-start`, e)
          }
        }}
      />

      {taskIds.map(taskId => {
        const task = modules.find(m => m.id === taskId)
        if (!task) return null

        const taskTheme = getTaskTheme(task.id)

        // Nested block
        if (task.isBlock) {
          const isNestedBlockSystem = task.isSystem || isSystemBlock(parentBlock)
          const blockTheme = getBlockThemeFn(task.id)
          const blockDims = getBlockDims(task)

          return (
            <Paper
              key={taskId}
              data-task-id={task.id}
              elevation={selectedModuleId === task.id ? 6 : (isNestedBlockSystem ? 1 : 3)}
              onClick={(e) => {
                e.stopPropagation()
                onSelectModule({
                  id: task.id, name: task.name, collection: task.collection,
                  taskName: task.taskName, when: task.when, ignoreErrors: task.ignoreErrors,
                  become: task.become, loop: task.loop, delegateTo: task.delegateTo,
                  isBlock: task.isBlock, isPlay: task.isPlay,
                  isSystem: isNestedBlockSystem, description: task.description,
                })
              }}
              draggable={true}
              onDragStart={(e) => handleModuleDragStart(task.id, e)}
              onDragOver={(e) => handleModuleDragOver(task.id, e)}
              onDrop={(e) => {
                if (isNestedBlockSystem) {
                  const sourceId = e.dataTransfer.getData('existingModule')
                  if (sourceId) {
                    const sourceModule = modules.find(m => m.id === sourceId)
                    const isSameParentBlock = sourceModule?.parentId === blockId
                    const isStartTask = sourceId.endsWith('-start') && sourceId.startsWith(blockId)
                    if (isSameParentBlock || isStartTask) {
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
                left: task.x || 10, top: task.y || 10,
                width: blockDims.width, height: blockDims.height,
                cursor: 'move',
                border: `2px solid ${blockTheme.borderColor}`,
                bgcolor: blockTheme.bgColor,
                zIndex: draggedModuleId === task.id ? 10 : 1,
                opacity: draggedModuleId === task.id ? 0.7 : 1,
                overflow: 'visible',
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
              {/* Header */}
              <Box
                className="block-header"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                  const sourceId = e.dataTransfer.getData('existingModule')
                  if (sourceId === task.id) return
                  e.preventDefault()
                  e.stopPropagation()
                  handleModuleDropOnModule(task.id, e)
                }}
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pb: 0.5, p: 1, borderBottom: `1px solid ${blockTheme.borderColor}` }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccountTreeIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                    <TextField
                      fullWidth variant="standard" value={task.taskName}
                      onChange={(e) => updateTaskName(task.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ '& .MuiInput-input': { fontWeight: 'bold', fontSize: '0.75rem', padding: '2px 0', color: blockTheme.iconColor } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleBlockCollapse(task.id) }} sx={{ p: 0.25 }}>
                      {collapsedBlocks.has(task.id) ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ExpandLessIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Box>
                </Box>
                <TaskAttributeIcons
                  attributes={{ when: task.when, ignoreErrors: task.ignoreErrors, become: task.become, loop: task.loop, delegateTo: task.delegateTo }}
                  size="small" sx={{ pl: 3, mt: 0.5 }}
                />
              </Box>

              {/* 3 sections */}
              {!collapsedBlocks.has(task.id) && (
                <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                  {(['normal', 'rescue', 'always'] as const).map(sec => (
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
                          {sec === 'normal' ? 'Tasks' : sec.charAt(0).toUpperCase() + sec.slice(1)} ({task.blockSections?.[sec]?.length || 0})
                        </Typography>
                      </Box>
                      {!isSectionCollapsedStore(task.id, sec) && (
                        <Box
                          onDragOver={(e) => { e.preventDefault() }}
                          onDrop={(e) => handleBlockSectionDrop(task.id, sec, e)}
                          sx={{ height: getBlockSectionContentHeight(task, sec, modules, collapsedBlocks, collapsedBlockSections), position: 'relative', bgcolor: `${getSectionColor(sec)}08`, p: 0.5, overflow: 'auto', flexShrink: 0 }}
                        >
                          <BlockSectionContent blockId={task.id} section={sec} collaborationCallbacks={collaborationCallbacks} />
                        </Box>
                      )}
                    </React.Fragment>
                  ))}
                </Box>
              )}

              {!collapsedBlocks.has(task.id) && (
                <ResizeHandles
                  blockId={task.id}
                  color={getSectionColor(section)}
                  resizingBlock={resizingBlock}
                  onResizeStart={handleResizeStart}
                />
              )}
            </Paper>
          )
        }

        // Simple task
        const isTaskSystem = task.isSystem || isSystemBlock(parentBlock)

        return (
          <Paper
            key={taskId}
            data-task-id={task.id}
            elevation={selectedModuleId === task.id ? 6 : (isTaskSystem ? 1 : 3)}
            onClick={(e) => {
              e.stopPropagation()
              onSelectModule({
                id: task.id, name: task.name, collection: task.collection,
                taskName: task.taskName, when: task.when, ignoreErrors: task.ignoreErrors,
                become: task.become, loop: task.loop, delegateTo: task.delegateTo,
                isBlock: task.isBlock, isPlay: task.isPlay,
                isSystem: isTaskSystem, description: task.description,
              })
            }}
            draggable={true}
            onDragStart={(e) => handleModuleDragStart(task.id, e)}
            onDragOver={(e) => handleModuleDragOver(task.id, e)}
            onDrop={(e) => {
              if (isTaskSystem) {
                const sourceId = e.dataTransfer.getData('existingModule')
                if (sourceId) {
                  const sourceModule = modules.find(m => m.id === sourceId)
                  const isSameBlock = sourceModule?.parentId === blockId
                  const isStartTask = sourceId.endsWith('-start') && sourceId.startsWith(blockId)
                  if (isSameBlock || isStartTask) {
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
              left: task.x || 10, top: task.y || 10,
              width: 140, minHeight: 60, p: 0.75,
              cursor: 'move',
              border: selectedModuleId === task.id
                ? `2px solid ${taskTheme.borderColor}`
                : (isTaskSystem ? '1px solid #9e9e9e' : 'none'),
              bgcolor: isTaskSystem ? 'rgba(158, 158, 158, 0.08)' : undefined,
              zIndex: draggedModuleId === task.id ? 10 : 1,
              opacity: isTaskSystem ? 0.9 : (draggedModuleId === task.id ? 0.7 : 1),
              ...(highlightedElements?.has(task.id) && {
                boxShadow: `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`,
                border: `3px solid ${highlightedElements.get(task.id)}`,
                transition: 'box-shadow 0.3s ease-in, border 0.3s ease-in',
              }),
              '&:hover': {
                boxShadow: highlightedElements?.has(task.id)
                  ? `0 0 25px 8px ${highlightedElements.get(task.id)}99, 0 0 50px 15px ${highlightedElements.get(task.id)}66`
                  : (isTaskSystem ? 2 : 6),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              {isTaskSystem ? (
                <Tooltip title="Tâche système - Non modifiable">
                  <LockIcon sx={{ fontSize: 14, color: '#757575', flexShrink: 0 }} />
                </Tooltip>
              ) : (
                <Box
                  sx={{
                    minWidth: 18, height: 18, px: 0.5, borderRadius: '4px',
                    bgcolor: taskTheme.numberBgColor, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.6rem', flexShrink: 0,
                  }}
                >
                  {task.collection === 'ansible.builtin' ? 'B' : task.collection === 'ansible.posix' ? 'P' : 'C'}
                </Box>
              )}
              {isTaskSystem ? (
                <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#757575', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.taskName}
                </Typography>
              ) : (
                <TextField
                  fullWidth variant="standard" value={task.taskName}
                  onChange={(e) => updateTaskName(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ '& .MuiInput-input': { fontSize: '0.7rem', padding: '0px' } }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
              {task.name}
            </Typography>
            {isTaskSystem && task.description && (
              <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', fontSize: '0.6rem', fontStyle: 'italic' }}>
                {task.description}
              </Typography>
            )}
            <TaskAttributeIcons
              attributes={{ when: task.when, ignoreErrors: task.ignoreErrors, become: task.become, loop: task.loop, delegateTo: task.delegateTo }}
              size="small" sx={{ mt: 0.5 }}
            />
          </Paper>
        )
      })}

      <SectionLinks
        links={links}
        modules={modules}
        sectionType="block"
        sectionName={section}
        parentId={blockId}
        getLinkStyle={getLinkStyleFn}
        deleteLink={deleteLinkFn}
        hoveredLinkId={hoveredLinkId}
        setHoveredLinkId={setHoveredLinkId}
        getModuleOrVirtual={getModuleOrVirtualFn}
        getModuleDimensions={getModDims}
      />
    </>
  )
}

export default BlockSectionContent
