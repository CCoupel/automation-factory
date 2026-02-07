import React from 'react'
import { Box, Paper, TextField, Typography, IconButton, Tooltip, Badge } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import RepeatIcon from '@mui/icons-material/Repeat'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import StartTaskWithBadge from '../common/StartTaskWithBadge'
import ResizeHandles from '../common/ResizeHandles'
import { ModuleBlock, Link, isSystemBlock } from '../../types/playbook'

interface BlockSectionContentProps {
  blockId: string
  section: 'normal' | 'rescue' | 'always'
  modules: ModuleBlock[]
  selectedModuleId: string | null
  draggedModuleId: string | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  resizingBlock: { id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null
  getStartChainCount: (startId: string) => number
  onSelectModule: (module: any) => void
  updateTaskName: (id: string, name: string) => void
  toggleBlockCollapse: (id: string) => void
  toggleBlockSection: (blockId: string, section: 'normal' | 'rescue' | 'always') => void
  isSectionCollapsed: (blockId: string, section: 'normal' | 'rescue' | 'always') => boolean
  handleModuleDragStart: (id: string, e: React.DragEvent) => void
  handleModuleDragOver: (targetId: string, e: React.DragEvent) => void
  handleModuleDropOnModule: (targetId: string, e: React.DragEvent) => void
  handleBlockSectionDrop: (blockId: string, section: 'normal' | 'rescue' | 'always', e: React.DragEvent) => void
  handleResizeStart: (blockId: string, direction: string, e: React.MouseEvent) => void
  getBlockTheme: (id: string) => { borderColor: string; bgColor: string; iconColor: string }
  getBlockDimensions: (block: ModuleBlock) => { width: number; height: number }
  getSectionColor: (section: 'normal' | 'rescue' | 'always') => string
  // Props pour SectionLinks
  links: Link[]
  getLinkStyle: (type: string) => {
    stroke: string
    strokeWidth?: string
    strokeDasharray?: string
    label?: string
  }
  deleteLink: (linkId: string) => void
  hoveredLinkId: string | null
  setHoveredLinkId: (linkId: string | null) => void
  getModuleOrVirtual: (id: string) => ModuleBlock | undefined
  getModuleDimensions: (module: ModuleBlock) => { width: number; height: number }
  // Highlighted elements for collaboration sync
  highlightedElements?: Map<string, string>
}

const BlockSectionContent: React.FC<BlockSectionContentProps> = ({
  blockId,
  section,
  modules,
  selectedModuleId,
  draggedModuleId,
  collapsedBlocks,
  collapsedBlockSections,
  resizingBlock,
  getStartChainCount,
  onSelectModule,
  updateTaskName,
  toggleBlockCollapse,
  toggleBlockSection,
  isSectionCollapsed,
  handleModuleDragStart,
  handleModuleDragOver,
  handleModuleDropOnModule,
  handleBlockSectionDrop,
  handleResizeStart,
  getBlockTheme,
  getBlockDimensions,
  getSectionColor,
  // Props pour SectionLinks
  links,
  getLinkStyle,
  deleteLink,
  hoveredLinkId,
  setHoveredLinkId,
  getModuleOrVirtual,
  getModuleDimensions,
  highlightedElements,
}) => {
  // Trouver le block parent
  const parentBlock = modules.find(m => m.id === blockId)
  if (!parentBlock || !parentBlock.blockSections) {
    return null
  }

  // Récupérer les IDs des tâches/blocks dans cette section
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
        {/* Mini START task - always visible */}
        <StartTaskWithBadge
          startId={`${blockId}-${section}-start`}
          position={{ x: 20, y: 10 }}
          color={getSectionColor(section)}
          badgeCount={getStartChainCount(`${blockId}-${section}-start`)}
          isDragged={false}
          onDragStart={(e) => handleModuleDragStart(`${blockId}-${section}-start`, e)}
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            const sourceId = e.dataTransfer.getData('existingModule')
            if (sourceId && sourceId !== `${blockId}-${section}-start`) {
              e.preventDefault()
              e.stopPropagation()
              handleModuleDropOnModule(`${blockId}-${section}-start`, e)
            }
          }}
        />

        {/* Empty message */}
        <Box
          sx={{
            position: 'absolute',
            left: 100,
            top: 10,
            right: 10,
            bottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          Drop tasks or blocks here
        </Box>

        {/* Render links for this section */}
        <SectionLinks
          links={links}
          modules={modules}
          sectionType="block"
          sectionName={section}
          parentId={blockId}
          getLinkStyle={getLinkStyle}
          deleteLink={deleteLink}
          hoveredLinkId={hoveredLinkId}
          setHoveredLinkId={setHoveredLinkId}
          getModuleOrVirtual={getModuleOrVirtual}
          getModuleDimensions={getModuleDimensions}
        />
      </>
    )
  }

  return (
    <>
      {/* Mini START task - always visible */}
      <StartTaskWithBadge
        startId={`${blockId}-${section}-start`}
        position={{ x: 20, y: 10 }}
        color={getSectionColor(section)}
        badgeCount={getStartChainCount(`${blockId}-${section}-start`)}
        isDragged={false}
        onDragStart={(e) => handleModuleDragStart(`${blockId}-${section}-start`, e)}
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          const sourceId = e.dataTransfer.getData('existingModule')
          if (sourceId && sourceId !== `${blockId}-${section}-start`) {
            e.preventDefault()
            e.stopPropagation()
            handleModuleDropOnModule(`${blockId}-${section}-start`, e)
          }
        }}
      />

      {/* Existing tasks */}
      {taskIds.map(taskId => {
        const task = modules.find(m => m.id === taskId)
        if (!task) return null

        const taskTheme = getTaskTheme(task.id)

        // Si c'est un block imbriqué
        if (task.isBlock) {
          const isNestedBlockSystem = task.isSystem || isSystemBlock(parentBlock)
          const blockTheme = getBlockTheme(task.id)
          const blockDims = getBlockDimensions(task)

          return (
            <Paper
              key={taskId}
              data-task-id={task.id}
              elevation={selectedModuleId === task.id ? 6 : (isNestedBlockSystem ? 1 : 3)}
              onClick={(e) => {
                e.stopPropagation()
                onSelectModule({
                  id: task.id,
                  name: task.name,
                  collection: task.collection,
                  taskName: task.taskName,
                  when: task.when,
                  ignoreErrors: task.ignoreErrors,
                  become: task.become,
                  loop: task.loop,
                  delegateTo: task.delegateTo,
                  isBlock: task.isBlock,
                  isPlay: task.isPlay,
                  isSystem: isNestedBlockSystem,
                  description: task.description
                })
              }}
              draggable={true}
              onDragStart={(e) => handleModuleDragStart(task.id, e)}
              onDragOver={(e) => handleModuleDragOver(task.id, e)}
              onDrop={(e) => {
                // Pour les blocs système, autoriser les liens internes
                if (isNestedBlockSystem) {
                  const sourceId = e.dataTransfer.getData('existingModule')
                  if (sourceId) {
                    const sourceModule = modules.find(m => m.id === sourceId)
                    // Autoriser si la source est dans le même bloc parent
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
                left: task.x || 10,
                top: task.y || 10,
                width: blockDims.width,
                height: blockDims.height,
                cursor: 'move',
                border: `2px solid ${blockTheme.borderColor}`,
                bgcolor: blockTheme.bgColor,
                zIndex: draggedModuleId === task.id ? 10 : 1,
                opacity: draggedModuleId === task.id ? 0.7 : 1,
                overflow: 'visible',
                // Highlight effect for synced elements (user's color)
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
              {/* Header du block */}
              <Box
                className="block-header"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  const sourceId = e.dataTransfer.getData('existingModule')
                  if (sourceId === task.id) {
                    return
                  }
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
                      fullWidth
                      variant="standard"
                      value={task.taskName}
                      onChange={(e) => updateTaskName(task.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiInput-input': {
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          padding: '2px 0',
                          color: blockTheme.iconColor,
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleBlockCollapse(task.id)
                      }}
                      sx={{ p: 0.25 }}
                    >
                      {collapsedBlocks.has(task.id) ? (
                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ExpandLessIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Box>
                </Box>

                {/* Icônes d'attributs */}
                <TaskAttributeIcons
                  attributes={{
                    when: task.when,
                    ignoreErrors: task.ignoreErrors,
                    become: task.become,
                    loop: task.loop,
                    delegateTo: task.delegateTo
                  }}
                  size="small"
                  sx={{ pl: 3, mt: 0.5 }}
                />
              </Box>

              {/* 3 sections du block imbriqué - SEULEMENT si non collapsed */}
              {!collapsedBlocks.has(task.id) && (
                <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Section Tasks */}
                  <Box
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBlockSection(task.id, 'normal')
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      p: 0.5,
                      bgcolor: `${getSectionColor('normal')}15`,
                      cursor: 'pointer',
                      borderBottom: 1, borderColor: 'divider',
                      flexShrink: 0,
                      '&:hover': { bgcolor: `${getSectionColor('normal')}25` }
                    }}
                  >
                    {isSectionCollapsed(task.id, 'normal') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('normal'), fontSize: '0.7rem' }}>
                      Tasks
                    </Typography>
                  </Box>
                  {!isSectionCollapsed(task.id, 'normal') && (
                    <Box
                      onDragOver={(e) => {
                        e.preventDefault()
                      }}
                      onDrop={(e) => handleBlockSectionDrop(task.id, 'normal', e)}
                      sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('normal')}08`, p: 0.5 }}
                    >
                      <BlockSectionContent
                        blockId={task.id}
                        section="normal"
                        modules={modules}
                        selectedModuleId={selectedModuleId}
                        draggedModuleId={draggedModuleId}
                        collapsedBlocks={collapsedBlocks}
                        collapsedBlockSections={collapsedBlockSections}
                        resizingBlock={resizingBlock}
                        getStartChainCount={getStartChainCount}
                        onSelectModule={onSelectModule}
                        updateTaskName={updateTaskName}
                        toggleBlockCollapse={toggleBlockCollapse}
                        toggleBlockSection={toggleBlockSection}
                        isSectionCollapsed={isSectionCollapsed}
                        handleModuleDragStart={handleModuleDragStart}
                        handleModuleDragOver={handleModuleDragOver}
                        handleModuleDropOnModule={handleModuleDropOnModule}
                        handleBlockSectionDrop={handleBlockSectionDrop}
                        handleResizeStart={handleResizeStart}
                        getBlockTheme={getBlockTheme}
                        getBlockDimensions={getBlockDimensions}
                        getSectionColor={getSectionColor}
                        links={links}
                        getLinkStyle={getLinkStyle}
                        deleteLink={deleteLink}
                        hoveredLinkId={hoveredLinkId}
                        setHoveredLinkId={setHoveredLinkId}
                        getModuleOrVirtual={getModuleOrVirtual}
                        getModuleDimensions={getModuleDimensions}
                        highlightedElements={highlightedElements}
                      />
                    </Box>
                  )}

                  {/* Section Rescue */}
                  <Box
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBlockSection(task.id, 'rescue')
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      p: 0.5,
                      bgcolor: `${getSectionColor('rescue')}15`,
                      cursor: 'pointer',
                      borderBottom: 1, borderColor: 'divider',
                      flexShrink: 0,
                      '&:hover': { bgcolor: `${getSectionColor('rescue')}25` }
                    }}
                  >
                    {isSectionCollapsed(task.id, 'rescue') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('rescue'), fontSize: '0.7rem' }}>
                      Rescue
                    </Typography>
                  </Box>
                  {!isSectionCollapsed(task.id, 'rescue') && (
                    <Box
                      onDragOver={(e) => {
                        e.preventDefault()
                      }}
                      onDrop={(e) => handleBlockSectionDrop(task.id, 'rescue', e)}
                      sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('rescue')}08`, p: 0.5 }}
                    >
                      <BlockSectionContent
                        blockId={task.id}
                        section="rescue"
                        modules={modules}
                        selectedModuleId={selectedModuleId}
                        draggedModuleId={draggedModuleId}
                        collapsedBlocks={collapsedBlocks}
                        collapsedBlockSections={collapsedBlockSections}
                        resizingBlock={resizingBlock}
                        getStartChainCount={getStartChainCount}
                        onSelectModule={onSelectModule}
                        updateTaskName={updateTaskName}
                        toggleBlockCollapse={toggleBlockCollapse}
                        toggleBlockSection={toggleBlockSection}
                        isSectionCollapsed={isSectionCollapsed}
                        handleModuleDragStart={handleModuleDragStart}
                        handleModuleDragOver={handleModuleDragOver}
                        handleModuleDropOnModule={handleModuleDropOnModule}
                        handleBlockSectionDrop={handleBlockSectionDrop}
                        handleResizeStart={handleResizeStart}
                        getBlockTheme={getBlockTheme}
                        getBlockDimensions={getBlockDimensions}
                        getSectionColor={getSectionColor}
                        links={links}
                        getLinkStyle={getLinkStyle}
                        deleteLink={deleteLink}
                        hoveredLinkId={hoveredLinkId}
                        setHoveredLinkId={setHoveredLinkId}
                        getModuleOrVirtual={getModuleOrVirtual}
                        getModuleDimensions={getModuleDimensions}
                        highlightedElements={highlightedElements}
                      />
                    </Box>
                  )}

                  {/* Section Always */}
                  <Box
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBlockSection(task.id, 'always')
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      p: 0.5,
                      bgcolor: `${getSectionColor('always')}15`,
                      cursor: 'pointer',
                      borderBottom: 1, borderColor: 'divider',
                      flexShrink: 0,
                      '&:hover': { bgcolor: `${getSectionColor('always')}25` }
                    }}
                  >
                    {isSectionCollapsed(task.id, 'always') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('always'), fontSize: '0.7rem' }}>
                      Always
                    </Typography>
                  </Box>
                  {!isSectionCollapsed(task.id, 'always') && (
                    <Box
                      onDragOver={(e) => {
                        e.preventDefault()
                      }}
                      onDrop={(e) => handleBlockSectionDrop(task.id, 'always', e)}
                      sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('always')}08`, p: 0.5 }}
                    >
                      <BlockSectionContent
                        blockId={task.id}
                        section="always"
                        modules={modules}
                        selectedModuleId={selectedModuleId}
                        draggedModuleId={draggedModuleId}
                        collapsedBlocks={collapsedBlocks}
                        collapsedBlockSections={collapsedBlockSections}
                        resizingBlock={resizingBlock}
                        getStartChainCount={getStartChainCount}
                        onSelectModule={onSelectModule}
                        updateTaskName={updateTaskName}
                        toggleBlockCollapse={toggleBlockCollapse}
                        toggleBlockSection={toggleBlockSection}
                        isSectionCollapsed={isSectionCollapsed}
                        handleModuleDragStart={handleModuleDragStart}
                        handleModuleDragOver={handleModuleDragOver}
                        handleModuleDropOnModule={handleModuleDropOnModule}
                        handleBlockSectionDrop={handleBlockSectionDrop}
                        handleResizeStart={handleResizeStart}
                        getBlockTheme={getBlockTheme}
                        getBlockDimensions={getBlockDimensions}
                        getSectionColor={getSectionColor}
                        links={links}
                        getLinkStyle={getLinkStyle}
                        deleteLink={deleteLink}
                        hoveredLinkId={hoveredLinkId}
                        setHoveredLinkId={setHoveredLinkId}
                        getModuleOrVirtual={getModuleOrVirtual}
                        getModuleDimensions={getModuleDimensions}
                        highlightedElements={highlightedElements}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Poignées de redimensionnement - 8 directions - seulement pour les blocks non collapsed */}
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

        // Sinon c'est une tâche simple
        // Check if task or parent is system (locked)
        const isTaskSystem = task.isSystem || isSystemBlock(parentBlock)

        return (
          <Paper
            key={taskId}
            data-task-id={task.id}
            elevation={selectedModuleId === task.id ? 6 : (isTaskSystem ? 1 : 3)}
            onClick={(e) => {
              e.stopPropagation()
              // Allow selection even for system tasks (for viewing)
              onSelectModule({
                id: task.id,
                name: task.name,
                collection: task.collection,
                taskName: task.taskName,
                when: task.when,
                ignoreErrors: task.ignoreErrors,
                become: task.become,
                loop: task.loop,
                delegateTo: task.delegateTo,
                isBlock: task.isBlock,
                isPlay: task.isPlay,
                isSystem: isTaskSystem,
                description: task.description
              })
            }}
            draggable={true}
            onDragStart={(e) => handleModuleDragStart(task.id, e)}
            onDragOver={(e) => handleModuleDragOver(task.id, e)}
            onDrop={(e) => {
              // Pour les tâches système, autoriser les liens internes au bloc
              if (isTaskSystem) {
                const sourceId = e.dataTransfer.getData('existingModule')
                if (sourceId) {
                  const sourceModule = modules.find(m => m.id === sourceId)
                  // Autoriser si la source est dans le même bloc système (lien interne)
                  // ou si c'est le START de la section
                  const isSameBlock = sourceModule?.parentId === blockId
                  const isStartTask = sourceId.endsWith('-start') && sourceId.startsWith(blockId)
                  if (isSameBlock || isStartTask) {
                    handleModuleDropOnModule(task.id, e)
                    return
                  }
                }
                // Bloquer les drops externes sur les tâches système
                e.preventDefault()
                e.stopPropagation()
                return
              }
              handleModuleDropOnModule(task.id, e)
            }}
            sx={{
              position: 'absolute',
              left: task.x || 10,
              top: task.y || 10,
              width: 140,
              minHeight: 60,
              p: 0.75,
              cursor: 'move',
              border: selectedModuleId === task.id
                ? `2px solid ${taskTheme.borderColor}`
                : (isTaskSystem ? '1px solid #9e9e9e' : 'none'),
              bgcolor: isTaskSystem ? 'rgba(158, 158, 158, 0.08)' : undefined,
              zIndex: draggedModuleId === task.id ? 10 : 1,
              opacity: isTaskSystem ? 0.9 : (draggedModuleId === task.id ? 0.7 : 1),
              // Highlight effect for synced elements (user's color)
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
            {/* ID et nom de la tâche */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              {isTaskSystem ? (
                <Tooltip title="Tâche système - Non modifiable">
                  <LockIcon sx={{ fontSize: 14, color: '#757575', flexShrink: 0 }} />
                </Tooltip>
              ) : (
                <Box
                  sx={{
                    minWidth: 18,
                    height: 18,
                    px: 0.5,
                    borderRadius: '4px',
                    bgcolor: taskTheme.numberBgColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.6rem',
                    flexShrink: 0,
                  }}
                >
                  {task.collection === 'ansible.builtin' ? 'B' : task.collection === 'ansible.posix' ? 'P' : 'C'}
                </Box>
              )}
              {isTaskSystem ? (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.7rem',
                    color: '#757575',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.taskName}
                </Typography>
              ) : (
                <TextField
                  fullWidth
                  variant="standard"
                  value={task.taskName}
                  onChange={(e) => updateTaskName(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiInput-input': {
                      fontSize: '0.7rem',
                      padding: '0px',
                    },
                  }}
                />
              )}
            </Box>

            {/* Module name */}
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
              {task.name}
            </Typography>

            {/* Description for system tasks */}
            {isTaskSystem && task.description && (
              <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', fontSize: '0.6rem', fontStyle: 'italic' }}>
                {task.description}
              </Typography>
            )}

            {/* Icônes d'attributs */}
            <TaskAttributeIcons
              attributes={{
                when: task.when,
                ignoreErrors: task.ignoreErrors,
                become: task.become,
                loop: task.loop,
                delegateTo: task.delegateTo
              }}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Paper>
        )
      })}

      {/* Render links for this section */}
      <SectionLinks
        links={links}
        modules={modules}
        sectionType="block"
        sectionName={section}
        parentId={blockId}
        getLinkStyle={getLinkStyle}
        deleteLink={deleteLink}
        hoveredLinkId={hoveredLinkId}
        setHoveredLinkId={setHoveredLinkId}
        getModuleOrVirtual={getModuleOrVirtual}
        getModuleDimensions={getModuleDimensions}
      />
    </>
  )
}

export default BlockSectionContent
