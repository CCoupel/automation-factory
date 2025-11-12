import { Box, Typography, Paper, IconButton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Tabs, Tab, Button, Chip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SecurityIcon from '@mui/icons-material/Security'
import LoopIcon from '@mui/icons-material/Loop'
import SendIcon from '@mui/icons-material/Send'
import React, { useState, useRef, useEffect, useCallback } from 'react'

interface ModuleBlock {
  id: string
  collection: string
  name: string
  description: string
  taskName: string
  x: number
  y: number
  isBlock?: boolean // Indique si c'est un block conteneur
  isPlay?: boolean // Indique si c'est un START task (dans une section de PLAY)
  inventory?: string // Inventaire spécifique au PLAY
  children?: string[] // IDs des tâches dans la section normale (deprecated - use blockSections)
  blockSections?: {
    normal: string[]    // IDs des tâches dans la section normale
    rescue: string[]    // IDs des tâches dans la section rescue
    always: string[]    // IDs des tâches dans la section always
  }
  parentId?: string // ID du block parent (si dans un block)
  parentSection?: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' // Section du block parent OU section de PLAY
  width?: number // Largeur personnalisée du block
  height?: number // Hauteur personnalisée du block
  // Attributs de tâche
  when?: string // Condition when
  ignoreErrors?: boolean // Ignorer les erreurs
  become?: boolean // Exécuter avec sudo
  loop?: string // Définition de la loop
  delegateTo?: string // Délégation à un autre hôte
  // Les variables sont gérées dans Play.variables
  // Les rôles seront gérés séparément (à implémenter)
}

interface Link {
  id: string
  from: string
  to: string
  type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' // Type de lien
}

interface PlayVariable {
  key: string
  value: string
}

interface Play {
  id: string
  name: string
  modules: ModuleBlock[]
  links: Link[]
  variables: PlayVariable[]
}

interface WorkZoneProps {
  onSelectModule: (module: { id: string; name: string; collection: string; taskName: string; when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string; isBlock?: boolean; isPlay?: boolean } | null) => void
  selectedModuleId: string | null
  onDeleteModule?: (deleteHandler: (id: string) => void) => void
  onUpdateModule?: (updateHandler: (id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string }>) => void) => void
}

