import { Box, Paper, IconButton, TextField, Typography, Tooltip, Badge } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import React from 'react'
import BlockSectionContent from './BlockSectionContent'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import StartTaskWithBadge from '../common/StartTaskWithBadge'
import ResizeHandles from '../common/ResizeHandles'
import { ModuleBlock, Link } from '../../types/playbook'

interface PlaySectionContentProps {
  sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  modules: ModuleBlock[]
  selectedModuleId: string | null
  draggedModuleId: string | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  resizingBlock: { id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null
  getStartChainCount: (startId: string) => number
  onSelectModule: (module: {
    id: string
    name: string
    collection: string
    taskName: string
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
    isBlock?: boolean
    isPlay?: boolean
  }) => void
  updateTaskName: (id: string, newName: string) => void
  toggleBlockCollapse: (blockId: string) => void
  toggleBlockSection: (blockId: string, section: 'normal' | 'rescue' | 'always') => void
  isSectionCollapsed: (blockId: string, section: 'normal' | 'rescue' | 'always') => boolean
  handleModuleDragStart: (id: string, e: React.DragEvent) => void
  handleModuleDragOver: (targetId: string, e: React.DragEvent) => void
  handleModuleDropOnModule: (targetId: string, e: React.DragEvent) => void
  handleBlockSectionDrop: (blockId: string, section: 'normal' | 'rescue' | 'always', e: React.DragEvent) => void
  handleResizeStart: (blockId: string, direction: string, e: React.MouseEvent) => void
  getBlockTheme: (blockId: string) => {
    borderColor: string
    bgColor: string
    iconColor: string
  }
  getBlockDimensions: (block: ModuleBlock) => { width: number; height: number }
  getSectionColor: (section: 'normal' | 'rescue' | 'always') => string
  getPlaySectionColor: (section: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => string
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

const PlaySectionContent: React.FC<PlaySectionContentProps> = ({
  sectionName,
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
  getPlaySectionColor,
  // Props pour SectionLinks
  links,
  getLinkStyle,
  deleteLink,
  hoveredLinkId,
  setHoveredLinkId,
  getModuleOrVirtual,
  getModuleDimensions,
}) => {
  return (
    <>
      {modules
        .filter(m => m.parentSection === sectionName)
        .map(task => {
          // Si c'est un block, rendre avec ses 3 sections
          if (task.isBlock) {
            const blockTheme = getBlockTheme(task.id)
            const dimensions = getBlockDimensions(task)

            return (
              <Paper
                key={task.id}
                data-task-id={task.id}
                elevation={selectedModuleId === task.id ? 6 : 3}
                onClick={() => onSelectModule({
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
                })}
                draggable={true}
                onDragStart={(e) => handleModuleDragStart(task.id, e)}
                onDragOver={(e) => handleModuleDragOver(task.id, e)}
                onDrop={(e) => handleModuleDropOnModule(task.id, e)}
                sx={{
                  position: 'absolute',
                  left: task.x,
                  top: task.y,
                  width: dimensions.width,
                  height: dimensions.height,
                  p: 1,
                  cursor: 'move',
                  border: `2px solid ${blockTheme.borderColor}`,
                  borderRadius: 2,
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pb: 0.5, borderBottom: `1px solid ${blockTheme.borderColor}` }}>
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

                {/* Sections du block (normal, rescue, always) */}
                {!collapsedBlocks.has(task.id) && (
                  <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Section Normal */}
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
                        Tasks ({task.blockSections?.normal.length || 0})
                      </Typography>
                    </Box>

                    {/* Contenu section Normal */}
                    {!isSectionCollapsed(task.id, 'normal') && (
                      <Box
                        sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('normal')}08`, p: 0.5 }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          // Ne pas bloquer la propagation
                        }}
                        onDrop={(e) => handleBlockSectionDrop(task.id, 'normal', e)}
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

                        {/* Render links for this block section */}
                        <SectionLinks
                          links={links}
                          modules={modules}
                          sectionType="block"
                          sectionName="normal"
                          parentId={task.id}
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
                        Rescue ({task.blockSections?.rescue.length || 0})
                      </Typography>
                    </Box>

                    {/* Contenu section Rescue */}
                    {!isSectionCollapsed(task.id, 'rescue') && (
                      <Box
                        sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('rescue')}08`, p: 0.5 }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          // Ne pas bloquer la propagation
                        }}
                        onDrop={(e) => handleBlockSectionDrop(task.id, 'rescue', e)}
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

                        {/* Render links for this block section */}
                        <SectionLinks
                          links={links}
                          modules={modules}
                          sectionType="block"
                          sectionName="rescue"
                          parentId={task.id}
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
                        Always ({task.blockSections?.always.length || 0})
                      </Typography>
                    </Box>

                    {/* Contenu section Always */}
                    {!isSectionCollapsed(task.id, 'always') && (
                      <Box
                        sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: `${getSectionColor('always')}08`, p: 0.5 }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          // Ne pas bloquer la propagation
                        }}
                        onDrop={(e) => handleBlockSectionDrop(task.id, 'always', e)}
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

                        {/* Render links for this block section */}
                        <SectionLinks
                          links={links}
                          modules={modules}
                          sectionType="block"
                          sectionName="always"
                          parentId={task.id}
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

          // Si c'est une START task, rendre comme un mini START avec badge
          if (task.isPlay) {
            return (
              <StartTaskWithBadge
                key={task.id}
                startId={task.id}
                position={{ x: task.x, y: task.y }}
                color={getPlaySectionColor(sectionName)}
                badgeCount={getStartChainCount(task.id)}
                isDragged={draggedModuleId === task.id}
                onDragStart={(e) => handleModuleDragStart(task.id, e)}
                onDragOver={(e) => {
                  e.preventDefault()
                }}
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

          // Sinon, rendre une tâche normale
          return (
            <Paper
              key={task.id}
              data-task-id={task.id}
              elevation={selectedModuleId === task.id ? 6 : 3}
              onClick={() => onSelectModule({
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
              })}
              draggable={true}
              onDragStart={(e) => handleModuleDragStart(task.id, e)}
              onDragOver={(e) => handleModuleDragOver(task.id, e)}
              onDrop={(e) => handleModuleDropOnModule(task.id, e)}
              sx={{
                position: 'absolute',
                left: task.x,
                top: task.y,
                width: 140,
                minHeight: 60,
                p: 1.5,
                cursor: 'move',
                border: '2px solid #ddd',
                borderRadius: 2,
                bgcolor: 'background.paper',
                zIndex: draggedModuleId === task.id ? 10 : 1,
                opacity: draggedModuleId === task.id ? 0.7 : 1,
                '&:hover': {
                  boxShadow: 6,
                },
              }}
            >
              {/* ID et nom de la tâche sur la même ligne */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Box
                  sx={{
                    minWidth: 18,
                    height: 18,
                    px: 0.5,
                    borderRadius: '4px',
                    bgcolor: getPlaySectionColor(sectionName),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.6rem',
                    flexShrink: 0,
                  }}
                >
                  {modules.filter(m => m.parentSection === sectionName && !m.isPlay).indexOf(task) + 1}
                </Box>
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
                      padding: '0',
                    },
                    '& .MuiInput-root:before': {
                      borderBottom: 'none',
                    },
                    '& .MuiInput-root:hover:not(.Mui-disabled):before': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.42)',
                    },
                  }}
                />
              </Box>

              {/* Nom du module */}
              <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>
                {task.collection}.{task.name}
              </Typography>

              {/* Icônes d'attributs de tâche */}
              <TaskAttributeIcons
                attributes={{
                  when: task.when,
                  ignoreErrors: task.ignoreErrors,
                  become: task.become,
                  loop: task.loop,
                  delegateTo: task.delegateTo
                }}
                size="small"
                sx={{ mt: 0.25, minHeight: 14 }}
              />
            </Paper>
          )
        })
      }
    </>
  )
}

export default PlaySectionContent
