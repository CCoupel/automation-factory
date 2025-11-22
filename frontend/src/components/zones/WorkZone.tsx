import { Box, Typography, Paper, IconButton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Tabs, Tab, Button, Chip, Badge } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import ExtensionIcon from '@mui/icons-material/Extension'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import PlaySectionContent from './PlaySectionContent'
import BlockSectionContent from './BlockSectionContent'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import PlayAttributeIcons from '../common/PlayAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import TabIconBadge from '../common/TabIconBadge'
import { ModuleBlock, Link, PlayVariable, PlaySectionAttributes, Play, PlayAttributes } from '../../types/playbook'

interface WorkZoneProps {
  onSelectModule: (module: { id: string; name: string; collection: string; taskName: string; when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string; isBlock?: boolean; isPlay?: boolean } | null) => void
  selectedModuleId: string | null
  onDeleteModule?: (deleteHandler: (id: string) => void) => void
  onUpdateModule?: (updateHandler: (id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string }>) => void) => void
  onPlayAttributes?: (getHandler: () => PlayAttributes, updateHandler: (updates: Partial<PlayAttributes>) => void) => void
}

const WorkZone = ({ onSelectModule, selectedModuleId, onDeleteModule, onUpdateModule, onPlayAttributes }: WorkZoneProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const playSectionsContainerRef = useRef<HTMLDivElement>(null)
  const variablesSectionRef = useRef<HTMLDivElement>(null)
  const preTasksSectionRef = useRef<HTMLDivElement>(null)
  const tasksSectionRef = useRef<HTMLDivElement>(null)
  const postTasksSectionRef = useRef<HTMLDivElement>(null)
  const handlersSectionRef = useRef<HTMLDivElement>(null)

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
      attributes: {
        hosts: 'all',
        remoteUser: undefined,
        gatherFacts: true,
        become: false,
        connection: 'ssh',
        roles: [],
      },
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
  // Onglet actif pour les sections PLAY (présentation en tabs) - Variables reste en accordéon
  const [activeSectionTab, setActiveSectionTab] = useState<'roles' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'>('tasks')
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

    // Si le block est collapsed, retourner la taille d'une tâche normale
    if (collapsedBlocks.has(block.id)) {
      return { width: 140, height: 60 }
    }

    // Les blocks normaux - calculer automatiquement selon le contenu des sections
    const baseWidth = 250
    const headerHeight = 50
    const sectionHeaderHeight = 25
    const minSectionContentHeight = 200 // Hauteur minimum de chaque section
    const sectionPadding = 4 // Padding de la section Box (p: 0.5 en MUI = 4px)
    const bottomPadding = 20 // Padding en bas pour l'espace

    // Dimensions manuelles (définies par redimensionnement manuel)
    // Utilisées comme minimum - le block ne peut pas être plus petit que ça
    const manualWidth = block.width || baseWidth
    const manualHeight = block.height || 0

    let totalHeight = headerHeight

    // Avec le comportement accordion, compter seulement les headers de toutes les sections
    // et le contenu de la section ouverte
    const sections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

    // Ajouter les headers de toutes les sections
    totalHeight += sections.length * sectionHeaderHeight

    // Calculer le contenu de la section ouverte basé sur les tâches réelles
    const openSection = sections.find(section => !isSectionCollapsed(block.id, section))
    if (openSection && block.blockSections) {
      const taskIds = block.blockSections[openSection] || []

      if (taskIds.length === 0) {
        // Section vide - utiliser la hauteur minimum
        totalHeight += minSectionContentHeight
      } else {
        // Calculer la hauteur nécessaire pour contenir toutes les tâches
        let maxBottomY = 0
        let maxRightX = 0

        taskIds.forEach(taskId => {
          const task = modules.find(m => m.id === taskId)
          if (task) {
            const taskY = task.y || 10
            let taskHeight = 60 // Hauteur par défaut d'une tâche

            // Si c'est un block imbriqué, obtenir sa hauteur calculée
            if (task.isBlock) {
              const nestedBlockDims = getBlockDimensions(task)
              taskHeight = nestedBlockDims.height
              maxRightX = Math.max(maxRightX, (task.x || 10) + nestedBlockDims.width)
            } else {
              maxRightX = Math.max(maxRightX, (task.x || 10) + 140)
            }

            maxBottomY = Math.max(maxBottomY, taskY + taskHeight)
          }
        })

        // Ajouter le padding de la section et un espace en bas
        const sectionContentHeight = Math.max(
          maxBottomY + bottomPadding,
          minSectionContentHeight
        )

        totalHeight += sectionContentHeight

        // Ajuster la largeur si nécessaire pour contenir les tâches
        const calculatedWidth = Math.max(
          baseWidth,
          maxRightX + sectionPadding * 2 + 20 // padding des deux côtés + marge
        )

        // Utiliser le maximum entre dimensions manuelles et calculées
        // Permet de garder le redimensionnement manuel ET de s'agrandir si nécessaire
        return {
          width: Math.max(manualWidth, calculatedWidth),
          height: Math.max(manualHeight, totalHeight)
        }
      }
    }

    // Section vide ou pas de blockSections - utiliser hauteur par défaut
    const defaultHeight = totalHeight + minSectionContentHeight

    return {
      width: Math.max(manualWidth, baseWidth),
      height: Math.max(manualHeight, defaultHeight)
    }
  }

  /**
   * Obtenir les dimensions d'un module (block ou tâche)
   * Pour usage dans SectionLinks
   */
  const getModuleDimensions = (module: ModuleBlock): { width: number; height: number } => {
    if (module.isBlock) {
      return getBlockDimensions(module)
    }
    // Module virtuel (mini START task) - 60x40px
    if (module.collection === 'virtual') {
      return { width: 60, height: 40 }
    }
    // Tâche START (PLAY START - isPlay=true) - 60x40px
    if (module.isPlay) {
      return { width: 60, height: 40 }
    }
    // Tâche normale - 140x60px
    return { width: 140, height: 60 }
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

    // Toujours utiliser le canvas principal pour le calcul de position
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    const moduleData = e.dataTransfer.getData('module')
    const existingModuleId = e.dataTransfer.getData('existingModule')

    // Déterminer si c'est un block/PLAY qui est déplacé
    const movedModule = existingModuleId ? modules.find(m => m.id === existingModuleId) : null
    const isMovingBlockOrPlay = movedModule && (movedModule.isBlock || movedModule.isPlay)

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
      // Module existant déplacé
      if (movedModule.isBlock || movedModule.isPlay) {
        const dims = getBlockDimensions(movedModule)
        offsetX = dims.width / 2
        offsetY = dims.height / 2
      }
    } else if (moduleData) {
      // Nouveau module depuis la palette - vérifier si c'est un block/play
      const parsedData = JSON.parse(moduleData)
      if (parsedData.name === 'block' || parsedData.name === 'play') {
        // Pour un nouveau block/play, utiliser un offset par défaut raisonnable
        // Un block fait environ 400x300, donc offset au centre
        offsetX = 200
        offsetY = 150
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
        // Vérifier les liens AVANT de faire toute modification
        const hasLinks = links.some(l => l.from === existingModuleId || l.to === existingModuleId)

        // Utiliser setModules avec forme fonctionnelle pour accéder au nouvel état
        setModules(prev => {
          const movedModule = prev.find(m => m.id === existingModuleId)
          if (!movedModule) return prev

          // Si c'est une tâche ou un block dans une section de block
          if (movedModule.parentId && movedModule.parentSection && !movedModule.isPlay) {
            if (hasLinks) {
              // A des liens: ne pas permettre le déplacement
              return prev
            }

            // Pas de liens: permettre le déplacement hors du block
            // Retirer de l'ancienne section ET déplacer le module en un seul appel
            return prev.map(m => {
              if (m.id === movedModule.parentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                const oldSection = movedModule.parentSection!
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
                return { ...m, x, y, parentId: undefined, parentSection: undefined }
              }
              return m
            })
          }

          // Si ce n'est pas une tâche dans une section, retourner l'état inchangé
          return prev
        })

        if (hasLinks) {
          setDraggedModuleId(null)
          return
        }

        const movedModule = modules.find(m => m.id === existingModuleId)
        // Si le module a été déplacé hors d'une section, on a déjà tout fait ci-dessus
        if (movedModule?.parentId && movedModule?.parentSection && !movedModule.isPlay) {
          setDraggedModuleId(null)
          return
        }

        setModules(prev => prev.map(m => {
          // Retirer du parent si dans un block (ancienne logique pour les blocks sans sections)
          if (m.id === movedModule?.parentId && m.children) {
            return { ...m, children: m.children.filter(id => id !== existingModuleId) }
          }
          // Déplacer le module
          if (m.id === existingModuleId) {
            return { ...m, x, y, parentId: undefined, parentSection: undefined }
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
      // CAS SPÉCIAL: Si la source est un mini START task (pattern: blockId-section-start)
      if (sourceId.endsWith('-start')) {
        const targetModule = modules.find(m => m.id === targetId)

        // Vérifier que la cible existe (pas un header d'accordéon)
        if (!targetModule) {
          setDraggedModuleId(null)
          return
        }

        // Parser le mini START ID pour extraire blockId et section
        const startIdParts = sourceId.split('-')
        const section = startIdParts[startIdParts.length - 2]
        const blockId = startIdParts.slice(0, -2).join('-')

        // Empêcher les liens circulaires (mini START vers son propre block parent)
        if (targetId === blockId || targetModule.parentId === sourceId) {
          setDraggedModuleId(null)
          return
        }

        // VALIDATION: Le mini START ne peut créer de lien qu'avec une tâche de la même section
        if (targetModule.parentId !== blockId || targetModule.parentSection !== section) {
          console.log('Mini START can only create links with tasks in the same section')
          setDraggedModuleId(null)
          return
        }

        // Créer le lien
        createLink(getLinkTypeFromSource(sourceId), sourceId, targetId)
        setDraggedModuleId(null)
        return
      }

      const sourceModule = modules.find(m => m.id === sourceId)
      const targetModule = modules.find(m => m.id === targetId)

      if (!sourceModule || !targetModule) return

      // Empêcher les liens circulaires (source vers son parent ou vice versa)
      if (sourceModule.parentId === targetId || targetModule.parentId === sourceId) {
        return
      }

      // CAS SPÉCIAL: START task de section PLAY (isPlay = true)
      if (sourceModule.isPlay) {
        // Un START task de PLAY ne peut créer de lien qu'avec une tâche de la même section PLAY
        // (ou un block entier, mais ce cas est géré dans handleBlockSectionDrop)
        if (!targetModule.parentId && targetModule.parentSection) {
          // Vérifier que c'est la même section PLAY
          if (sourceModule.parentSection !== targetModule.parentSection) {
            console.log('PLAY START can only create links with tasks in the same PLAY section')
            return
          }
        } else {
          // La cible n'est pas dans une section PLAY
          console.log('PLAY START can only create links with tasks in the same PLAY section')
          return
        }
      }

      // VALIDATION: Les deux tâches doivent être dans la même section
      // Cas 1: Deux tâches dans des sections de blocks
      if (sourceModule.parentId && sourceModule.parentSection && targetModule.parentId && targetModule.parentSection) {
        // Doivent être dans le même block ET la même section
        if (sourceModule.parentId !== targetModule.parentId || sourceModule.parentSection !== targetModule.parentSection) {
          console.log('Tasks must be in the same block section to create a link')
          return
        }
      }
      // Cas 2: Deux tâches dans des sections PLAY (hors START tasks déjà gérés)
      else if (!sourceModule.parentId && sourceModule.parentSection && !targetModule.parentId && targetModule.parentSection) {
        // Doivent être dans la même section PLAY
        if (sourceModule.parentSection !== targetModule.parentSection) {
          console.log('Tasks must be in the same PLAY section to create a link')
          return
        }
      }
      // Cas 3: Une tâche dans une section, l'autre pas (ou sections différentes)
      else {
        console.log('Tasks must be in the same type of section to create a link')
        return
      }

      // Créer le lien
      createLink(getLinkTypeFromSource(sourceId), sourceId, targetId)
    }
    setDraggedModuleId(null)
  }

  // Déterminer le type de lien basé sur la section parente de la tâche source
  const getLinkTypeFromSource = (sourceId: string): 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' => {
    // Gérer les mini START tasks des sections de blocks (pattern: blockId-section-start)
    if (sourceId.endsWith('-start')) {
      if (sourceId.includes('-normal-start')) return 'normal'
      if (sourceId.includes('-rescue-start')) return 'rescue'
      if (sourceId.includes('-always-start')) return 'always'
    }

    const sourceModule = modules.find(m => m.id === sourceId)

    // Si la tâche est dans une section PLAY, utiliser le type de la section
    if (sourceModule?.parentSection && !sourceModule.parentId) {
      // Tâche dans une section PLAY
      if (sourceModule.parentSection === 'pre_tasks') return 'pre_tasks'
      if (sourceModule.parentSection === 'tasks') return 'tasks'
      if (sourceModule.parentSection === 'post_tasks') return 'post_tasks'
      if (sourceModule.parentSection === 'handlers') return 'handlers'
    }

    // Si la tâche est dans une section de block
    if (sourceModule?.parentSection && sourceModule.parentId) {
      if (sourceModule.parentSection === 'rescue') return 'rescue'
      if (sourceModule.parentSection === 'always') return 'always'
    }

    // Par défaut, lien normal
    return 'normal'
  }

  // Handlers de redimensionnement
  const handleResizeStart = (blockId: string, direction: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const block = modules.find(m => m.id === blockId)
    if (!block || !block.isBlock) return

    const blockDims = getBlockDimensions(block)

    setResizingBlock({
      id: blockId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: block.width || blockDims.width,
      startHeight: block.height || blockDims.height,
      startBlockX: block.x,
      startBlockY: block.y,
      direction
    })
  }

  useEffect(() => {
    if (!resizingBlock) return

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingBlock.startX
      const deltaY = e.clientY - resizingBlock.startY

      let newWidth = resizingBlock.startWidth
      let newHeight = resizingBlock.startHeight
      let newX = resizingBlock.startBlockX
      let newY = resizingBlock.startBlockY

      const minWidth = 300
      const minHeight = 250

      // Calculer les nouvelles dimensions selon la direction
      if (resizingBlock.direction.includes('e')) {
        newWidth = Math.max(minWidth, resizingBlock.startWidth + deltaX)
      }
      if (resizingBlock.direction.includes('w')) {
        const potentialWidth = Math.max(minWidth, resizingBlock.startWidth - deltaX)
        if (potentialWidth >= minWidth) {
          newWidth = potentialWidth
          newX = resizingBlock.startBlockX + (resizingBlock.startWidth - newWidth)
        }
      }
      if (resizingBlock.direction.includes('s')) {
        newHeight = Math.max(minHeight, resizingBlock.startHeight + deltaY)
      }
      if (resizingBlock.direction.includes('n')) {
        const potentialHeight = Math.max(minHeight, resizingBlock.startHeight - deltaY)
        if (potentialHeight >= minHeight) {
          newHeight = potentialHeight
          newY = resizingBlock.startBlockY + (resizingBlock.startHeight - newHeight)
        }
      }

      // Mettre à jour le block
      setModules(prev => prev.map(m =>
        m.id === resizingBlock.id
          ? { ...m, width: newWidth, height: newHeight, x: newX, y: newY }
          : m
      ))
    }

    const handleResizeEnd = () => {
      setResizingBlock(null)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizingBlock, modules])

  // Handler pour le drop dans une section de block
  const handleBlockSectionDrop = (blockId: string, section: 'normal' | 'rescue' | 'always', e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')

    // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
    if (sourceId === blockId) {
      return
    }

    // Cas spécial: START de section PLAY droppé dans une section de block
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)

      // Si c'est un START de section PLAY (isPlay = true), créer un lien avec le block
      if (sourceModule && sourceModule.isPlay) {
        e.preventDefault()
        e.stopPropagation()
        createLink(getLinkTypeFromSource(sourceId), sourceId, blockId)
        return
      }
    }

    // Ignorer les mini START tasks des blocks - ils ne doivent pas être déplacés
    if (sourceId && sourceId.endsWith('-start')) {
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
      if (sourceModule.parentId === blockId && sourceModule.parentSection === section) {
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

          // Un seul appel à setModules pour: retirer de l'ancien parent + ajouter au nouveau parent + update la tâche
          setModules(prev => {
            const oldParentId = sourceModule.parentId
            const oldSection = sourceModule.parentSection

            return prev.map(m => {
              // 1. Retirer de l'ancien parent (si existe)
              if (oldParentId && m.id === oldParentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [oldSection!]: sections[oldSection!].filter(id => id !== sourceId)
                  }
                }
              }

              // 2. Ajouter au nouveau parent
              if (m.id === blockId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [section]: sections[section].includes(sourceId) ? sections[section] : [...sections[section], sourceId]
                  }
                }
              }

              // 3. Mettre à jour la tâche elle-même
              if (m.id === sourceId) {
                return {
                  ...m,
                  parentId: blockId,
                  parentSection: section,
                  x: relativeX,
                  y: relativeY
                }
              }

              return m
            })
          })
          return
        } else {
          // A des liens: créer un lien avec le block
          e.preventDefault()
          e.stopPropagation()
          createLink(getLinkTypeFromSource(sourceId), sourceId, blockId)
          return
        }
      }
    }
    // Cas 2: Nouveau module depuis la palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      // Ne pas permettre de déposer un PLAY dans une section (les blocks sont autorisés)
      if (parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const isBlock = parsedData.name === 'block'
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: `${parsedData.name} ${isBlock ? 'block' : 'task'}`,
          x: relativeX,
          y: relativeY,
          parentId: blockId,
          parentSection: section,
          isBlock: isBlock,
          ...(isBlock && { blockSections: { normal: [], rescue: [], always: [] } }),
        }

        // Un seul appel à setModules pour ajouter le module ET mettre à jour blockSections
        setModules(prev => {
          // Ajouter le nouveau module
          const updatedModules = [...prev, newModule]

          // Mettre à jour le block parent pour ajouter l'ID à la section
          return updatedModules.map(m => {
            if (m.id === blockId) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [section]: [...sections[section], newModuleId]
                }
              }
            }
            return m
          })
        })
      }
    }
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
    // Utiliser la forme fonctionnelle pour garantir l'accès à l'état le plus récent
    setModules(prev => {
      const task = prev.find(m => m.id === taskId)
      const block = prev.find(m => m.id === blockId)

      if (!task || !block || !block.isBlock) return prev

      // Si la tâche vient d'une autre section du même block, la retirer de l'ancienne section
      const oldSection = task.parentSection

      // Mettre à jour le block pour ajouter la tâche à la section appropriée
      return prev.map(m => {
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
      })
    })
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

  // Helper pour récupérer la section PLAY dans laquelle se trouve un module (en remontant la hiérarchie)
  const getModulePlaySection = (module: ModuleBlock): 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' | null => {
    // Si le module a directement une parentSection mais pas de parentId, c'est qu'il est directement dans une section PLAY
    if (module.parentSection && !module.parentId) {
      return module.parentSection as any
    }

    // Si le module a un parentId, remonter au parent
    if (module.parentId) {
      const parent = modules.find(m => m.id === module.parentId)
      if (parent) {
        return getModulePlaySection(parent) // Récursion pour remonter la hiérarchie
      }
    }

    return null // Pas dans une section PLAY
  }

  // Fonction générale pour compter les tâches dans la chaîne partant d'un START (PLAY ou block)
  const getStartChainCount = (startId: string): number => {
    // Parcourir récursivement tous les liens depuis START (BFS)
    const visited = new Set<string>()
    const queue = [startId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      // Trouver tous les liens sortants depuis cette tâche
      const outgoingLinks = links.filter(link => link.from === currentId)
      for (const link of outgoingLinks) {
        if (!visited.has(link.to)) {
          queue.push(link.to)
        }
      }
    }

    // Retourner le nombre de tâches (moins START elle-même)
    return Math.max(0, visited.size - 1)
  }

  // Fonction wrapper pour compter les tâches dans la chaîne partant de START d'une section PLAY
  const getTaskChainCount = (sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'): number => {
    // Trouver la tâche START de la section
    const startTask = modules.find(m => m.isPlay && !m.parentId && m.parentSection === sectionName)
    if (!startTask) return 0
    return getStartChainCount(startTask.id)
  }

  const togglePlaySection = (playId: string, section: PlaySectionName) => {
    setCollapsedPlaySections(prev => {
      const newSet = new Set(prev)
      const key = `${playId}:${section}`
      const wildcardKey = `*:${section}`

      // Variables et Roles fonctionnent indépendamment (pas d'accordion)
      if (section === 'variables' || section === 'roles') {
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
        // Fermer toutes les sections de tâches de ce PLAY (pas Variables ni Roles)
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

    // Cas 1: Module existant déplacé
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      // Ne pas autoriser le déplacement des tâches START
      if (sourceModule.isPlay) return

      // Déterminer l'offset selon le type de module
      const isBlock = sourceModule.isBlock
      const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : (isBlock ? 200 : 75)
      const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : (isBlock ? 150 : 60)

      let relativeX = e.clientX - sectionRect.left - offsetX
      let relativeY = e.clientY - sectionRect.top - offsetY

      // Contraindre dans les limites de la section
      const itemWidth = isBlock ? 400 : 140
      const itemHeight = isBlock ? 300 : 60
      relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
      relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

      // Sous-cas 1.1: Même section - repositionnement
      if (sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        return
      }
      // Sous-cas 1.2: Tâche/Block externe (autre section ou zone de travail)
      else {
        // Vérifier si la tâche a des liens
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          // Pas de liens: déplacer la tâche/block dans cette section
          e.preventDefault()
          e.stopPropagation()

          // Retirer de l'ancienne section de block si elle était dans une
          const oldParentId = sourceModule.parentId
          const oldSection = sourceModule.parentSection

          setModules(prev => prev.map(m => {
            // 1. Retirer de l'ancien parent block si existe
            if (oldParentId && m.id === oldParentId && oldSection) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                }
              }
            }

            // 2. Mettre à jour la tâche/block avec la nouvelle section PLAY et position
            if (m.id === sourceId) {
              return { ...m, parentSection: section, x: relativeX, y: relativeY, parentId: undefined }
            }

            return m
          }))
          return
        } else {
          // A des liens: on ne peut pas déplacer une tâche/block avec des liens entre sections
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    }
    // Cas 2: Nouveau module depuis la palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      // Ne pas permettre de déposer un PLAY dans une section
      if (parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const isBlock = parsedData.name === 'block'

        // Ajuster l'offset selon le type (block ou tâche)
        const dropOffsetX = isBlock ? 200 : 75
        const dropOffsetY = isBlock ? 150 : 60
        const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : dropOffsetX
        const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : dropOffsetY

        let relativeX = e.clientX - sectionRect.left - offsetX
        let relativeY = e.clientY - sectionRect.top - offsetY

        // Contraindre dans les limites de la section
        const itemWidth = isBlock ? 400 : 140
        const itemHeight = isBlock ? 300 : 60
        relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
        relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

        const newModule: ModuleBlock = {
          id: `module-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: isBlock ? 'Error Handling Block' : `${parsedData.name} task`,
          x: relativeX,
          y: relativeY,
          isBlock: isBlock,
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
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

  // Forcer un re-calcul des positions des liens après changement de section PLAY
  useEffect(() => {
    const timer = setTimeout(() => {
      setLinkRefreshKey(prev => prev + 1)
    }, 100) // Délai pour laisser le DOM se mettre à jour après le changement d'accordéon

    return () => clearTimeout(timer)
  }, [collapsedPlaySections])


  // Fonction pour mettre à jour un module
  const handleUpdateModuleAttributes = useCallback((id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string }>) => {
    // Gérer les modules normaux
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
  }, [modules, selectedModuleId, onSelectModule, setModules, setPlays, activePlayIndex, currentPlay])

  // Exposer handleUpdateModuleAttributes au parent via callback
  useEffect(() => {
    if (onUpdateModule) {
      onUpdateModule(handleUpdateModuleAttributes)
    }
  }, [handleUpdateModuleAttributes, onUpdateModule])

  // Fonction pour obtenir les attributs du PLAY courant
  const getPlayAttributes = useCallback((): PlayAttributes => {
    return currentPlay.attributes || {}
  }, [currentPlay])

  // Fonction pour mettre à jour les attributs du PLAY courant
  const updatePlayAttributes = useCallback((updates: Partial<PlayAttributes>) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          ...updates
        }
      }
      return updatedPlays
    })
  }, [activePlayIndex, setPlays])

  // Exposer les fonctions PLAY attributes au parent via callback
  useEffect(() => {
    if (onPlayAttributes) {
      onPlayAttributes(getPlayAttributes, updatePlayAttributes)
    }
  }, [getPlayAttributes, updatePlayAttributes, onPlayAttributes])

  // Obtenir le style du lien selon son type
  const getLinkStyle = (type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    switch (type) {
      case 'rescue':
        return { stroke: '#ff9800', strokeDasharray: '5,5', label: 'rescue' }
      case 'always':
        return { stroke: '#4caf50', strokeDasharray: '0', strokeWidth: '3', label: 'always' }
      case 'pre_tasks':
        return { stroke: '#9c27b0', strokeDasharray: '0', label: '' }
      case 'tasks':
        return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
      case 'post_tasks':
        return { stroke: '#00796b', strokeDasharray: '0', label: '' }
      case 'handlers':
        return { stroke: '#f57c00', strokeDasharray: '8,4', label: '' }
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


  // Obtenir un module ou créer un objet virtuel pour un mini START task
  const getModuleOrVirtual = (moduleId: string): ModuleBlock | undefined => {
    // Essayer de trouver dans modules
    const module = modules.find(m => m.id === moduleId)
    if (module) return module

    // Si c'est un mini START task (pattern: blockId-section-start)
    if (moduleId.endsWith('-start')) {
      // Parser le blockId et la section depuis moduleId
      const parts = moduleId.split('-')
      if (parts.length >= 3 && parts[parts.length - 1] === 'start') {
        const section = parts[parts.length - 2] as 'normal' | 'rescue' | 'always'
        const blockId = parts.slice(0, -2).join('-')

        // Vérifier que le block parent existe
        const parentBlock = modules.find(m => m.id === blockId)

        if (parentBlock) {
          // Créer un module virtuel avec coordonnées RELATIVES à la section
          // SectionLinks utilisera ces coordonnées directement
          return {
            id: moduleId,
            collection: 'virtual',
            name: 'mini-start',
            description: 'Mini START task',
            taskName: 'START',
            x: 20, // Position relative dans la section
            y: 10, // Position relative dans la section
            isBlock: false,
            isPlay: false,
            parentId: blockId, // Important: lier au parent block
            parentSection: section, // Important: lier à la section
          }
        }
      }
    }

    return undefined
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
      attributes: {
        hosts: 'all',
        remoteUser: undefined,
        gatherFacts: true,
        become: false,
        connection: 'ssh',
        roles: [],
      },
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

  // Gestion des roles
  const [newRole, setNewRole] = useState('')
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null)

  const addRole = () => {
    if (!newRole.trim()) return
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: [...currentRoles, newRole.trim()]
        }
      }
      return updatedPlays
    })
    setNewRole('')
  }

  const deleteRole = (index: number) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles.filter((_, i) => i !== index)
        }
      }
      return updatedPlays
    })
  }

  const handleRoleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedRoleIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleRoleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRoleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault()

    if (draggedRoleIndex === null || draggedRoleIndex === targetIndex) {
      setDraggedRoleIndex(null)
      return
    }

    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]
      const [draggedRole] = currentRoles.splice(draggedRoleIndex, 1)
      currentRoles.splice(targetIndex, 0, draggedRole)

      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles
        }
      }
      return updatedPlays
    })
    setDraggedRoleIndex(null)
  }

  const handleRoleDragEnd = () => {
    setDraggedRoleIndex(null)
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
  const isRolesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'roles') : false
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
            onChange={(_, newValue) => {
              setActivePlayIndex(newValue)
              onSelectModule(null) // Clear selected module to show PLAY config
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {plays.map((play, index) => (
              <Tab
                key={play.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 0.5 }}>
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
                    {/* Icônes d'attributs PLAY */}
                    <PlayAttributeIcons
                      attributes={play.attributes || {}}
                      size="small"
                    />
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
      <Box ref={playSectionsContainerRef} sx={{ display: 'flex', flexDirection: 'column', flex: 1, bgcolor: 'background.paper', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Section 1: Variables (Accordion - always visible) */}
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
              '&:hover': { bgcolor: `${getPlaySectionColor('variables')}25` },
              position: 'relative',
              zIndex: 3
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
            <Box ref={variablesSectionRef} sx={{ px: 3, py: 1.5, bgcolor: `${getPlaySectionColor('variables')}08` }}>
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

        {/* Tabs Navigation Bar for Roles and Task Sections */}
        <Box sx={{ borderBottom: 2, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs
            value={activeSectionTab}
            onChange={(e, newValue) => setActiveSectionTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 56,
              '& .MuiTabs-indicator': {
                height: 3,
              }
            }}
          >
            {/* Roles Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<ExtensionIcon sx={{ fontSize: 20, color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)' }} />}
                  count={currentPlay.attributes?.roles?.length || 0}
                  color="#4caf50"
                  isActive={activeSectionTab === 'roles'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'roles' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Roles
                </Typography>
              }
              iconPosition="start"
              value="roles"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)',
                bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'roles' ? '3px solid #4caf50' : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.18)' : 'rgba(76, 175, 80, 0.08)',
                  color: '#4caf50'
                }
              }}
            />

            {/* Pre-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipPreviousIcon sx={{ fontSize: 20, color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6` }} />}
                  count={getTaskChainCount('pre_tasks')}
                  color={getPlaySectionColor('pre_tasks')}
                  isActive={activeSectionTab === 'pre_tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'pre_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Pre-Tasks
                </Typography>
              }
              iconPosition="start"
              value="pre_tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6`,
                bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'pre_tasks' ? `3px solid ${getPlaySectionColor('pre_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}20` : `${getPlaySectionColor('pre_tasks')}08`,
                  color: getPlaySectionColor('pre_tasks')
                }
              }}
            />

            {/* Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<PlaylistPlayIcon sx={{ fontSize: 20, color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6` }} />}
                  count={getTaskChainCount('tasks')}
                  color={getPlaySectionColor('tasks')}
                  isActive={activeSectionTab === 'tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Tasks
                </Typography>
              }
              iconPosition="start"
              value="tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6`,
                bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'tasks' ? `3px solid ${getPlaySectionColor('tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}20` : `${getPlaySectionColor('tasks')}08`,
                  color: getPlaySectionColor('tasks')
                }
              }}
            />

            {/* Post-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipNextIcon sx={{ fontSize: 20, color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6` }} />}
                  count={getTaskChainCount('post_tasks')}
                  color={getPlaySectionColor('post_tasks')}
                  isActive={activeSectionTab === 'post_tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'post_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Post-Tasks
                </Typography>
              }
              iconPosition="start"
              value="post_tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6`,
                bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'post_tasks' ? `3px solid ${getPlaySectionColor('post_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}20` : `${getPlaySectionColor('post_tasks')}08`,
                  color: getPlaySectionColor('post_tasks')
                }
              }}
            />

            {/* Handlers Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<NotificationsActiveIcon sx={{ fontSize: 20, color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6` }} />}
                  count={getTaskChainCount('handlers')}
                  color={getPlaySectionColor('handlers')}
                  isActive={activeSectionTab === 'handlers'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'handlers' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Handlers
                </Typography>
              }
              iconPosition="start"
              value="handlers"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6`,
                bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'handlers' ? `3px solid ${getPlaySectionColor('handlers')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}20` : `${getPlaySectionColor('handlers')}08`,
                  color: getPlaySectionColor('handlers')
                }
              }}
            />
          </Tabs>
        </Box>

        {/* Tab Content: Roles */}
        {activeSectionTab === 'roles' && (
          <Box sx={{ flex: 1, px: 3, py: 2, bgcolor: '#4caf5008', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
              {(currentPlay.attributes?.roles || []).map((role, index) => (
                <Chip
                  key={`${role}-${index}`}
                  label={role}
                  size="small"
                  onDelete={() => deleteRole(index)}
                  color="success"
                  variant="outlined"
                  draggable
                  onDragStart={(e) => handleRoleDragStart(index, e)}
                  onDragOver={(e) => handleRoleDragOver(index, e)}
                  onDrop={(e) => handleRoleDrop(index, e)}
                  onDragEnd={handleRoleDragEnd}
                  sx={{
                    cursor: 'move',
                    opacity: draggedRoleIndex === index ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                    '&:hover': { boxShadow: 2 },
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Role name"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addRole()
                  }
                }}
                sx={{ flex: 1, maxWidth: 300 }}
              />
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                color="success"
                onClick={addRole}
                disabled={!newRole.trim()}
              >
                Add Role
              </Button>
            </Box>
          </Box>
        )}

        {/* Tab Content: Pre-Tasks */}
        {activeSectionTab === 'pre_tasks' && (
          <Box
            ref={preTasksSectionRef}
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
            {/* Render START task and other tasks/blocks in pre_tasks section */}
            <PlaySectionContent
              sectionName="pre_tasks"
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
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="pre_tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Tasks */}
        {activeSectionTab === 'tasks' && (
          <Box
            ref={tasksSectionRef}
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
            {/* Render START task and other tasks/blocks in tasks section */}
            <PlaySectionContent
              sectionName="tasks"
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
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Post-Tasks */}
        {activeSectionTab === 'post_tasks' && (
          <Box
            ref={postTasksSectionRef}
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
            <PlaySectionContent
              sectionName="post_tasks"
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
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="post_tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Handlers */}
        {activeSectionTab === 'handlers' && (
          <Box
            ref={handlersSectionRef}
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
            <PlaySectionContent
              sectionName="handlers"
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
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="handlers"
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
                      height: dimensions.height,
                      p: 1,
                      cursor: 'move',
                      border: selectedModuleId === module.id ? `2px solid ${blockTheme.borderColorSelected}` : `2px solid ${blockTheme.borderColor}`,
                      borderRadius: module.isPlay ? '0 50% 50% 0' : 2,
                      bgcolor: blockTheme.backgroundColor,
                      zIndex: draggedModuleId === module.id ? 10 : 1,
                      opacity: draggedModuleId === module.id ? 0.7 : 1,
                      overflow: 'visible',
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
                        <TaskAttributeIcons
                          attributes={{
                            when: module.when,
                            ignoreErrors: module.ignoreErrors,
                            become: module.become,
                            loop: module.loop,
                            delegateTo: module.delegateTo
                          }}
                          size="small"
                          sx={{ pl: 3, mt: 0.5 }}
                        />
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
                              data-section-id={`${module.id}-normal`}
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
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Calculer la position relative à la section
                                    const sectionElem = e.currentTarget as HTMLElement
                                    const sectionRect = sectionElem.getBoundingClientRect()

                                    // Ajuster l'offset selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : 75
                                    const dropOffsetY = isBlock ? 150 : 60

                                    let relativeX = e.clientX - sectionRect.left - dropOffsetX
                                    let relativeY = e.clientY - sectionRect.top - dropOffsetY

                                    // Contraindre dans les limites de la section
                                    const itemWidth = isBlock ? 400 : 140
                                    const itemHeight = isBlock ? 300 : 60
                                    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
                                    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: relativeX,
                                      y: relativeY,
                                      parentId: module.id,
                                      parentSection: 'normal',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
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
                              <BlockSectionContent
                                blockId={module.id}
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
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                              />
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
                              data-section-id={`${module.id}-rescue`}
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
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Ajuster l'offset et contraintes selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : offsetX
                                    const dropOffsetY = isBlock ? 150 : offsetY
                                    const itemWidth = isBlock ? 400 : taskWidth
                                    const itemHeight = isBlock ? 300 : taskHeight

                                    let adjustedX = e.clientX - sectionRect.left - dropOffsetX
                                    let adjustedY = e.clientY - sectionRect.top - dropOffsetY
                                    adjustedX = Math.max(0, Math.min(adjustedX, sectionRect.width - itemWidth))
                                    adjustedY = Math.max(0, Math.min(adjustedY, sectionRect.height - itemHeight))

                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: adjustedX,
                                      y: adjustedY,
                                      parentId: module.id,
                                      parentSection: 'rescue',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
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
                              <BlockSectionContent
                                blockId={module.id}
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
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                              />
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
                              data-section-id={`${module.id}-always`}
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
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Ajuster l'offset et contraintes selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : offsetX
                                    const dropOffsetY = isBlock ? 150 : offsetY
                                    const itemWidth = isBlock ? 400 : taskWidth
                                    const itemHeight = isBlock ? 300 : taskHeight

                                    let adjustedX = e.clientX - sectionRect.left - dropOffsetX
                                    let adjustedY = e.clientY - sectionRect.top - dropOffsetY
                                    adjustedX = Math.max(0, Math.min(adjustedX, sectionRect.width - itemWidth))
                                    adjustedY = Math.max(0, Math.min(adjustedY, sectionRect.height - itemHeight))

                                    const newModule: ModuleBlock = {
                                      id: Date.now().toString(),
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: adjustedX,
                                      y: adjustedY,
                                      parentId: module.id,
                                      parentSection: 'always',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
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
                              <BlockSectionContent
                                blockId={module.id}
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
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                              />
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
                          onMouseDown={(e) => handleResizeStart(module.id, 'nw', e)}
                          sx={{
                            position: 'absolute',
                            top: -6,
                            left: -6,
                            width: 16,
                            height: 16,
                            cursor: 'nwse-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'nw' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: '50%',
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Nord-Est */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'ne', e)}
                          sx={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 16,
                            height: 16,
                            cursor: 'nesw-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'ne' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: '50%',
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Sud-Ouest */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'sw', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -6,
                            left: -6,
                            width: 16,
                            height: 16,
                            cursor: 'nesw-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'sw' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: '50%',
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Coin Sud-Est */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'se', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -6,
                            right: -6,
                            width: 16,
                            height: 16,
                            cursor: 'nwse-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'se' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: '50%',
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.3)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Nord */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'n', e)}
                          sx={{
                            position: 'absolute',
                            top: -6,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 40,
                            height: 12,
                            cursor: 'ns-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'n' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: 2,
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'translateX(-50%) scaleY(1.4)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Sud */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 's', e)}
                          sx={{
                            position: 'absolute',
                            bottom: -6,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 40,
                            height: 12,
                            cursor: 'ns-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 's' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: 2,
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'translateX(-50%) scaleY(1.4)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Ouest */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'w', e)}
                          sx={{
                            position: 'absolute',
                            left: -6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 12,
                            height: 40,
                            cursor: 'ew-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'w' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: 2,
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-50%) scaleX(1.4)' },
                            transition: 'all 0.2s',
                            zIndex: 20,
                          }}
                        />

                        {/* Bord Est */}
                        <Box
                          onMouseDown={(e) => handleResizeStart(module.id, 'e', e)}
                          sx={{
                            position: 'absolute',
                            right: -6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 12,
                            height: 40,
                            cursor: 'ew-resize',
                            bgcolor: resizingBlock?.id === module.id && resizingBlock?.direction === 'e' ? 'primary.dark' : 'primary.main',
                            border: `2px solid white`,
                            borderRadius: 2,
                            opacity: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-50%) scaleX(1.4)' },
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
                    <TaskAttributeIcons
                      attributes={{
                        when: module.when,
                        ignoreErrors: module.ignoreErrors,
                        become: module.become,
                        loop: module.loop,
                        delegateTo: module.delegateTo
                      }}
                      size="small"
                      sx={{ mt: 0.25, minHeight: 14 }}
                    />
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
