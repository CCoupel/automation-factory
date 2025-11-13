import { Box, Paper, IconButton, TextField, Typography, Tooltip } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SecurityIcon from '@mui/icons-material/Security'
import LoopIcon from '@mui/icons-material/Loop'
import SendIcon from '@mui/icons-material/Send'
import React from 'react'
import BlockSectionContent from './BlockSectionContent'

interface ModuleBlock {
  id: string
  collection: string
  name: string
  description: string
  taskName: string
  x: number
  y: number
  isBlock?: boolean
  isPlay?: boolean
  inventory?: string
  children?: string[]
  blockSections?: {
    normal: string[]
    rescue: string[]
    always: string[]
  }
  parentId?: string
  parentSection?: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  width?: number
  height?: number
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
  delegateTo?: string
}

interface PlaySectionContentProps {
  sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  modules: ModuleBlock[]
  selectedModuleId: string | null
  draggedModuleId: string | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  resizingBlock: { id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null
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
    backgroundColor: string
    borderColor: string
    borderColorSelected: string
    iconColor: string
  }
  getBlockDimensions: (block: ModuleBlock) => { width: number; height: number }
  getSectionColor: (section: 'normal' | 'rescue' | 'always') => string
  getPlaySectionColor: (section: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => string
}

const PlaySectionContent: React.FC<PlaySectionContentProps> = ({
  sectionName,
  modules,
  selectedModuleId,
  draggedModuleId,
  collapsedBlocks,
  collapsedBlockSections,
  resizingBlock,
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
                  width: task.width || dimensions.width,
                  height: task.height || dimensions.height,
                  p: 1,
                  cursor: 'move',
                  border: selectedModuleId === task.id ? `2px solid ${blockTheme.borderColorSelected}` : `2px solid ${blockTheme.borderColor}`,
                  borderRadius: 2,
                  bgcolor: blockTheme.backgroundColor,
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
                  <Box sx={{ display: 'flex', gap: 0.5, pl: 3, mt: 0.5 }}>
                    <Tooltip title={task.when ? `Condition: ${task.when}` : 'No condition'}>
                      <HelpOutlineIcon sx={{ fontSize: 12, color: task.when ? '#1976d2' : '#ccc' }} />
                    </Tooltip>
                    <Tooltip title={task.ignoreErrors ? 'Ignore errors: yes' : 'Ignore errors: no'}>
                      <ErrorOutlineIcon sx={{ fontSize: 12, color: task.ignoreErrors ? '#f57c00' : '#ccc' }} />
                    </Tooltip>
                    <Tooltip title={task.become ? 'Become: yes (sudo)' : 'Become: no'}>
                      <SecurityIcon sx={{ fontSize: 12, color: task.become ? '#d32f2f' : '#ccc' }} />
                    </Tooltip>
                    <Tooltip title={task.delegateTo ? `Delegate to: ${task.delegateTo}` : 'No delegation'}>
                      <SendIcon sx={{ fontSize: 12, color: task.delegateTo ? '#00bcd4' : '#ccc' }} />
                    </Tooltip>
                  </Box>
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'nw' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: '50%',
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'scale(1.3)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'ne' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: '50%',
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'scale(1.3)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'sw' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: '50%',
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'scale(1.3)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'se' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: '50%',
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'scale(1.3)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'n' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: 2,
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'translateX(-50%) scaleY(1.4)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 's' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: 2,
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'translateX(-50%) scaleY(1.4)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'w' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: 2,
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'translateY(-50%) scaleX(1.4)' },
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
                        bgcolor: resizingBlock?.id === task.id && resizingBlock?.direction === 'e' ? getPlaySectionColor(sectionName) : `${getPlaySectionColor(sectionName)}CC`,
                        border: `2px solid white`,
                        borderRadius: 2,
                        opacity: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: getPlaySectionColor(sectionName), transform: 'translateY(-50%) scaleX(1.4)' },
                        transition: 'all 0.2s',
                        zIndex: 20,
                      }}
                    />
                  </>
                )}
              </Paper>
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
                width: task.isPlay ? 100 : 140,
                minHeight: 60,
                p: 1.5,
                cursor: task.isPlay ? 'pointer' : 'move',
                border: task.isPlay ? `2px solid ${getPlaySectionColor(sectionName)}` : '2px solid #ddd',
                borderRadius: task.isPlay ? '0 50% 50% 0' : 2,
                bgcolor: task.isPlay ? `${getPlaySectionColor(sectionName)}15` : 'background.paper',
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
                  {modules.filter(m => m.parentSection === sectionName).indexOf(task) + 1}
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
              <Box sx={{ mt: 0.25, display: 'flex', gap: 0.5, minHeight: 14 }}>
                <Tooltip title={task.when ? `Condition: ${task.when}` : 'No condition'}>
                  <HelpOutlineIcon sx={{ fontSize: 12, color: task.when ? '#1976d2' : '#ccc' }} />
                </Tooltip>
                <Tooltip title={task.ignoreErrors ? 'Ignore errors: yes' : 'Ignore errors: no'}>
                  <ErrorOutlineIcon sx={{ fontSize: 12, color: task.ignoreErrors ? '#f57c00' : '#ccc' }} />
                </Tooltip>
                <Tooltip title={task.become ? 'Become: yes (sudo)' : 'Become: no'}>
                  <SecurityIcon sx={{ fontSize: 12, color: task.become ? '#d32f2f' : '#ccc' }} />
                </Tooltip>
                <Tooltip title={task.loop ? `Loop: ${task.loop}` : 'No loop'}>
                  <LoopIcon sx={{ fontSize: 12, color: task.loop ? '#388e3c' : '#ccc' }} />
                </Tooltip>
                <Tooltip title={task.delegateTo ? `Delegate to: ${task.delegateTo}` : 'No delegation'}>
                  <SendIcon sx={{ fontSize: 12, color: task.delegateTo ? '#00bcd4' : '#ccc' }} />
                </Tooltip>
              </Box>
            </Paper>
          )
        })
      }
    </>
  )
}

export default PlaySectionContent