const WorkZone = ({ onSelectModule, selectedModuleId, onDeleteModule, onUpdateModule }: WorkZoneProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Gestion des PLAYs avec onglets
  const [plays, setPlays] = useState<Play[]>([
    {
      id: 'play-1',
      name: 'Play 1',
      modules: [
        // START task for pre_tasks section
        {
          id: 'play-1-start-pre-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for pre-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'pre_tasks',
        },
        // START task for tasks section
        {
          id: 'play-1-start-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'tasks',
        },
        // START task for post_tasks section
        {
          id: 'play-1-start-post-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for post-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'post_tasks',
        },
        // START task for handlers section
        {
          id: 'play-1-start-handlers',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for handlers',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'handlers',
        },
      ],
      links: [],
      variables: [
        { key: 'ansible_user', value: 'root' },
        { key: 'ansible_port', value: '22' },
      ],
    },
  ])
  const [activePlayIndex, setActivePlayIndex] = useState(0)

  // Récupérer le PLAY actif
  const currentPlay = plays[activePlayIndex]
  const modules = currentPlay.modules
  const links = currentPlay.links

  // Fonctions pour mettre à jour le PLAY actif
  const setModules = (newModules: ModuleBlock[] | ((prev: ModuleBlock[]) => ModuleBlock[])) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        modules: typeof newModules === 'function' ? newModules(updatedPlays[activePlayIndex].modules) : newModules
      }
      return updatedPlays
    })
  }

  const setLinks = (newLinks: Link[] | ((prev: Link[]) => Link[])) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        links: typeof newLinks === 'function' ? newLinks(updatedPlays[activePlayIndex].links) : newLinks
      }
      return updatedPlays
    })
  }

  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)
  const [gridEnabled, setGridEnabled] = useState(false)
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null)
  // Toutes les sections sont collapsed par défaut
  const [collapsedBlockSections, setCollapsedBlockSections] = useState<Set<string>>(new Set(['*:rescue', '*:always'])) // Format: "blockId:section" - Tasks ouverte par défaut
  // Sections du PLAY - Format: "playId:section" - Variables et Tasks ouvertes par défaut
  const [collapsedPlaySections, setCollapsedPlaySections] = useState<Set<string>>(new Set(['*:pre_tasks', '*:post_tasks', '*:handlers']))
  const [resizingBlock, setResizingBlock] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null>(null)

  const GRID_SIZE = 50

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  // Calculer les dimensions d'un block basé sur ses enfants
  const getBlockDimensions = (block: ModuleBlock) => {
    // Les PLAY ont la taille d'une tâche normale (150px x 50px)
    if (block.isPlay) {
      return { width: 150, height: 50 }
    }

    // Si le block est collapsed, retourner seulement la hauteur du header
    if (collapsedBlocks.has(block.id)) {
      return { width: block.width || 250, height: 50 }
    }

    // Si le block a des dimensions personnalisées, les utiliser
    if (block.width && block.height) {
      return { width: block.width, height: block.height }
    }

    // Les blocks normaux - calculer automatiquement selon les sections
    const baseWidth = 250
    const headerHeight = 50
    const sectionHeaderHeight = 25
    const minSectionContentHeight = 200 // Hauteur minimum de chaque section

    let totalHeight = headerHeight

    // Avec le comportement accordion, compter seulement les headers de toutes les sections
    // et le contenu de la section ouverte
    const sections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

    // Ajouter les headers de toutes les sections
    totalHeight += sections.length * sectionHeaderHeight

    // Ajouter le contenu seulement pour la section ouverte (s'il y en a une)
    const openSection = sections.find(section => !isSectionCollapsed(block.id, section))
    if (openSection) {
      totalHeight += minSectionContentHeight
    }

    return {
      width: baseWidth,
      height: totalHeight
    }
  }

  // Obtenir le thème de couleur d'un PLAY (toujours vert)
  const getPlayTheme = () => {
    return {
      borderColor: '#2e7d32',
      backgroundColor: 'rgba(46, 125, 50, 0.08)',
      iconColor: '#2e7d32',
      borderColorSelected: '#1b5e20'
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    const target = e.target as HTMLElement
    const blockContainerElem = target.closest('.block-container')

    console.log('🎯 [CANVAS DROP] Début handleDrop:', {
      targetClass: target.className,
      hasBlockContainer: !!blockContainerElem,
      clientX: e.clientX,
      clientY: e.clientY
    })

    // Toujours utiliser le canvas principal pour le calcul de position
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    const moduleData = e.dataTransfer.getData('module')
    const existingModuleId = e.dataTransfer.getData('existingModule')

    console.log('📦 [CANVAS DROP] Données du drag:', {
      hasModuleData: !!moduleData,
      existingModuleId,
      moduleDataParsed: moduleData ? JSON.parse(moduleData).name : null
    })

    // Déterminer si c'est un block/PLAY qui est déplacé
    const movedModule = existingModuleId ? modules.find(m => m.id === existingModuleId) : null
    const isMovingBlockOrPlay = movedModule && (movedModule.isBlock || movedModule.isPlay)

    console.log('🚚 [CANVAS DROP] Module déplacé:', {
      movedModuleName: movedModule?.taskName,
      isBlock: movedModule?.isBlock,
      isPlay: movedModule?.isPlay,
      isMovingBlockOrPlay,
      parentId: movedModule?.parentId,
      parentSection: movedModule?.parentSection
    })

    // Récupérer l'offset du drag (où l'utilisateur a cliqué sur le module)
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')

    // Calculer l'offset en fonction du type de module déplacé
    let offsetX = 75 // Par défaut pour une tâche normale (150 / 2)
    let offsetY = 60 // Par défaut pour une tâche normale (120 / 2)

    // Si on a un offset de drag stocké (module déplacé), l'utiliser
    if (dragOffsetXStr && dragOffsetYStr) {
      offsetX = parseFloat(dragOffsetXStr)
      offsetY = parseFloat(dragOffsetYStr)
    } else if (movedModule) {
      // Sinon, si c'est un nouveau module depuis la palette, utiliser le centre
      if (movedModule.isBlock || movedModule.isPlay) {
        const dims = getBlockDimensions(movedModule)
        offsetX = dims.width / 2
        offsetY = dims.height / 2
      }
    }

    // Calculer la position du drop avec l'offset approprié
    console.log('Drop Debug:', {
      clientX: e.clientX,
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      offsetX,
      offsetY,
      movedModule: movedModule?.name,
      isMovingBlockOrPlay
    })

    let x = e.clientX - rect.left - offsetX
    let y = e.clientY - rect.top - offsetY

    console.log('Calculated position:', { x, y })

    if (gridEnabled) {
      x = snapToGrid(x)
      y = snapToGrid(y)
    }

    // Cas 1: Drop dans un block container (zone vide du block)
    // Seulement pour les tâches normales, pas pour les blocks/PLAY
    if (blockContainerElem && !isMovingBlockOrPlay) {
      const blockId = blockContainerElem.getAttribute('data-block-id')
      const block = modules.find(m => m.id === blockId)

      if (block && block.isBlock) {
        // Calculer la position relative au block parent
        const blockContainerRect = blockContainerElem.getBoundingClientRect()
        let relativeX = e.clientX - blockContainerRect.left - offsetX
        let relativeY = e.clientY - blockContainerRect.top - offsetY

        // Contraintes pour garder la tâche dans le block
        const taskWidth = 140
        const taskHeight = 60
        const blockDims = getBlockDimensions(block)
        const containerPadding = 8 // padding du block-container
        const maxX = blockDims.width - taskWidth - containerPadding * 2
        const maxY = blockDims.height - taskHeight - 50 - containerPadding * 2 // 50 = hauteur du header

        // Limiter les positions
        relativeX = Math.max(0, Math.min(relativeX, maxX))
        relativeY = Math.max(0, Math.min(relativeY, maxY))

        // Cas 1a: Déplacement d'un module existant dans le block
        if (existingModuleId) {
          // Tâche normale - on peut la mettre dans le block
          setModules(prev => prev.map(m => {
            // Retirer du parent précédent si différent
            if (m.id === movedModule?.parentId && movedModule.parentId !== blockId && m.children) {
              return { ...m, children: m.children.filter(id => id !== existingModuleId) }
            }
            // Ajouter au nouveau parent si pas déjà dedans
            if (m.id === blockId && !m.children?.includes(existingModuleId)) {
              return { ...m, children: [...(m.children || []), existingModuleId] }
            }
            // Mettre à jour la position du module déplacé
            if (m.id === existingModuleId) {
              return { ...m, x: relativeX, y: relativeY, parentId: blockId }
            }
            return m
          }))
          setDraggedModuleId(null)
          return
        }

        // Cas 1b: Nouveau module depuis la palette
        if (moduleData && !existingModuleId) {
          const parsedData = JSON.parse(moduleData)
          // Ne pas créer de block dans un block via drop dans la zone
          if (parsedData.name !== 'block') {
            const newModule: ModuleBlock = {
              id: Date.now().toString(),
              collection: parsedData.collection,
              name: parsedData.name,
              description: parsedData.description,
              taskName: `Task with ${parsedData.name}`,
              x: relativeX,
              y: relativeY,
              parentId: blockId,
            }
            setModules(prev => [...prev, newModule])
            setModules(prev => prev.map(m =>
              m.id === blockId ? { ...m, children: [...(m.children || []), newModule.id] } : m
            ))
          }
        }
        return
      }
    }

    // Cas 2: Drop sur la zone de travail (canvas)
    // S'exécute si: pas dans un block-container OU si on déplace un block/PLAY
    if (!blockContainerElem || isMovingBlockOrPlay) {
      if (existingModuleId) {
        // Repositionnement d'un module existant
        const movedModule = modules.find(m => m.id === existingModuleId)

        // Si c'est une tâche dans une section de block
        if (movedModule?.parentId && movedModule?.parentSection && !movedModule.isBlock && !movedModule.isPlay) {
          console.log('🔍 [DROP] Tâche de section détectée:', {
            taskId: existingModuleId,
            taskName: movedModule.taskName,
            parentId: movedModule.parentId,
            parentSection: movedModule.parentSection,
            dropPosition: { x, y }
          })

          // Vérifier si la tâche a des liens
          const hasLinks = links.some(l => l.from === existingModuleId || l.to === existingModuleId)
          console.log('🔗 [DROP] Vérification des liens:', {
            hasLinks,
            allLinks: links.filter(l => l.from === existingModuleId || l.to === existingModuleId)
          })

          if (hasLinks) {
            // A des liens: ne pas permettre le déplacement
            console.log('❌ [DROP] Déplacement bloqué: tâche a des liens')
            setDraggedModuleId(null)
            return
          }

          console.log('✅ [DROP] Déplacement autorisé: sortie de la section vers zone de travail')

          // Pas de liens: permettre le déplacement hors du block
          // Retirer de l'ancienne section
          setModules(prev => prev.map(m => {
            if (m.id === movedModule.parentId) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              const oldSection = movedModule.parentSection!
              console.log('📤 [DROP] Retrait de la section:', { blockId: m.id, section: oldSection })
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [oldSection]: sections[oldSection].filter(id => id !== existingModuleId)
                }
              }
            }
            // Déplacer le module dans la zone de travail
            if (m.id === existingModuleId) {
              console.log('🎯 [DROP] Déplacement vers zone de travail:', { x, y })
              return { ...m, x, y, parentId: undefined, parentSection: undefined }
            }
            return m
          }))

          setDraggedModuleId(null)
          return
        }

        setModules(modules.map(m => {
          // Retirer du parent si dans un block (ancienne logique pour les blocks sans sections)
          if (m.id === movedModule?.parentId && m.children) {
            return { ...m, children: m.children.filter(id => id !== existingModuleId) }
          }
          // Déplacer le module
          if (m.id === existingModuleId) {
            return { ...m, x, y, parentId: undefined }
          }
          // Les enfants du block ne doivent PAS être déplacés car leurs positions sont relatives au parent
          // Seul le block parent bouge
          return m
        }))

        setDraggedModuleId(null)
      } else if (moduleData) {
        // Nouveau module depuis la palette
        const parsedData = JSON.parse(moduleData)
        const isBlock = parsedData.name === 'block'
        const isPlay = parsedData.name === 'play'

        const newModule: ModuleBlock = {
          id: Date.now().toString(),
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description,
          taskName: isPlay ? 'New Play' : isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
          x,
          y,
          isBlock,
          isPlay,
          children: isBlock ? [] : undefined, // Deprecated - use blockSections
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
        }
        setModules([...modules, newModule])
      }
    }
  }

  const handleModuleDragStart = (id: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('existingModule', id)

    // Calculer l'offset du clic par rapport au coin supérieur gauche du module
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    // Stocker l'offset pour l'utiliser lors du drop
    e.dataTransfer.setData('dragOffsetX', offsetX.toString())
    e.dataTransfer.setData('dragOffsetY', offsetY.toString())

    setDraggedModuleId(id)

    // Empêcher la propagation pour éviter que le block parent ne capture le drag
    e.stopPropagation()
  }

  const handleModuleDragOver = (targetId: string, e: React.DragEvent) => {
    e.preventDefault()
    // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
  }

  const handleModuleDropOnModule = (targetId: string, e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')

    // Si on drop un module sur lui-même, laisser l'événement remonter pour le déplacement
    if (sourceId === targetId) {
      // Ne pas appeler preventDefault ni stopPropagation pour permettre le déplacement
      return
    }

    // Bloquer la propagation seulement si on crée un lien
    e.preventDefault()
    e.stopPropagation()

    // Si on drop un module existant sur un autre
    if (sourceId && sourceId !== targetId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      const targetModule = modules.find(m => m.id === targetId)

      if (!sourceModule || !targetModule) return

      // Vérifier si les deux modules sont dans la même section du même block
      const areBothInSameSection = sourceModule?.parentId && targetModule?.parentId &&
        sourceModule.parentId === targetModule.parentId &&
        sourceModule.parentSection === targetModule.parentSection

      // CAS SPÉCIAL: Si la source est externe et la cible est dans un block
      const isSourceExternal = !sourceModule.parentId
      const isTargetInBlock = targetModule.parentId && targetModule.parentSection

      if (isSourceExternal && isTargetInBlock) {
        // Vérifier si la source a un lien entrant
        const sourceHasIncomingLink = links.some(l => l.to === sourceId)

        if (sourceHasIncomingLink) {
          // Créer un lien entre la source et le block parent de la cible
          createLink('normal', sourceId, targetModule.parentId!)
        } else {
          // Déplacer la source dans la section de la cible
          const targetParentBlock = modules.find(m => m.id === targetModule.parentId)
          if (targetParentBlock) {
            // Calculer une position dans la section (à côté de la cible)
            const offsetX = (targetModule.x || 10) + 160 // Décalage horizontal
            const offsetY = targetModule.y || 10

            addTaskToBlockSection(sourceId, targetModule.parentId!, targetModule.parentSection!, offsetX, offsetY)
          }
        }
        return
      }

      // CAS NORMAL: Les deux sont dans la même section du même block, ou tous deux externes
      const canCreateLink = areBothInSameSection ||
        (sourceModule.parentId !== targetId && targetModule.parentId !== sourceId && !isTargetInBlock)

      if (canCreateLink) {
        // Tous les liens sont maintenant de type 'normal' (les sections dans les blocks géreront rescue/always)
        createLink('normal', sourceId, targetId)
      }
    }
    setDraggedModuleId(null)
  }

  const createLink = (type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers', fromId: string, toId: string) => {
    const sourceId = fromId
    const targetId = toId

    if (!sourceId || !targetId) return

    // Vérifier si la source est un PLAY
    const sourceModule = modules.find(m => m.id === sourceId)

    // Pour les liens PLAY (pre_tasks, tasks, post_tasks, handlers), un seul lien par type
    if (type === 'pre_tasks' || type === 'tasks' || type === 'post_tasks' || type === 'handlers') {
      const hasOutgoingOfThisType = links.some(l => l.from === sourceId && l.type === type)
      if (hasOutgoingOfThisType) {
        setLinks(links.filter(l => !(l.from === sourceId && l.type === type)))
      }
    }
    // Vérifier et supprimer les liens existants selon le type
    else if (type === 'normal') {
      // Une tâche ne peut avoir qu'une seule sortie normale
      const hasOutgoingNormal = links.some(l => l.from === sourceId && l.type === 'normal')
      const hasIncomingNormal = links.some(l => l.to === targetId && l.type === 'normal')

      if (hasOutgoingNormal) {
        setLinks(links.filter(l => !(l.from === sourceId && l.type === 'normal')))
      }
      if (hasIncomingNormal) {
        setLinks(prevLinks => prevLinks.filter(l => !(l.to === targetId && l.type === 'normal')))
      }
    } else if (type === 'rescue') {
      // Un block ne peut avoir qu'une seule sortie rescue
      const hasOutgoingRescue = links.some(l => l.from === sourceId && l.type === 'rescue')
      if (hasOutgoingRescue) {
        setLinks(links.filter(l => !(l.from === sourceId && l.type === 'rescue')))
      }
    } else if (type === 'always') {
      // Un block ne peut avoir qu'une seule sortie always
      const hasOutgoingAlways = links.some(l => l.from === sourceId && l.type === 'always')
      if (hasOutgoingAlways) {
        setLinks(links.filter(l => !(l.from === sourceId && l.type === 'always')))
      }
    }

    // Créer le nouveau lien
    const linkExists = links.some(l =>
      l.from === sourceId && l.to === targetId && l.type === type
    )

    if (!linkExists) {
      const newLink: Link = {
        id: `link-${Date.now()}`,
        from: sourceId,
        to: targetId,
        type
      }
      setLinks(prevLinks => [...prevLinks, newLink])
    }
  }

  const updateTaskName = (id: string, newName: string) => {
    // Trouver le module à mettre à jour
    const module = modules.find(m => m.id === id)

    // Si c'est un PLAY, synchroniser avec le nom de l'onglet
    if (module?.isPlay) {
      setPlays(prevPlays => {
        const updatedPlays = [...prevPlays]
        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          name: newName,
          modules: updatedPlays[activePlayIndex].modules.map(m =>
            m.id === id ? { ...m, taskName: newName } : m
          )
        }
        return updatedPlays
      })
    } else {
      // Pour les autres tâches, mise à jour normale
      setModules(modules.map(m => m.id === id ? { ...m, taskName: newName } : m))
    }
  }

  const updateInventory = (id: string, newInventory: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, inventory: newInventory } : m))
  }

  const deleteLink = (linkId: string) => {
    setLinks(links.filter(l => l.id !== linkId))
  }

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  const addTaskToBlockSection = (taskId: string, blockId: string, section: 'normal' | 'rescue' | 'always', x?: number, y?: number) => {
    const task = modules.find(m => m.id === taskId)
    const block = modules.find(m => m.id === blockId)

    if (!task || !block || !block.isBlock) return

    // Si la tâche vient d'une autre section du même block, la retirer de l'ancienne section
    const oldSection = task.parentSection

    // Mettre à jour le block pour ajouter la tâche à la section appropriée
    setModules(modules.map(m => {
      if (m.id === blockId) {
        const sections = m.blockSections || { normal: [], rescue: [], always: [] }

        // Retirer de l'ancienne section si elle change
        const updatedSections = { ...sections }
        if (oldSection && oldSection !== section && updatedSections[oldSection]) {
          updatedSections[oldSection] = updatedSections[oldSection].filter(id => id !== taskId)
        }

        // Ajouter à la nouvelle section si pas déjà présente
        if (!updatedSections[section].includes(taskId)) {
          updatedSections[section] = [...updatedSections[section], taskId]
        }

        return {
          ...m,
          blockSections: updatedSections
        }
      }
      // Mettre à jour la tâche avec le parent, la section et la position
      if (m.id === taskId) {
        return {
          ...m,
          parentId: blockId,
          parentSection: section,
          x: x !== undefined ? x : (m.x || 10),
          y: y !== undefined ? y : (m.y || 10)
        }
      }
      return m
    }))
  }

  const toggleBlockSection = (blockId: string, section: 'normal' | 'rescue' | 'always') => {
    const key = `${blockId}:${section}`
    const wildcardKey = `*:${section}`
    setCollapsedBlockSections(prev => {
      const newSet = new Set(prev)

      // Si la section est actuellement collapsed (va être ouverte)
      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        // Fermer toutes les sections de ce block
        const otherSections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']
        otherSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${blockId}:${s}`)
        })

        // Ouvrir uniquement la section cliquée
        newSet.delete(wildcardKey)
        newSet.delete(key)
      } else {
        // Si déjà ouverte, la fermer
        newSet.add(key)
      }

      return newSet
    })
  }

  const isSectionCollapsed = (blockId: string, section: 'normal' | 'rescue' | 'always') => {
    const key = `${blockId}:${section}`
    const wildcardKey = `*:${section}`
    return collapsedBlockSections.has(key) || collapsedBlockSections.has(wildcardKey)
  }

  const isPlaySectionCollapsed = (playId: string, section: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    const key = `${playId}:${section}`
    const wildcardKey = `*:${section}`
    return collapsedPlaySections.has(key) || collapsedPlaySections.has(wildcardKey)
  }

  const togglePlaySection = (playId: string, section: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    setCollapsedPlaySections(prev => {
      const newSet = new Set(prev)
      const key = `${playId}:${section}`
      const wildcardKey = `*:${section}`

      // La section Variables fonctionne indépendamment (pas d'accordion)
      if (section === 'variables') {
        newSet.delete(wildcardKey)
        if (newSet.has(key)) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
        return newSet
      }

      // Comportement accordion pour les sections de tâches uniquement
      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        // Fermer toutes les sections de tâches de ce PLAY (pas Variables)
        const taskSections: Array<'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'> = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']
        taskSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${playId}:${s}`)
        })

        // Ouvrir uniquement la section cliquée
        newSet.delete(wildcardKey)
        newSet.delete(key)
      }
      // Si déjà ouverte, ne rien faire (garder au moins une section de tâches ouverte)

      return newSet
    })
  }

  const handlePlaySectionDrop = (section: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers', e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')

    // Calculer la position relative à la section
    const sectionElem = e.currentTarget as HTMLElement
    const sectionRect = sectionElem.getBoundingClientRect()
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
    const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
    const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

    let relativeX = e.clientX - sectionRect.left - offsetX
    let relativeY = e.clientY - sectionRect.top - offsetY

    // Contraindre dans les limites de la section
    const taskWidth = 140
    const taskHeight = 60
    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

    // Cas 1: Module existant déplacé
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      // Ne pas autoriser le déplacement des tâches START
      if (sourceModule.isPlay) return

      // Sous-cas 1.1: Même section - repositionnement
      if (sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        return
      }
      // Sous-cas 1.2: Tâche externe (autre section ou zone de travail)
      else {
        // Vérifier si la tâche a des liens
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          // Pas de liens: déplacer la tâche dans cette section
          e.preventDefault()
          e.stopPropagation()

          // Mettre à jour la tâche avec la nouvelle section et position
          setModules(prev => prev.map(m =>
            m.id === sourceId ? { ...m, parentSection: section, x: relativeX, y: relativeY, parentId: undefined } : m
          ))
          return
        } else {
          // A des liens: on ne peut pas déplacer une tâche avec des liens entre sections
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    }
    // Cas 2: Nouveau module depuis la palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      // Ne pas permettre de déposer un block dans une section
      if (parsedData.name !== 'block' && parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const newModule: ModuleBlock = {
          id: `module-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: `${parsedData.name} task`,
          x: relativeX,
          y: relativeY,
          isBlock: parsedData.name === 'block',
          parentSection: section, // Assigner à la section du PLAY
        }

        setModules([...modules, newModule])
      }
    }
  }

  const getPlaySectionColor = (section: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    switch (section) {
      case 'variables':
        return '#673ab7' // Violet profond
      case 'pre_tasks':
        return '#9c27b0' // Violet
      case 'tasks':
        return '#1976d2' // Bleu
      case 'post_tasks':
        return '#00796b' // Vert foncé
      case 'handlers':
        return '#ff9800' // Orange
      default:
        return '#757575' // Gris
    }
  }

  const getSectionColor = (section: 'normal' | 'rescue' | 'always') => {
    switch (section) {
      case 'normal':
        return '#1976d2' // Bleu
      case 'rescue':
        return '#ff9800' // Orange
      case 'always':
        return '#4caf50' // Vert
    }
  }

  const handleBlockResizeStart = (blockId: string, direction: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const block = modules.find(m => m.id === blockId)
    if (!block) return

    const dimensions = getBlockDimensions(block)
    setResizingBlock({
      id: blockId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
      startBlockX: block.x,
      startBlockY: block.y,
      direction
    })
  }

  const handleBlockResize = (e: MouseEvent) => {
    if (!resizingBlock) return

    const deltaX = e.clientX - resizingBlock.startX
    const deltaY = e.clientY - resizingBlock.startY

    const direction = resizingBlock.direction

    let newWidth = resizingBlock.startWidth
    let newHeight = resizingBlock.startHeight
    let newX = resizingBlock.startBlockX
    let newY = resizingBlock.startBlockY

    // Calculer nouvelles dimensions selon la direction
    if (direction.includes('e')) { // East (droite)
      newWidth = resizingBlock.startWidth + deltaX
    }
    if (direction.includes('w')) { // West (gauche)
      newWidth = resizingBlock.startWidth - deltaX
      newX = resizingBlock.startBlockX + deltaX
    }
    if (direction.includes('s')) { // South (bas)
      newHeight = resizingBlock.startHeight + deltaY
    }
    if (direction.includes('n')) { // North (haut)
      newHeight = resizingBlock.startHeight - deltaY
      newY = resizingBlock.startBlockY + deltaY
    }

    // Calculer la taille minimale basée sur les tâches enfants
    const taskWidth = 140
    const taskHeight = 60
    const containerPadding = 8
    const headerHeight = 50

    // Trouver les enfants de ce block
    const children = modules.filter(m => m.parentId === resizingBlock.id)

    // Calculer la taille minimale nécessaire pour contenir toutes les tâches
    let minWidth = 250
    let minHeight = 150

    if (children.length > 0) {
      const maxChildX = Math.max(...children.map(c => c.x + taskWidth))
      const maxChildY = Math.max(...children.map(c => c.y + taskHeight))

      minWidth = Math.max(250, maxChildX + containerPadding * 2)
      minHeight = Math.max(150, maxChildY + headerHeight + containerPadding * 2)
    }

    // Limites minimales basées sur les enfants
    if (newWidth < minWidth) {
      newWidth = minWidth
      // Si on redimensionne par la gauche, ajuster la position X
      if (direction.includes('w')) {
        newX = resizingBlock.startBlockX + resizingBlock.startWidth - minWidth
      }
    }

    if (newHeight < minHeight) {
      newHeight = minHeight
      // Si on redimensionne par le haut, ajuster la position Y
      if (direction.includes('n')) {
        newY = resizingBlock.startBlockY + resizingBlock.startHeight - minHeight
      }
    }

    // Appliquer la grille si activée
    if (gridEnabled) {
      newWidth = snapToGrid(newWidth)
      newHeight = snapToGrid(newHeight)
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
    }

    setModules(prev => prev.map(m =>
      m.id === resizingBlock.id
        ? { ...m, width: newWidth, height: newHeight, x: newX, y: newY }
        : m
    ))
  }

  const handleBlockResizeEnd = () => {
    setResizingBlock(null)
  }

  // Event listeners pour le redimensionnement
  React.useEffect(() => {
    if (resizingBlock) {
      document.addEventListener('mousemove', handleBlockResize as any)
      document.addEventListener('mouseup', handleBlockResizeEnd)
    } else {
      document.removeEventListener('mousemove', handleBlockResize as any)
      document.removeEventListener('mouseup', handleBlockResizeEnd)
    }
    return () => {
      document.removeEventListener('mousemove', handleBlockResize as any)
      document.removeEventListener('mouseup', handleBlockResizeEnd)
    }
  }, [resizingBlock])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDelete = useCallback((id: string) => {
    const module = modules.find(m => m.id === id)

    // Ne pas supprimer la tâche PLAY obligatoire
    if (module?.isPlay) {
      return
    }

    // Désélectionner si c'est le module sélectionné
    if (selectedModuleId === id) {
      onSelectModule(null)
    }

    // Supprimer les liens associés
    setLinks(links.filter(l => l.from !== id && l.to !== id))

    // Si c'est un block, supprimer aussi ses enfants
    if (module?.isBlock && module.children) {
      setModules(modules.filter(m => m.id !== id && !module.children?.includes(m.id)))
    } else {
      // Retirer du parent si dans un block
      setModules(modules.map(m => {
        if (m.children?.includes(id)) {
          return { ...m, children: m.children.filter(childId => childId !== id) }
        }
        return m
      }).filter(m => m.id !== id))
    }
  }, [modules, links, selectedModuleId, onSelectModule, setModules, setLinks])

  // Exposer handleDelete au parent via callback
  useEffect(() => {
    if (onDeleteModule) {
      onDeleteModule(handleDelete)
    }
  }, [handleDelete, onDeleteModule])

  // Fonction pour mettre à jour un module
  const handleUpdateModuleAttributes = useCallback((id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string }>) => {
    // Trouver le module avant la mise à jour
    const module = modules.find(m => m.id === id)
    if (!module) return

    // Mettre à jour le module dans l'état
    setModules(modules.map(m => {
      if (m.id === id) {
        return { ...m, ...updates }
      }
      return m
    }))

    // Mettre à jour aussi le module sélectionné si c'est celui-ci
    if (selectedModuleId === id) {
      onSelectModule({
        id: module.id,
        name: module.name,
        collection: module.collection,
        taskName: module.taskName,
        when: updates.when !== undefined ? updates.when : module.when,
        ignoreErrors: updates.ignoreErrors !== undefined ? updates.ignoreErrors : module.ignoreErrors,
        become: updates.become !== undefined ? updates.become : module.become,
        loop: updates.loop !== undefined ? updates.loop : module.loop,
        delegateTo: updates.delegateTo !== undefined ? updates.delegateTo : module.delegateTo,
        isBlock: module.isBlock,
        isPlay: module.isPlay,
      })
    }
  }, [modules, selectedModuleId, onSelectModule, setModules])

  // Exposer handleUpdateModuleAttributes au parent via callback
  useEffect(() => {
    if (onUpdateModule) {
      onUpdateModule(handleUpdateModuleAttributes)
    }
  }, [handleUpdateModuleAttributes, onUpdateModule])

  // Obtenir le style du lien selon son type
  const getLinkStyle = (type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    switch (type) {
      case 'rescue':
        return { stroke: '#ff9800', strokeDasharray: '5,5', label: 'rescue' }
      case 'always':
        return { stroke: '#4caf50', strokeDasharray: '0', strokeWidth: '3', label: 'always' }
      case 'pre_tasks':
        return { stroke: '#9c27b0', strokeDasharray: '0', label: 'pre_tasks' }
      case 'tasks':
        return { stroke: '#1976d2', strokeDasharray: '0', label: 'tasks' }
      case 'post_tasks':
        return { stroke: '#00796b', strokeDasharray: '0', label: 'post_tasks' }
      case 'handlers':
        return { stroke: '#f57c00', strokeDasharray: '8,4', label: 'handlers' }
      default:
        return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
    }
  }

  // Vérifier si un module est orphelin (récursivement)
  const isOrphan = (moduleId: string, visited = new Set<string>()): boolean => {
    const module = modules.find(m => m.id === moduleId)

    // Un PLAY n'est jamais orphelin (c'est la racine de la généalogie)
    if (module?.isPlay) return false

    // Éviter les boucles infinies
    if (visited.has(moduleId)) return true
    visited.add(moduleId)

    const incomingLink = links.find(l => l.to === moduleId)

    // Pas de lien entrant = orphelin
    if (!incomingLink) return true

    // A un lien entrant, vérifier si la source est orpheline
    return isOrphan(incomingLink.from, visited)
  }

  // Obtenir le thème de couleur d'un block selon le type de lien entrant
  const getBlockTheme = (blockId: string) => {
    const incomingLink = links.find(l => l.to === blockId)

    // Vérifier si le block est orphelin
    if (isOrphan(blockId)) {
      // Thème gris pour les orphelins
      return {
        borderColor: '#757575',
        backgroundColor: 'rgba(117, 117, 117, 0.05)',
        iconColor: '#757575',
        borderColorSelected: '#424242'
      }
    }

    if (!incomingLink) {
      // Pas de lien entrant mais pas orphelin (ne devrait pas arriver avec la logique actuelle)
      return {
        borderColor: '#9c27b0',
        backgroundColor: 'rgba(156, 39, 176, 0.05)',
        iconColor: '#9c27b0',
        borderColorSelected: '#4caf50'
      }
    }

    switch (incomingLink.type) {
      case 'rescue':
        return {
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.05)',
          iconColor: '#ff9800',
          borderColorSelected: '#ff6f00'
        }
      case 'always':
        return {
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.05)',
          iconColor: '#4caf50',
          borderColorSelected: '#2e7d32'
        }
      default: // 'normal'
        return {
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.05)',
          iconColor: '#1976d2',
          borderColorSelected: '#0d47a1'
        }
    }
  }

  // Obtenir le thème de couleur d'une tâche normale selon son statut orphelin
  const getTaskTheme = (taskId: string) => {
    // Vérifier si la tâche est orpheline
    if (isOrphan(taskId)) {
      // Thème gris pour les orphelins
      return {
        numberBgColor: '#757575',
        moduleNameColor: '#757575',
        borderColor: '#757575'
      }
    }

    // Tâche connectée - couleurs normales
    return {
      numberBgColor: '#1976d2',
      moduleNameColor: '#1976d2',
      borderColor: '#1976d2'
    }
  }

  // Calculer la position absolue d'un module (en tenant compte s'il est dans un block)
  const getModuleAbsolutePosition = (module: ModuleBlock) => {
    const dims = module.isBlock ? getBlockDimensions(module) : { width: module.isPlay ? 100 : 140, height: 60 }

    // Si le module est dans un block, calculer sa position absolue
    let absoluteX = module.x
    let absoluteY = module.y

    if (module.parentId && module.parentSection) {
      const parent = modules.find(m => m.id === module.parentId)
      if (parent) {
        // Position de base du parent
        absoluteX = parent.x
        absoluteY = parent.y

        // Ajouter la hauteur du header du block
        const blockHeaderHeight = 50
        absoluteY += blockHeaderHeight

        // Avec le comportement accordion, ajouter la hauteur des sections qui précèdent
        const sectionHeaderHeight = 25
        const minContentHeight = 200
        const sections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

        for (const section of sections) {
          // Si on est arrivé à la section de la tâche, arrêter
          if (section === module.parentSection) {
            // Ajouter la hauteur du header de cette section
            absoluteY += sectionHeaderHeight
            break
          }

          // Ajouter la hauteur du header de la section précédente
          absoluteY += sectionHeaderHeight

          // Avec accordion, une seule section peut être ouverte
          // Si cette section précédente est ouverte, ajouter sa hauteur de contenu
          if (!isSectionCollapsed(parent.id, section)) {
            absoluteY += minContentHeight
          }
        }

        // Ajouter la position de la tâche dans sa section + padding
        absoluteX += module.x + 4 // 4 = padding de la section
        absoluteY += module.y + 4 // 4 = padding de la section
      }
    } else if (module.parentSection && !module.parentId) {
      // Module dans une PLAY section (pas dans un block)
      // Calculer l'offset Y en fonction des sections PLAY précédentes
      const sectionHeaderHeight = 40 // Hauteur des headers de section (~py: 1 + texte)

      const playModule = modules.find(m => m.isPlay)
      const isVariablesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'variables') : false
      const isPreTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'pre_tasks') : false
      const isTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'tasks') : true
      const isPostTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'post_tasks') : false
      const isHandlersOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'handlers') : false

      // Commencer à 0 (position relative au conteneur des PLAY sections)
      absoluteY = 0

      // Section Variables (borderBottom: '1px solid #ddd', flexShrink: 0)
      absoluteY += sectionHeaderHeight
      if (isVariablesOpen && module.parentSection !== 'variables') {
        absoluteY += 48 // Hauteur approximative du contenu variables (py: 1.5 => 12px * 2 + contenu ~24px)
      }

      // Section Pre-Tasks (borderBottom + flexShrink: 0 ou flex: 1)
      if (module.parentSection !== 'variables') {
        absoluteY += sectionHeaderHeight
      }

      // Si on est dans une section après Pre-Tasks et que Pre-Tasks est ouvert, estimer sa hauteur
      if (module.parentSection === 'tasks' || module.parentSection === 'post_tasks' || module.parentSection === 'handlers') {
        if (isPreTasksOpen) {
          // Estimer la hauteur basée sur le nombre de tâches ou utiliser une hauteur minimale
          // On va utiliser la hauteur disponible divisée par le nombre de sections ouvertes
          const openSectionsCount = [isPreTasksOpen, isTasksOpen, isPostTasksOpen, isHandlersOpen].filter(Boolean).length
          const estimatedHeight = openSectionsCount > 0 ? 300 : 200 // Hauteur approximative
          absoluteY += estimatedHeight
        }
      }

      // Section Tasks
      if (module.parentSection !== 'variables' && module.parentSection !== 'pre_tasks') {
        absoluteY += sectionHeaderHeight
      }

      // Si on est dans une section après Tasks et que Tasks est ouvert
      if (module.parentSection === 'post_tasks' || module.parentSection === 'handlers') {
        if (isTasksOpen) {
          const openSectionsCount = [isPreTasksOpen, isTasksOpen, isPostTasksOpen, isHandlersOpen].filter(Boolean).length
          const estimatedHeight = openSectionsCount > 0 ? 300 : 200
          absoluteY += estimatedHeight
        }
      }

      // Section Post-Tasks
      if (module.parentSection === 'handlers') {
        absoluteY += sectionHeaderHeight
        if (isPostTasksOpen) {
          const openSectionsCount = [isPreTasksOpen, isTasksOpen, isPostTasksOpen, isHandlersOpen].filter(Boolean).length
          const estimatedHeight = openSectionsCount > 0 ? 300 : 200
          absoluteY += estimatedHeight
        }
      }

      // Section Handlers - juste le header si c'est la section du module
      if (module.parentSection === 'handlers') {
        // Déjà ajouté au-dessus
      }

      // Ajouter la position de la tâche dans sa section + padding
      // Les sections utilisent p: 2 => 16px de padding
      absoluteX = module.x + 16
      absoluteY += module.y + 16
    }

    return {
      x: absoluteX,
      y: absoluteY,
      width: dims.width,
      height: dims.height
    }
  }

  // Calculer les points de connexion sur les bords des modules
  const getModuleConnectionPoint = (fromModule: ModuleBlock, toModule: ModuleBlock) => {
    const fromPos = getModuleAbsolutePosition(fromModule)
    const toPos = getModuleAbsolutePosition(toModule)

    // Centres des modules
    const fromCenterX = fromPos.x + fromPos.width / 2
    const fromCenterY = fromPos.y + fromPos.height / 2
    const toCenterX = toPos.x + toPos.width / 2
    const toCenterY = toPos.y + toPos.height / 2

    // Calculer l'angle entre les deux modules
    const dx = toCenterX - fromCenterX
    const dy = toCenterY - fromCenterY

    // Déterminer quel côté utiliser pour chaque module
    let fromX, fromY, toX, toY

    // Pour le module source (from)
    if (Math.abs(dx) > Math.abs(dy)) {
      // Connexion horizontale (gauche/droite)
      if (dx > 0) {
        // toModule est à droite de fromModule -> sortie par la droite
        fromX = fromPos.x + fromPos.width
        fromY = fromCenterY
      } else {
        // toModule est à gauche de fromModule -> sortie par la gauche
        fromX = fromPos.x
        fromY = fromCenterY
      }
    } else {
      // Connexion verticale (haut/bas)
      if (dy > 0) {
        // toModule est en dessous de fromModule -> sortie par le bas
        fromX = fromCenterX
        fromY = fromPos.y + fromPos.height
      } else {
        // toModule est au-dessus de fromModule -> sortie par le haut
        fromX = fromCenterX
        fromY = fromPos.y
      }
    }

    // Pour le module destination (to)
    if (Math.abs(dx) > Math.abs(dy)) {
      // Connexion horizontale (gauche/droite)
      if (dx > 0) {
        // toModule est à droite de fromModule -> entrée par la gauche
        toX = toPos.x
        toY = toCenterY
      } else {
        // toModule est à gauche de fromModule -> entrée par la droite
        toX = toPos.x + toPos.width
        toY = toCenterY
      }
    } else {
      // Connexion verticale (haut/bas)
      if (dy > 0) {
        // toModule est en dessous de fromModule -> entrée par le haut
        toX = toCenterX
        toY = toPos.y
      } else {
        // toModule est au-dessus de fromModule -> entrée par le bas
        toX = toCenterX
        toY = toPos.y + toPos.height
      }
    }

    return {
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    }
  }

  // Gestion des PLAYs (onglets)
  const addPlay = () => {
    const newPlayId = `play-${Date.now()}`
    const newPlay: Play = {
      id: newPlayId,
      name: `Play ${plays.length + 1}`,
      modules: [
        // START task for pre_tasks section
        {
          id: `${newPlayId}-start-pre-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for pre-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'pre_tasks',
        },
        // START task for tasks section
        {
          id: `${newPlayId}-start-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'tasks',
        },
        // START task for post_tasks section
        {
          id: `${newPlayId}-start-post-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for post-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'post_tasks',
        },
        // START task for handlers section
        {
          id: `${newPlayId}-start-handlers`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for handlers',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'handlers',
        },
      ],
      links: [],
      variables: [],
    }
    setPlays([...plays, newPlay])
    setActivePlayIndex(plays.length)
  }

  const deletePlay = (index: number) => {
    if (plays.length === 1) return // Ne pas supprimer le dernier PLAY
    const newPlays = plays.filter((_, i) => i !== index)
    setPlays(newPlays)
    if (activePlayIndex >= newPlays.length) {
      setActivePlayIndex(newPlays.length - 1)
    }
  }

  // Gestion des variables
  const addVariable = () => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: [...updatedPlays[activePlayIndex].variables, { key: 'new_var', value: '' }]
      }
      return updatedPlays
    })
  }

  const deleteVariable = (index: number) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: updatedPlays[activePlayIndex].variables.filter((_, i) => i !== index)
      }
      return updatedPlays
    })
  }

  // Mettre à jour le nom du PLAY et synchroniser avec la tâche PLAY
  const updatePlayName = (index: number, newName: string) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[index] = {
        ...updatedPlays[index],
        name: newName,
        // Synchroniser le nom de la tâche PLAY
        modules: updatedPlays[index].modules.map(m =>
          m.isPlay ? { ...m, taskName: newName } : m
        )
      }
      return updatedPlays
    })
  }

  // Calculer quelles sections sont ouvertes
  const playModule = modules.find(m => m.isPlay)
  const isVariablesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'variables') : false
  const isPreTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'pre_tasks') : false
  const isTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'tasks') : true
  const isPostTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'post_tasks') : false
  const isHandlersOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'handlers') : false

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Onglets PLAYs */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #ddd', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Tabs
            value={activePlayIndex}
            onChange={(_, newValue) => setActivePlayIndex(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {plays.map((play, index) => (
              <Tab
                key={play.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PlayArrowIcon sx={{ fontSize: 16 }} />
                    {editingTabIndex === index ? (
                      <TextField
                        autoFocus
                        variant="standard"
                        value={play.name}
                        onChange={(e) => updatePlayName(index, e.target.value)}
                        onBlur={() => setEditingTabIndex(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingTabIndex(null)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          '& .MuiInput-input': {
                            fontSize: '0.875rem',
                            padding: '2px 4px',
                            minWidth: '80px',
                          },
                        }}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setEditingTabIndex(index)
                        }}
                        sx={{ cursor: 'text', userSelect: 'none' }}
                      >
                        {play.name}
                      </Typography>
                    )}
                    {plays.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePlay(index)
                        }}
                        sx={{ ml: 0.5, p: 0.25 }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addPlay}
            variant="outlined"
            sx={{ ml: 2 }}
          >
            Add Play
          </Button>
        </Box>
      </Box>

      {/* PLAY Sections - Workspace Level */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, bgcolor: 'background.paper', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* SVG pour les lignes de connexion */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {links.map((link) => {
            const fromModule = modules.find(m => m.id === link.from)
            const toModule = modules.find(m => m.id === link.to)

            if (!fromModule || !toModule) return null

            // Cacher le lien si une des tâches est dans un block réduit
            if (fromModule.parentId) {
              const fromParent = modules.find(m => m.id === fromModule.parentId)
              if (fromParent && collapsedBlocks.has(fromParent.id)) {
                return null
              }
              // Cacher aussi si la section est réduite
              if (fromModule.parentSection && isSectionCollapsed(fromModule.parentId, fromModule.parentSection)) {
                return null
              }
            } else if (fromModule.parentSection && !fromModule.parentId) {
              // Module dans une PLAY section - vérifier si la section est fermée
              const playModule = modules.find(m => m.isPlay)
              if (playModule && isPlaySectionCollapsed(playModule.id, fromModule.parentSection as any)) {
                return null
              }
            }

            if (toModule.parentId) {
              const toParent = modules.find(m => m.id === toModule.parentId)
              if (toParent && collapsedBlocks.has(toParent.id)) {
                return null
              }
              // Cacher aussi si la section est réduite
              if (toModule.parentSection && isSectionCollapsed(toModule.parentId, toModule.parentSection)) {
                return null
              }
            } else if (toModule.parentSection && !toModule.parentId) {
              // Module dans une PLAY section - vérifier si la section est fermée
              const playModule = modules.find(m => m.isPlay)
              if (playModule && isPlaySectionCollapsed(playModule.id, toModule.parentSection as any)) {
                return null
              }
            }

            const connectionPoints = getModuleConnectionPoint(fromModule, toModule)

            const x1 = connectionPoints.from.x
            const y1 = connectionPoints.from.y
            const x2 = connectionPoints.to.x
            const y2 = connectionPoints.to.y

            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2

            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
            const style = getLinkStyle(link.type)

            return (
              <g key={link.id} style={{ pointerEvents: 'all' }}>
                {/* Point de connexion source */}
                <circle
                  cx={x1}
                  cy={y1}
                  r="4"
                  fill={style.stroke}
                  stroke="white"
                  strokeWidth="1.5"
                />
                {/* Ligne */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth || '2'}
                  strokeDasharray={style.strokeDasharray}
                />
                {/* Point de connexion destination */}
                <circle
                  cx={x2}
                  cy={y2}
                  r="4"
                  fill={style.stroke}
                  stroke="white"
                  strokeWidth="1.5"
                />
                {/* Flèche au milieu */}
                <polygon
                  points="0,-4 8,0 0,4"
                  fill={style.stroke}
                  transform={`translate(${midX}, ${midY}) rotate(${angle})`}
                />
                {/* Label du type de lien */}
                {style.label && (
                  <text
                    x={midX}
                    y={midY - 15}
                    textAnchor="middle"
                    fill={style.stroke}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {style.label}
                  </text>
                )}
                {/* Zone cliquable invisible */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="20"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredLinkId(link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                />
                {/* Bouton de suppression */}
                {hoveredLinkId === link.id && (
                  <>
                    <circle
                      cx={midX}
                      cy={midY}
                      r="10"
                      fill="white"
                      stroke="#dc004e"
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => deleteLink(link.id)}
                      onMouseEnter={() => setHoveredLinkId(link.id)}
                      onMouseLeave={() => setHoveredLinkId(null)}
                    />
                    <text
                      x={midX}
                      y={midY + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#dc004e"
                      fontSize="12"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      ×
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {/* Section 1: Variables */}
        <Box sx={{ borderBottom: '1px solid #ddd', flexShrink: 0 }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'variables')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('variables')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('variables')}25` }
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'variables') : false
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('variables') }}>
              Variables ({currentPlay.variables.length})
            </Typography>
          </Box>
          {isVariablesOpen && (
            <Box sx={{ px: 3, py: 1.5, bgcolor: `${getPlaySectionColor('variables')}08` }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {currentPlay.variables.map((variable, index) => (
                  <Chip
                    key={index}
                    label={`${variable.key}: ${variable.value}`}
                    size="small"
                    onDelete={() => deleteVariable(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  variant="outlined"
                  onClick={addVariable}
                >
                  Add Variable
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Section 2: Pre-Tasks */}
        <Box sx={{
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          flex: isPreTasksOpen ? 1 : '0 0 auto',
          minHeight: 0
        }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'pre_tasks')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('pre_tasks')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('pre_tasks')}25` }
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'pre_tasks') : true
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('pre_tasks') }}>
              Pre-Tasks ({modules.find(m => m.isPlay)?.playSections?.pre_tasks.length || 0})
            </Typography>
          </Box>
          {isPreTasksOpen && (
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  bgcolor: `${getPlaySectionColor('pre_tasks')}08`,
                  overflow: 'auto',
                  p: 2
                }}
                onDrop={(e) => handlePlaySectionDrop('pre_tasks', e)}
                onDragOver={handleDragOver}
              >
                {/* Render START task and other tasks in pre_tasks section */}
                {modules
                  .filter(m => m.parentSection === 'pre_tasks')
                  .map(task => (
                    <Paper
                      key={task.id}
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
                      draggable={!task.isPlay}
                      onDragStart={(e) => !task.isPlay && handleModuleDragStart(task.id, e)}
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
                        border: task.isPlay ? '2px solid #9c27b0' : '2px solid #ddd',
                        borderRadius: task.isPlay ? '0 50% 50% 0' : 2,
                        bgcolor: task.isPlay ? '#f3e5f5' : 'background.paper',
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
                            bgcolor: getPlaySectionColor('pre_tasks'),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.6rem',
                            flexShrink: 0,
                          }}
                        >
                          {modules.filter(m => m.parentSection === 'pre_tasks').indexOf(task) + 1}
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
                  ))
                }
              </Box>
          )}
        </Box>

        {/* Section 3: Tasks (default open) */}
        <Box sx={{
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          flex: isTasksOpen ? 1 : '0 0 auto',
          minHeight: 0
        }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'tasks')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('tasks')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('tasks')}25` }
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'tasks') : false
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('tasks') }}>
              Tasks ({modules.find(m => m.isPlay)?.playSections?.tasks.length || 0})
            </Typography>
          </Box>
          {isTasksOpen && (
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  bgcolor: `${getPlaySectionColor('tasks')}08`,
                  overflow: 'auto',
                  p: 2
                }}
                onDrop={(e) => handlePlaySectionDrop('tasks', e)}
                onDragOver={handleDragOver}
              >
                {/* Render START task and other tasks in tasks section */}
                {modules
                  .filter(m => m.parentSection === 'tasks')
                  .map(task => (
                    <Paper
                      key={task.id}
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
                      draggable={!task.isPlay}
                      onDragStart={(e) => !task.isPlay && handleModuleDragStart(task.id, e)}
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
                        border: task.isPlay ? '2px solid #1976d2' : '2px solid #ddd',
                        borderRadius: task.isPlay ? '0 50% 50% 0' : 2,
                        bgcolor: task.isPlay ? '#e3f2fd' : 'background.paper',
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
                            bgcolor: getPlaySectionColor('tasks'),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.6rem',
                            flexShrink: 0,
                          }}
                        >
                          {modules.filter(m => m.parentSection === 'tasks').indexOf(task) + 1}
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
                  ))
                }
              </Box>
          )}
        </Box>

        {/* Section 4: Post-Tasks */}
        <Box sx={{
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          flex: isPostTasksOpen ? 1 : '0 0 auto',
          minHeight: 0
        }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'post_tasks')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('post_tasks')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('post_tasks')}25` }
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'post_tasks') : true
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('post_tasks') }}>
              Post-Tasks ({modules.find(m => m.isPlay)?.playSections?.post_tasks.length || 0})
            </Typography>
          </Box>
          {isPostTasksOpen && (
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  bgcolor: `${getPlaySectionColor('post_tasks')}08`,
                  overflow: 'auto',
                  p: 2
                }}
                onDrop={(e) => handlePlaySectionDrop('post_tasks', e)}
                onDragOver={handleDragOver}
              >
                {/* Render START task and other tasks in post_tasks section */}
                {modules
                  .filter(m => m.parentSection === 'post_tasks')
                  .map(task => (
                    <Paper
                      key={task.id}
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
                      draggable={!task.isPlay}
                      onDragStart={(e) => !task.isPlay && handleModuleDragStart(task.id, e)}
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
                        border: task.isPlay ? '2px solid #00796b' : '2px solid #ddd',
                        borderRadius: task.isPlay ? '0 50% 50% 0' : 2,
                        bgcolor: task.isPlay ? '#e0f2f1' : 'background.paper',
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
                            bgcolor: getPlaySectionColor('post_tasks'),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.6rem',
                            flexShrink: 0,
                          }}
                        >
                          {modules.filter(m => m.parentSection === 'post_tasks').indexOf(task) + 1}
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
                  ))
                }
              </Box>
          )}
        </Box>

        {/* Section 5: Handlers */}
        <Box sx={{
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          flex: isHandlersOpen ? 1 : '0 0 auto',
          minHeight: 0
        }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'handlers')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('handlers')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('handlers')}25` }
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'handlers') : true
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('handlers') }}>
              Handlers ({modules.find(m => m.isPlay)?.playSections?.handlers.length || 0})
            </Typography>
          </Box>
          {isHandlersOpen && (
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  bgcolor: `${getPlaySectionColor('handlers')}08`,
                  overflow: 'auto',
                  p: 2
                }}
                onDrop={(e) => handlePlaySectionDrop('handlers', e)}
                onDragOver={handleDragOver}
              >
                {/* Render START task and other tasks in handlers section */}
                {modules
                  .filter(m => m.parentSection === 'handlers')
                  .map(task => (
                    <Paper
                      key={task.id}
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
                      draggable={!task.isPlay}
                      onDragStart={(e) => !task.isPlay && handleModuleDragStart(task.id, e)}
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
                        border: task.isPlay ? '2px solid #ff9800' : '2px solid #ddd',
                        borderRadius: task.isPlay ? '0 50% 50% 0' : 2,
                        bgcolor: task.isPlay ? '#fff3e0' : 'background.paper',
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
                            bgcolor: getPlaySectionColor('handlers'),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.6rem',
                            flexShrink: 0,
                          }}
                        >
                          {modules.filter(m => m.parentSection === 'handlers').indexOf(task) + 1}
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
                  ))
                }
              </Box>
          )}
        </Box>
      </Box>

      {/* Drop Zone - Canvas libre */}
      <Box
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={(e) => {
          // Désélectionner si on clique directement sur le canvas (pas sur un module)
          if (e.target === e.currentTarget) {
            onSelectModule(null)
          }
        }}
        sx={{
          display: 'none', // Hidden - all modules are now in PLAY sections
        }}
      >
        {modules.length === 0 ? (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              p: 4,
              border: '2px dashed #ccc',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Drop modules or blocks here to start building your playbook
            </Typography>
          </Box>
        ) : (
          <>
            {modules.filter(m => !m.parentId && !m.parentSection).map((module, index) => {
              const isBlock = module.isBlock || module.isPlay
              const dimensions = isBlock ? getBlockDimensions(module) : { width: 140, height: 60 }

              if (isBlock) {
                // Rendu d'un Block ou PLAY
                const blockTheme = module.isPlay ? getPlayTheme() : getBlockTheme(module.id)

                return (
                  <Paper
                    key={module.id}
                    className="module-block"
                    data-block-id={module.id}
                    elevation={selectedModuleId === module.id ? 6 : 3}
                    onClick={() => onSelectModule({
                      id: module.id,
                      name: module.name,
                      collection: module.collection,
                      taskName: module.taskName,
                      when: module.when,
                      ignoreErrors: module.ignoreErrors,
                      become: module.become,
                      loop: module.loop,
                      delegateTo: module.delegateTo,
                      isBlock: module.isBlock,
                      isPlay: module.isPlay
                    })}
                    draggable
                    onDragStart={(e) => handleModuleDragStart(module.id, e)}
                    onDragOver={(e) => handleModuleDragOver(module.id, e)}
                    onDrop={(e) => handleModuleDropOnModule(module.id, e)}
                    sx={{
                      position: 'absolute',
                      left: module.x,
                      top: module.y,
                      width: dimensions.width,
                      minHeight: dimensions.height,
                      p: 1,
                      cursor: 'move',
                      border: selectedModuleId === module.id ? `2px solid ${blockTheme.borderColorSelected}` : `2px solid ${blockTheme.borderColor}`,
                      borderRadius: module.isPlay ? '0 50% 50% 0' : 2,
                      bgcolor: blockTheme.backgroundColor,
                      zIndex: draggedModuleId === module.id ? 10 : 1,
                      opacity: draggedModuleId === module.id ? 0.7 : 1,
                      '&:hover': {
                        boxShadow: 6,
                      },
                    }}
                  >
                    {/* Header du block/play */}
                    <Box
                      className="block-header"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        const sourceId = e.dataTransfer.getData('existingModule')
                        // Si on drop le block sur lui-même, laisser l'événement remonter pour le déplacement
                        if (sourceId === module.id) {
                          return
                        }
                        e.preventDefault()
                        e.stopPropagation()
                        handleModuleDropOnModule(module.id, e)
                      }}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pb: 0.5, borderBottom: `1px solid ${blockTheme.borderColor}` }}
                    >
                      {/* Première ligne : Icône + Nom + Boutons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {module.isPlay ? (
                            <PlayArrowIcon sx={{ fontSize: 20, color: blockTheme.iconColor }} />
                          ) : (
                            <AccountTreeIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                          )}
                          <TextField
                            fullWidth
                            variant="standard"
                            value={module.taskName}
                            onChange={(e) => updateTaskName(module.id, e.target.value)}
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
                          {/* Bouton collapse/expand SEULEMENT pour les blocks, pas les PLAY */}
                          {!module.isPlay && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleBlockCollapse(module.id)
                              }}
                              sx={{ p: 0.25 }}
                            >
                              {collapsedBlocks.has(module.id) ? (
                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <ExpandLessIcon sx={{ fontSize: 16 }} />
                              )}
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      {/* Deuxième ligne : Inventory (SEULEMENT pour les PLAY) */}
                      {module.isPlay && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 3 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 60 }}>
                            Inventory:
                          </Typography>
                          <TextField
                            fullWidth
                            variant="standard"
                            value={module.inventory || ''}
                            onChange={(e) => updateInventory(module.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="hosts"
                            sx={{
                              '& .MuiInput-input': {
                                fontSize: '0.75rem',
                                padding: '1px 0',
                                color: 'text.secondary',
                              },
                            }}
                          />
                        </Box>
                      )}

                      {/* Icônes d'attributs (SEULEMENT pour les blocks, pas les PLAY) */}
                      {!module.isPlay && (
                        <Box sx={{ display: 'flex', gap: 0.5, pl: 3, mt: 0.5 }}>
                          <Tooltip title={module.when ? `Condition: ${module.when}` : 'No condition'}>
                            <HelpOutlineIcon sx={{ fontSize: 12, color: module.when ? '#1976d2' : '#ccc' }} />
                          </Tooltip>
                          <Tooltip title={module.ignoreErrors ? 'Ignore errors: yes' : 'Ignore errors: no'}>
                            <ErrorOutlineIcon sx={{ fontSize: 12, color: module.ignoreErrors ? '#f57c00' : '#ccc' }} />
                          </Tooltip>
                          <Tooltip title={module.become ? 'Become: yes (sudo)' : 'Become: no'}>
                            <SecurityIcon sx={{ fontSize: 12, color: module.become ? '#d32f2f' : '#ccc' }} />
                          </Tooltip>
                          <Tooltip title={module.delegateTo ? `Delegate to: ${module.delegateTo}` : 'No delegation'}>
                            <SendIcon sx={{ fontSize: 12, color: module.delegateTo ? '#00bcd4' : '#ccc' }} />
                          </Tooltip>
                        </Box>
                      )}
                    </Box>


                    {/* Contenu du block avec 3 sections - SEULEMENT pour les blocks, pas les PLAY */}
                    {!module.isPlay && !collapsedBlocks.has(module.id) && (
                      <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Section Tasks - Header toujours visible */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBlockSection(module.id, 'normal')
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
                          {isSectionCollapsed(module.id, 'normal') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('normal'), fontSize: '0.7rem' }}>
                            Tasks
                          </Typography>
                        </Box>

                        {/* Contenu de la section Normal - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'normal') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="normal"
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  const sourceModule = modules.find(m => m.id === sourceId)
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (sourceModule.parentId === module.id && sourceModule.parentSection === 'normal') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'normal', relativeX, relativeY)
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink('normal', sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un block dans une section
                                  if (parsedData.name !== 'block' && parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    // Calculer la position relative à la section
                                    const sectionElem = e.currentTarget as HTMLElement
                                    const sectionRect = sectionElem.getBoundingClientRect()

                                    let relativeX = e.clientX - sectionRect.left - 75
                                    let relativeY = e.clientY - sectionRect.top - 60

                                    // Contraindre dans les limites de la section
                                    const taskWidth = 140
                                    const taskHeight = 60
                                    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
                                    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: `Task with ${parsedData.name}`,
                                      x: relativeX,
                                      y: relativeY,
                                      parentId: module.id,
                                      parentSection: 'normal'
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            normal: [...sections.normal, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(25, 118, 210, 0.08)' }}
                            >
                              {module.blockSections?.normal && module.blockSections.normal.length > 0 ? (
                                module.blockSections.normal.map(taskId => {
                                  const task = modules.find(m => m.id === taskId)
                                  if (!task) return null

                                  const taskTheme = getTaskTheme(task.id)

                                  return (
                                    <Paper
                                      key={taskId}
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
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        // Ne pas bloquer la propagation pour permettre le drop sur la section
                                      }}
                                      onDrop={(e) => {
                                        const sourceId = e.dataTransfer.getData('existingModule')

                                        // Si drop sur soi-même, laisser l'événement remonter à la section pour le repositionnement
                                        if (sourceId === task.id) {
                                          return
                                        }

                                        const sourceModule = modules.find(m => m.id === sourceId)

                                        // Si la source est dans une zone de block
                                        if (sourceModule?.parentId && sourceModule?.parentSection) {
                                          e.preventDefault()
                                          e.stopPropagation()

                                          // Vérifier si c'est la MÊME section
                                          if (sourceModule.parentId === task.parentId && sourceModule.parentSection === task.parentSection) {
                                            // Même section : créer un lien normal
                                            createLink('normal', sourceId, task.id)
                                          }
                                          // Différente section : ne rien faire
                                          return
                                        }

                                        // Source externe (zone de travail)
                                        e.preventDefault()
                                        e.stopPropagation()

                                        // Vérifier si la source a un lien parent (entrant)
                                        const hasIncomingLink = links.some(l => l.to === sourceId)

                                        if (hasIncomingLink) {
                                          // A un parent : créer un lien entre la source et le block parent de la cible
                                          createLink('normal', sourceId, task.parentId!)
                                        } else {
                                          // Orpheline : déplacer la tâche dans la section de la cible
                                          const offsetX = (task.x || 10) + 160
                                          const offsetY = task.y || 10
                                          addTaskToBlockSection(sourceId, task.parentId!, task.parentSection!, offsetX, offsetY)
                                        }
                                      }}
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
                                      {/* ID et nom de la tâche sur la même ligne */}
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
                                          {modules.filter(m => m.parentId === module.id && m.parentSection === 'normal').indexOf(task) + 1}
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
                                      <Typography variant="caption" sx={{ fontWeight: 'medium', color: taskTheme.moduleNameColor, display: 'block', fontSize: '0.55rem' }}>
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
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  Drop tasks here
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        {/* Section Rescue - Header toujours visible */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBlockSection(module.id, 'rescue')
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
                          {isSectionCollapsed(module.id, 'rescue') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('rescue'), fontSize: '0.7rem' }}>
                            Rescue
                          </Typography>
                        </Box>

                        {/* Contenu de la section Rescue - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'rescue') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="rescue"
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()

                                // Récupérer l'offset du drag
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                const sectionWidth = sectionRect.width
                                const sectionHeight = sectionRect.height

                                relativeX = Math.max(0, Math.min(relativeX, sectionWidth - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionHeight - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  const sourceModule = modules.find(m => m.id === sourceId)
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (sourceModule.parentId === module.id && sourceModule.parentSection === 'rescue') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'rescue', relativeX, relativeY)
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink('normal', sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un block dans une section
                                  if (parsedData.name !== 'block' && parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: `Task with ${parsedData.name}`,
                                      x: relativeX,
                                      y: relativeY,
                                      parentId: module.id,
                                      parentSection: 'rescue'
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            rescue: [...sections.rescue, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(255, 152, 0, 0.08)' }}
                            >
                              {module.blockSections?.rescue && module.blockSections.rescue.length > 0 ? (
                                module.blockSections.rescue.map(taskId => {
                                  const task = modules.find(m => m.id === taskId)
                                  if (!task) return null

                                  const taskTheme = getTaskTheme(task.id)

                                  return (
                                    <Paper
                                      key={taskId}
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
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        // Ne pas bloquer la propagation pour permettre le drop sur la section
                                      }}
                                      onDrop={(e) => {
                                        const sourceId = e.dataTransfer.getData('existingModule')

                                        // Si drop sur soi-même, laisser l'événement remonter à la section pour le repositionnement
                                        if (sourceId === task.id) {
                                          return
                                        }

                                        const sourceModule = modules.find(m => m.id === sourceId)

                                        // Si la source est dans une zone de block
                                        if (sourceModule?.parentId && sourceModule?.parentSection) {
                                          e.preventDefault()
                                          e.stopPropagation()

                                          // Vérifier si c'est la MÊME section
                                          if (sourceModule.parentId === task.parentId && sourceModule.parentSection === task.parentSection) {
                                            // Même section : créer un lien normal
                                            createLink('normal', sourceId, task.id)
                                          }
                                          // Différente section : ne rien faire
                                          return
                                        }

                                        // Source externe (zone de travail)
                                        e.preventDefault()
                                        e.stopPropagation()

                                        // Vérifier si la source a un lien parent (entrant)
                                        const hasIncomingLink = links.some(l => l.to === sourceId)

                                        if (hasIncomingLink) {
                                          // A un parent : créer un lien entre la source et le block parent de la cible
                                          createLink('normal', sourceId, task.parentId!)
                                        } else {
                                          // Orpheline : déplacer la tâche dans la section de la cible
                                          const offsetX = (task.x || 10) + 160
                                          const offsetY = task.y || 10
                                          addTaskToBlockSection(sourceId, task.parentId!, task.parentSection!, offsetX, offsetY)
                                        }
                                      }}
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
                                      {/* ID et nom de la tâche sur la même ligne */}
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
                                          {modules.filter(m => m.parentId === module.id && m.parentSection === 'rescue').indexOf(task) + 1}
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
                                      <Typography variant="caption" sx={{ fontWeight: 'medium', color: taskTheme.moduleNameColor, display: 'block', fontSize: '0.55rem' }}>
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
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  Drop tasks here
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        {/* Section Always - Header toujours visible */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBlockSection(module.id, 'always')
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
                          {isSectionCollapsed(module.id, 'always') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('always'), fontSize: '0.7rem' }}>
                            Always
                          </Typography>
                        </Box>

                        {/* Contenu de la section Always - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'always') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="always"
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()

                                // Récupérer l'offset du drag
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                const sectionWidth = sectionRect.width
                                const sectionHeight = sectionRect.height

                                relativeX = Math.max(0, Math.min(relativeX, sectionWidth - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionHeight - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  const sourceModule = modules.find(m => m.id === sourceId)
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (sourceModule.parentId === module.id && sourceModule.parentSection === 'always') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'always', relativeX, relativeY)
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink('normal', sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un block dans une section
                                  if (parsedData.name !== 'block' && parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: `Task with ${parsedData.name}`,
                                      x: relativeX,
                                      y: relativeY,
                                      parentId: module.id,
                                      parentSection: 'always'
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            always: [...sections.always, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(76, 175, 80, 0.08)' }}
                            >
                              {module.blockSections?.always && module.blockSections.always.length > 0 ? (
                                module.blockSections.always.map(taskId => {
                                  const task = modules.find(m => m.id === taskId)
                                  if (!task) return null

                                  const taskTheme = getTaskTheme(task.id)

                                  return (
                                    <Paper
                                      key={taskId}
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
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        // Ne pas bloquer la propagation pour permettre le drop sur la section
                                      }}
                                      onDrop={(e) => {
                                        const sourceId = e.dataTransfer.getData('existingModule')

                                        // Si drop sur soi-même, laisser l'événement remonter à la section pour le repositionnement
                                        if (sourceId === task.id) {
                                          return
                                        }

                                        const sourceModule = modules.find(m => m.id === sourceId)

                                        // Si la source est dans une zone de block
                                        if (sourceModule?.parentId && sourceModule?.parentSection) {
                                          e.preventDefault()
                                          e.stopPropagation()

                                          // Vérifier si c'est la MÊME section
                                          if (sourceModule.parentId === task.parentId && sourceModule.parentSection === task.parentSection) {
                                            // Même section : créer un lien normal
                                            createLink('normal', sourceId, task.id)
                                          }
                                          // Différente section : ne rien faire
                                          return
                                        }

                                        // Source externe (zone de travail)
                                        e.preventDefault()
                                        e.stopPropagation()

                                        // Vérifier si la source a un lien parent (entrant)
                                        const hasIncomingLink = links.some(l => l.to === sourceId)

                                        if (hasIncomingLink) {
                                          // A un parent : créer un lien entre la source et le block parent de la cible
                                          createLink('normal', sourceId, task.parentId!)
                                        } else {
                                          // Orpheline : déplacer la tâche dans la section de la cible
                                          const offsetX = (task.x || 10) + 160
                                          const offsetY = task.y || 10
                                          addTaskToBlockSection(sourceId, task.parentId!, task.parentSection!, offsetX, offsetY)
                                        }
                                      }}
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
                                      {/* ID et nom de la tâche sur la même ligne */}
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
                                          {modules.filter(m => m.parentId === module.id && m.parentSection === 'always').indexOf(task) + 1}
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
                                      <Typography variant="caption" sx={{ fontWeight: 'medium', color: taskTheme.moduleNameColor, display: 'block', fontSize: '0.55rem' }}>
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
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  Drop tasks here
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Poignées de redimensionnement - 8 directions - seulement pour les blocks non collapsed */}
                    {!module.isPlay && !collapsedBlocks.has(module.id) && (
                      <>
                        {/* Coin Nord-Ouest */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'nw', e)}
                          sx={{
                            position: 'absolute',
                            top: -4,
                            left: -4,
                            width: 10,
                            height: 10,
                            cursor: 'nwse-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'nw' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: '50%',
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'scale(1.2)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Nord-Est */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'ne', e)}
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 10,
                            height: 10,
                            cursor: 'nesw-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'ne' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: '50%',
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'scale(1.2)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Sud-Ouest */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'sw', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -4,
                            left: -4,
                            width: 10,
                            height: 10,
                            cursor: 'nesw-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'sw' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: '50%',
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'scale(1.2)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Sud-Est */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'se', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -4,
                            right: -4,
                            width: 10,
                            height: 10,
                            cursor: 'nwse-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'se' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: '50%',
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'scale(1.2)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Nord */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'n', e)}
                          sx={{
                            position: 'absolute',
                            top: -4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 30,
                            height: 8,
                            cursor: 'ns-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'n' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: 1,
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'translateX(-50%) scaleY(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Sud */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 's', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 30,
                            height: 8,
                            cursor: 'ns-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 's' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: 1,
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'translateX(-50%) scaleY(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Ouest */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'w', e)}
                          sx={{
                            position: 'absolute',
                            left: -4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 8,
                            height: 30,
                            cursor: 'ew-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'w' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: 1,
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'translateY(-50%) scaleX(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Est */}
                        <Box
                          onMouseDown={(e) => handleBlockResizeStart(module.id, 'e', e)}
                          sx={{
                            position: 'absolute',
                            right: -4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 8,
                            height: 30,
                            cursor: 'ew-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'e' ? 'primary.main' : 'white',
                            border: `2px solid ${blockTheme.borderColor}`,
                            borderRadius: 1,
                            opacity: 0.8,
                            '&:hover': { opacity: 1, bgcolor: 'primary.light', transform: 'translateY(-50%) scaleX(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />
                      </>
                    )}
                  </Paper>
                )
              } else {
                // Rendu d'une tâche normale
                const taskTheme = getTaskTheme(module.id)

                return (
                  <Paper
                    key={module.id}
                    className="module-block"
                    elevation={selectedModuleId === module.id ? 6 : 3}
                    onClick={() => onSelectModule({
                      id: module.id,
                      name: module.name,
                      collection: module.collection,
                      taskName: module.taskName,
                      when: module.when,
                      ignoreErrors: module.ignoreErrors,
                      become: module.become,
                      loop: module.loop,
                      delegateTo: module.delegateTo,
                      isBlock: module.isBlock,
                      isPlay: module.isPlay
                    })}
                    draggable
                    onDragStart={(e) => handleModuleDragStart(module.id, e)}
                    onDragOver={(e) => handleModuleDragOver(module.id, e)}
                    onDrop={(e) => handleModuleDropOnModule(module.id, e)}
                    sx={{
                      position: 'absolute',
                      left: module.x,
                      top: module.y,
                      width: 140,
                      minHeight: 60,
                      p: 0.75,
                      cursor: 'move',
                      border: selectedModuleId === module.id ? `2px solid ${taskTheme.borderColor}` : 'none',
                      zIndex: draggedModuleId === module.id ? 10 : 1,
                      opacity: draggedModuleId === module.id ? 0.7 : 1,
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
                        {modules.filter(m => !m.parentId && !m.parentSection).indexOf(module) + 1}
                      </Box>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={module.taskName}
                        onChange={(e) => updateTaskName(module.id, e.target.value)}
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
                    <Typography variant="caption" sx={{ fontWeight: 'medium', color: taskTheme.moduleNameColor, display: 'block', fontSize: '0.55rem' }}>
                      {module.collection}.{module.name}
                    </Typography>

                    {/* Icônes d'attributs de tâche */}
                    <Box sx={{ mt: 0.25, display: 'flex', gap: 0.5, minHeight: 14 }}>
                      <Tooltip title={module.when ? `Condition: ${module.when}` : 'No condition'}>
                        <HelpOutlineIcon sx={{ fontSize: 12, color: module.when ? '#1976d2' : '#ccc' }} />
                      </Tooltip>
                      <Tooltip title={module.ignoreErrors ? 'Ignore errors: yes' : 'Ignore errors: no'}>
                        <ErrorOutlineIcon sx={{ fontSize: 12, color: module.ignoreErrors ? '#f57c00' : '#ccc' }} />
                      </Tooltip>
                      <Tooltip title={module.become ? 'Become: yes (sudo)' : 'Become: no'}>
                        <SecurityIcon sx={{ fontSize: 12, color: module.become ? '#d32f2f' : '#ccc' }} />
                      </Tooltip>
                      <Tooltip title={module.loop ? `Loop: ${module.loop}` : 'No loop'}>
                        <LoopIcon sx={{ fontSize: 12, color: module.loop ? '#388e3c' : '#ccc' }} />
                      </Tooltip>
                      <Tooltip title={module.delegateTo ? `Delegate to: ${module.delegateTo}` : 'No delegation'}>
                        <SendIcon sx={{ fontSize: 12, color: module.delegateTo ? '#00bcd4' : '#ccc' }} />
                      </Tooltip>
                    </Box>
                  </Paper>
                )
              }
            })}
          </>
        )}
      </Box>
    </Box>
  )
}

export default WorkZone
