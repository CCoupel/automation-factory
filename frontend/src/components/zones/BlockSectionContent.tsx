import React from 'react'
import { Box, Paper, TextField, Typography, IconButton, Tooltip, Badge } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import RepeatIcon from '@mui/icons-material/Repeat'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import StartTaskWithBadge from '../common/StartTaskWithBadge'
import { ModuleBlock, Link } from '../../types/playbook'

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
  getBlockDimensions: (blockId: string) => { height: number }
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
          const blockTheme = getBlockTheme(task.id)
          const blockDims = getBlockDimensions(task)

          return (
            <Paper
              key={taskId}
              data-task-id={task.id}
              elevation={selectedModuleId === task.id ? 6 : 3}
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
                  isPlay: task.isPlay
                })
              }}
              draggable
              onDragStart={(e) => handleModuleDragStart(task.id, e)}
              onDragOver={(e) => handleModuleDragOver(task.id, e)}
              onDrop={(e) => handleModuleDropOnModule(task.id, e)}
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
                '&:hover': {
                  boxShadow: 6,
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
                      borderBottom: '1px solid #ddd',
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
                      borderBottom: '1px solid #ddd',
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
                      borderBottom: '1px solid #ddd',
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
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Poignées de redimensionnement - 8 directions - seulement pour les blocks non collapsed */}
              {!collapsedBlocks.has(task.id) && (
                <>
                  {/* Coin Nord-Ouest */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'nw', e)}
                    sx={{
                      position: 'absolute',
                      top: -6,
                      left: -6,
                      width: 16,
                      height: 16,
                      cursor: 'nwse-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'nw' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: '50%',
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'scale(1.3)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Coin Nord-Est */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'ne', e)}
                    sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 16,
                      height: 16,
                      cursor: 'nesw-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'ne' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: '50%',
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'scale(1.3)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Coin Sud-Ouest */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'sw', e)}
                    sx={{
                      position: 'absolute',
                      bottom: -6,
                      left: -6,
                      width: 16,
                      height: 16,
                      cursor: 'nesw-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'sw' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: '50%',
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'scale(1.3)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Coin Sud-Est */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'se', e)}
                    sx={{
                      position: 'absolute',
                      bottom: -6,
                      right: -6,
                      width: 16,
                      height: 16,
                      cursor: 'nwse-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'se' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: '50%',
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'scale(1.3)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Bord Nord */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'n', e)}
                    sx={{
                      position: 'absolute',
                      top: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 40,
                      height: 12,
                      cursor: 'ns-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'n' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: 2,
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'translateX(-50%) scaleY(1.4)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Bord Sud */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 's', e)}
                    sx={{
                      position: 'absolute',
                      bottom: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 40,
                      height: 12,
                      cursor: 'ns-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 's' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: 2,
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'translateX(-50%) scaleY(1.4)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Bord Ouest */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'w', e)}
                    sx={{
                      position: 'absolute',
                      left: -6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 12,
                      height: 40,
                      cursor: 'ew-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'w' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: 2,
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'translateY(-50%) scaleX(1.4)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />

                  {/* Bord Est */}
                  <Box
                    onMouseDown={(e) => handleResizeStart(task.id, 'e', e)}
                    sx={{
                      position: 'absolute',
                      right: -6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 12,
                      height: 40,
                      cursor: 'ew-resize',
                      bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'e' ? getSectionColor(section) : `${getSectionColor(section)}CC`,
                      border: `2px solid white`,
                      borderRadius: 2,
                      opacity: 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': { bgcolor: getSectionColor(section), transform: 'translateY(-50%) scaleX(1.4)' },
                      transition: 'all 0.2s',
                      zIndex: 20,
                    }}
                  />
                </>
              )}
            </Paper>
          )
        }

        // Sinon c'est une tâche simple
        return (
          <Paper
            key={taskId}
            data-task-id={task.id}
            elevation={selectedModuleId === task.id ? 6 : 3}
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
                isPlay: task.isPlay
              })
            }}
            draggable
            onDragStart={(e) => handleModuleDragStart(task.id, e)}
            onDragOver={(e) => handleModuleDragOver(task.id, e)}
            onDrop={(e) => handleModuleDropOnModule(task.id, e)}
            sx={{
              position: 'absolute',
              left: task.x || 10,
              top: task.y || 10,
              width: 140,
              minHeight: 60,
              p: 0.75,
              cursor: 'move',
              border: selectedModuleId === task.id ? `2px solid ${taskTheme.borderColor}` : 'none',
              zIndex: draggedModuleId === task.id ? 10 : 1,
              opacity: draggedModuleId === task.id ? 0.7 : 1,
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            {/* ID et nom de la tâche */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
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
            </Box>

            {/* Module name */}
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
              {task.name}
            </Typography>

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
