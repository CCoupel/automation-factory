import React, { useCallback } from 'react'
import { usePlaybookEditorStore } from '../stores/playbookEditorStore'
import { ModuleBlock, Link, isSystemBlock } from '../types/playbook'
import { snapToGrid, getBlockDimensions, getLinkTypeFromSource } from '../utils/canvasHelpers'
import { CollaborationCallbacks } from '../components/zones/WorkZone'

interface UseCanvasDragDropParams {
  collaborationCallbacks?: CollaborationCallbacks
  canvasRef?: React.RefObject<HTMLDivElement | null>
}

export const useCanvasDragDrop = ({ collaborationCallbacks, canvasRef }: UseCanvasDragDropParams) => {
  const modules = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.modules || [])
  const links = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.links || [])
  const gridEnabled = usePlaybookEditorStore(s => s.gridEnabled)
  const selectedModuleId = usePlaybookEditorStore(s => s.selectedModuleId)
  const setModules = usePlaybookEditorStore(s => s.setModulesForActivePlay)
  const setLinks = usePlaybookEditorStore(s => s.setLinksForActivePlay)
  const setDraggedModuleId = usePlaybookEditorStore(s => s.setDraggedModuleId)
  const selectModule = usePlaybookEditorStore(s => s.selectModule)
  const setPlays = usePlaybookEditorStore(s => s.setPlays)
  const setCollapsedBlocks = usePlaybookEditorStore(s => s.setCollapsedBlocks)
  const setCollapsedBlockSections = usePlaybookEditorStore(s => s.setCollapsedBlockSections)
  const activePlayIndex = usePlaybookEditorStore(s => s.activePlayIndex)
  const collapsedBlocks = usePlaybookEditorStore(s => s.collapsedBlocks)
  const collapsedBlockSections = usePlaybookEditorStore(s => s.collapsedBlockSections)

  // Local wrapper: existing JSX calls onSelectModule({id, name, ...}) — extract just the id
  const onSelectModule = useCallback((module: { id: string; [key: string]: any } | null) => {
    selectModule(module?.id ?? null)
  }, [selectModule])

  const createLink = useCallback((
    type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers',
    fromId: string,
    toId: string,
  ) => {
    if (!fromId || !toId) return

    const newLink: Link = {
      id: `link-${Date.now()}`,
      from: fromId,
      to: toId,
      type,
    }

    setLinks(prevLinks => {
      const updatedLinks = prevLinks.filter(l => {
        if (l.from === fromId && l.type === type) return false
        if (l.to === toId && l.type === type) return false
        return true
      })
      return [...updatedLinks, newLink]
    })

    collaborationCallbacks?.sendLinkAdd?.({ link: newLink })
  }, [setLinks, collaborationCallbacks])

  const deleteLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId))
    collaborationCallbacks?.sendLinkDelete?.({ linkId })
  }, [setLinks, collaborationCallbacks])

  const updateTaskName = useCallback((id: string, newName: string) => {
    const module = modules.find(m => m.id === id)

    if (module?.isPlay) {
      const activePlay = usePlaybookEditorStore.getState().plays[activePlayIndex]
      setPlays(prevPlays => {
        const updatedPlays = [...prevPlays]
        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          name: newName,
          modules: updatedPlays[activePlayIndex].modules.map(m =>
            m.id === id ? { ...m, taskName: newName } : m
          ),
        }
        return updatedPlays
      })
      if (activePlay) {
        collaborationCallbacks?.sendPlayUpdate?.({ playId: activePlay.id, field: 'name', value: newName })
      }
    } else {
      setModules(prev => prev.map(m => m.id === id ? { ...m, taskName: newName } : m))
      collaborationCallbacks?.sendModuleConfig?.({ moduleId: id, field: 'taskName', value: newName })
    }
  }, [modules, setPlays, activePlayIndex, setModules, collaborationCallbacks])

  const handleDelete = useCallback((id: string) => {
    const module = modules.find(m => m.id === id)
    if (module?.isPlay) return
    if (module && isSystemBlock(module)) return

    if (selectedModuleId === id) {
      onSelectModule(null)
    }

    setLinks(prev => prev.filter(l => l.from !== id && l.to !== id))

    if (module?.isBlock && module.children) {
      setModules(prev => prev.filter(m => m.id !== id && !module.children?.includes(m.id)))
    } else {
      setModules(prev => prev.map(m => {
        if (m.children?.includes(id)) {
          return { ...m, children: m.children.filter(childId => childId !== id) }
        }
        return m
      }).filter(m => m.id !== id))
    }

    collaborationCallbacks?.sendModuleDelete?.({ moduleId: id })
  }, [modules, selectedModuleId, onSelectModule, setModules, setLinks, collaborationCallbacks])

  const handleModuleDragStart = useCallback((id: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('existingModule', id)

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    e.dataTransfer.setData('dragOffsetX', offsetX.toString())
    e.dataTransfer.setData('dragOffsetY', offsetY.toString())

    const sourceModule = modules.find(m => m.id === id)
    if (sourceModule?.parentId) {
      const parentBlock = modules.find(m => m.id === sourceModule.parentId)
      if (parentBlock?.isSystem) {
        e.dataTransfer.setData('systemParentId', sourceModule.parentId)
      }
    }

    setDraggedModuleId(id)
    e.stopPropagation()
  }, [modules, setDraggedModuleId])

  const handleModuleDragOver = useCallback((_targetId: string, e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleModuleDropOnModule = useCallback((targetId: string, e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')

    if (sourceId === targetId) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (sourceId && sourceId !== targetId) {
      // Mini START task
      if (sourceId.endsWith('-start')) {
        const targetModule = modules.find(m => m.id === targetId)
        if (!targetModule) {
          setDraggedModuleId(null)
          return
        }

        const startIdParts = sourceId.split('-')
        const section = startIdParts[startIdParts.length - 2]
        const blockId = startIdParts.slice(0, -2).join('-')

        if (targetId === blockId || targetModule.parentId === sourceId) {
          setDraggedModuleId(null)
          return
        }

        if (targetModule.parentId !== blockId || targetModule.parentSection !== section) {
          setDraggedModuleId(null)
          return
        }

        createLink(getLinkTypeFromSource(sourceId, modules), sourceId, targetId)
        setDraggedModuleId(null)
        return
      }

      const sourceModule = modules.find(m => m.id === sourceId)
      const targetModule = modules.find(m => m.id === targetId)

      if (!sourceModule || !targetModule) return

      if (sourceModule.parentId === targetId || targetModule.parentId === sourceId) {
        return
      }

      // PLAY START task
      if (sourceModule.isPlay) {
        if (!targetModule.parentId && targetModule.parentSection) {
          if (sourceModule.parentSection !== targetModule.parentSection) {
            return
          }
        } else {
          return
        }
      }

      // Validate same section
      if (sourceModule.parentId && sourceModule.parentSection && targetModule.parentId && targetModule.parentSection) {
        if (sourceModule.parentId !== targetModule.parentId || sourceModule.parentSection !== targetModule.parentSection) {
          return
        }
      } else if (!sourceModule.parentId && sourceModule.parentSection && !targetModule.parentId && targetModule.parentSection) {
        if (sourceModule.parentSection !== targetModule.parentSection) {
          return
        }
      } else {
        return
      }

      createLink(getLinkTypeFromSource(sourceId, modules), sourceId, targetId)
    }
    setDraggedModuleId(null)
  }, [modules, createLink, setDraggedModuleId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    const target = e.target as HTMLElement
    const blockContainerElem = target.closest('.block-container')

    if (!canvasRef?.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    const moduleData = e.dataTransfer.getData('module')
    const existingModuleId = e.dataTransfer.getData('existingModule')

    const movedModule = existingModuleId ? modules.find(m => m.id === existingModuleId) : null
    const isMovingBlockOrPlay = movedModule && (movedModule.isBlock || movedModule.isPlay)

    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')

    let offsetX = 75
    let offsetY = 60

    if (dragOffsetXStr && dragOffsetYStr) {
      offsetX = parseFloat(dragOffsetXStr)
      offsetY = parseFloat(dragOffsetYStr)
    } else if (movedModule) {
      if (movedModule.isBlock || movedModule.isPlay) {
        const dims = getBlockDimensions(movedModule, modules, collapsedBlocks, collapsedBlockSections)
        offsetX = dims.width / 2
        offsetY = dims.height / 2
      }
    } else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      if (parsedData.name === 'block' || parsedData.name === 'play') {
        offsetX = 200
        offsetY = 150
      }
    }

    let x = e.clientX - rect.left - offsetX
    let y = e.clientY - rect.top - offsetY

    if (gridEnabled) {
      x = snapToGrid(x)
      y = snapToGrid(y)
    }

    // Drop in block container
    if (blockContainerElem && !isMovingBlockOrPlay) {
      const blockId = blockContainerElem.getAttribute('data-block-id')
      const block = modules.find(m => m.id === blockId)

      if (block && block.isBlock) {
        const blockContainerRect = blockContainerElem.getBoundingClientRect()
        let relativeX = e.clientX - blockContainerRect.left - offsetX
        let relativeY = e.clientY - blockContainerRect.top - offsetY

        const taskWidth = 140
        const taskHeight = 60
        const blockDims = getBlockDimensions(block, modules, collapsedBlocks, collapsedBlockSections)
        const containerPadding = 8
        const maxX = blockDims.width - taskWidth - containerPadding * 2
        const maxY = blockDims.height - taskHeight - 50 - containerPadding * 2

        relativeX = Math.max(0, Math.min(relativeX, maxX))
        relativeY = Math.max(0, Math.min(relativeY, maxY))

        if (existingModuleId) {
          setModules(prev => prev.map(m => {
            if (m.id === movedModule?.parentId && movedModule.parentId !== blockId && m.children) {
              return { ...m, children: m.children.filter(id => id !== existingModuleId) }
            }
            if (m.id === blockId && !m.children?.includes(existingModuleId)) {
              return { ...m, children: [...(m.children || []), existingModuleId] }
            }
            if (m.id === existingModuleId) {
              return { ...m, x: relativeX, y: relativeY, parentId: blockId }
            }
            return m
          }))
          collaborationCallbacks?.sendModuleMove?.({ moduleId: existingModuleId, x: relativeX, y: relativeY, parentId: blockId })
          setDraggedModuleId(null)
          return
        }

        if (moduleData && !existingModuleId) {
          const parsedData = JSON.parse(moduleData)
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
            collaborationCallbacks?.sendModuleAdd?.({
              moduleId: newModule.id,
              module: newModule,
              position: { x: relativeX, y: relativeY },
            })
          }
        }
        return
      }
    }

    // Drop on canvas
    if (!blockContainerElem || isMovingBlockOrPlay) {
      if (existingModuleId) {
        const hasLinks = links.some(l => l.from === existingModuleId || l.to === existingModuleId)

        setModules(prev => {
          const movedModule = prev.find(m => m.id === existingModuleId)
          if (!movedModule) return prev

          if (movedModule.parentId && movedModule.parentSection && !movedModule.isPlay) {
            const parentBlock = prev.find(m => m.id === movedModule.parentId)
            if (parentBlock?.isSystem) {
              return prev
            }

            if (hasLinks) {
              return prev
            }

            return prev.map(m => {
              if (m.id === movedModule.parentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                const oldSection = movedModule.parentSection!
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [oldSection]: sections[oldSection].filter(id => id !== existingModuleId),
                  },
                }
              }
              if (m.id === existingModuleId) {
                return { ...m, x, y, parentId: undefined, parentSection: undefined }
              }
              return m
            })
          }

          return prev
        })

        if (hasLinks) {
          setDraggedModuleId(null)
          return
        }

        const movedModule = modules.find(m => m.id === existingModuleId)
        if (movedModule?.parentId && movedModule?.parentSection && !movedModule.isPlay) {
          setDraggedModuleId(null)
          return
        }

        setModules(prev => prev.map(m => {
          if (m.id === movedModule?.parentId && m.children) {
            return { ...m, children: m.children.filter(id => id !== existingModuleId) }
          }
          if (m.id === existingModuleId) {
            return { ...m, x, y, parentId: undefined, parentSection: undefined }
          }
          return m
        }))

        collaborationCallbacks?.sendModuleMove?.({ moduleId: existingModuleId, x, y })
        setDraggedModuleId(null)
      } else if (moduleData) {
        const parsedData = JSON.parse(moduleData)
        const isBlock = parsedData.name === 'block'
        const isPlay = parsedData.name === 'play'

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description,
          taskName: isPlay ? 'New Play' : isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
          x,
          y,
          isBlock,
          isPlay,
          children: isBlock ? [] : undefined,
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
        }
        setModules(prev => [...prev, newModule])

        if (isBlock) {
          setCollapsedBlockSections(prev => {
            const newSet = new Set(prev)
            newSet.add(`${newModuleId}:rescue`)
            newSet.add(`${newModuleId}:always`)
            return newSet
          })
        }

        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModule.id,
          module: newModule,
          position: { x, y },
        })
      }
    }
  }, [modules, links, gridEnabled, canvasRef, collapsedBlocks, collapsedBlockSections, setModules, setDraggedModuleId, setCollapsedBlockSections, collaborationCallbacks])

  const handleBlockSectionDrop = useCallback((
    blockId: string,
    section: 'normal' | 'rescue' | 'always',
    e: React.DragEvent,
  ) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')

    if (sourceId === blockId) {
      return
    }

    const targetBlock = modules.find(m => m.id === blockId)
    const sourceModule = sourceId ? modules.find(m => m.id === sourceId) : null
    const isTargetSystemBlock = targetBlock?.isSystem === true
    const isSourceFromSystemBlock = sourceModule?.parentId
      ? modules.find(m => m.id === sourceModule.parentId)?.isSystem === true
      : false

    const isInternalReposition = sourceModule?.parentId === blockId && sourceModule?.parentSection === section
    if (isTargetSystemBlock && !isInternalReposition) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (isSourceFromSystemBlock && sourceModule?.parentId !== blockId) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // START of play section dropped onto block section — create link
    if (sourceId) {
      if (sourceModule && sourceModule.isPlay) {
        e.preventDefault()
        e.stopPropagation()
        createLink(getLinkTypeFromSource(sourceId, modules), sourceId, blockId)
        return
      }
    }

    // Ignore mini START tasks
    if (sourceId && sourceId.endsWith('-start')) {
      return
    }

    // Calculate relative position
    const sectionElem = e.currentTarget as HTMLElement
    const sectionRect = sectionElem.getBoundingClientRect()
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
    const dropOffsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
    const dropOffsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

    let relativeX = e.clientX - sectionRect.left - dropOffsetX
    let relativeY = e.clientY - sectionRect.top - dropOffsetY

    const taskWidth = 140
    const taskHeight = 60
    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

    // Existing module
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      // Same section — reposition
      if (sourceModule.parentId === blockId && sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: blockId, parentSection: section })
        return
      }
      // External task
      else {
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          e.preventDefault()
          e.stopPropagation()

          setModules(prev => {
            const oldParentId = sourceModule.parentId
            const oldSection = sourceModule.parentSection

            return prev.map(m => {
              if (oldParentId && m.id === oldParentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [oldSection!]: sections[oldSection!].filter(id => id !== sourceId),
                  },
                }
              }

              if (m.id === blockId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [section]: sections[section].includes(sourceId) ? sections[section] : [...sections[section], sourceId],
                  },
                }
              }

              if (m.id === sourceId) {
                return {
                  ...m,
                  parentId: blockId,
                  parentSection: section,
                  x: relativeX,
                  y: relativeY,
                }
              }

              return m
            })
          })
          collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: blockId, parentSection: section })
          return
        } else {
          e.preventDefault()
          e.stopPropagation()
          createLink(getLinkTypeFromSource(sourceId, modules), sourceId, blockId)
          return
        }
      }
    }
    // New module from palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
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

        setModules(prev => {
          const updatedModules = [...prev, newModule]
          return updatedModules.map(m => {
            if (m.id === blockId) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [section]: [...sections[section], newModuleId],
                },
              }
            }
            return m
          })
        })

        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModuleId,
          module: newModule,
          position: { x: relativeX, y: relativeY },
        })
      }
    }
  }, [modules, links, createLink, setModules, collaborationCallbacks])

  const handlePlaySectionDrop = useCallback((
    section: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers',
    e: React.DragEvent,
  ) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')
    const systemParentId = e.dataTransfer.getData('systemParentId')

    if (systemParentId) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    const sectionElem = e.currentTarget as HTMLElement
    const sectionRect = sectionElem.getBoundingClientRect()
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')

    // Existing module
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      if (sourceModule.isPlay) return

      const isBlock = sourceModule.isBlock
      const dropOffsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : (isBlock ? 200 : 75)
      const dropOffsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : (isBlock ? 150 : 60)

      let relativeX = e.clientX - sectionRect.left - dropOffsetX
      let relativeY = e.clientY - sectionRect.top - dropOffsetY

      const itemWidth = isBlock ? 400 : 140
      const itemHeight = isBlock ? 300 : 60
      relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
      relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

      // Same section — reposition
      if (sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentSection: section })
        return
      }
      // External
      else {
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          e.preventDefault()
          e.stopPropagation()

          const oldParentId = sourceModule.parentId
          const oldSection = sourceModule.parentSection

          setModules(prev => prev.map(m => {
            if (oldParentId && m.id === oldParentId && oldSection) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [oldSection]: sections[oldSection].filter(id => id !== sourceId),
                },
              }
            }

            if (m.id === sourceId) {
              return { ...m, parentSection: section, x: relativeX, y: relativeY, parentId: undefined }
            }

            return m
          }))
          collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: undefined, parentSection: section })
          return
        } else {
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    }
    // New module from palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      if (parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const isBlock = parsedData.name === 'block'

        const dropOffsetX = isBlock ? 200 : 75
        const dropOffsetY = isBlock ? 150 : 60
        const dropOX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : dropOffsetX
        const dropOY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : dropOffsetY

        let relativeX = e.clientX - sectionRect.left - dropOX
        let relativeY = e.clientY - sectionRect.top - dropOY

        const itemWidth = isBlock ? 400 : 140
        const itemHeight = isBlock ? 300 : 60
        relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
        relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: isBlock ? 'Error Handling Block' : `${parsedData.name} task`,
          x: relativeX,
          y: relativeY,
          isBlock: isBlock,
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
          parentSection: section,
        }

        setModules(prev => [...prev, newModule])

        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModuleId,
          module: newModule,
          position: { x: relativeX, y: relativeY },
        })
      }
    }
    // Role from palette
    else {
      const roleData = e.dataTransfer.getData('role')
      if (roleData) {
        try {
          const parsedRole = JSON.parse(roleData)
          let roleName = ''

          if (parsedRole.type === 'standalone-role' && parsedRole.fqrn) {
            roleName = parsedRole.fqrn
          } else if (parsedRole.type === 'collection-role' && parsedRole.fqcn) {
            roleName = parsedRole.fqcn
          }

          if (roleName) {
            e.preventDefault()
            e.stopPropagation()

            const dropOX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
            const dropOY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

            let relativeX = e.clientX - sectionRect.left - dropOX
            let relativeY = e.clientY - sectionRect.top - dropOY

            relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - 140))
            relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - 60))

            const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const newModule: ModuleBlock = {
              id: newModuleId,
              collection: 'ansible.builtin',
              name: 'include_role',
              description: `Include role ${roleName}`,
              taskName: `Include role: ${roleName}`,
              x: relativeX,
              y: relativeY,
              parentSection: section,
              moduleParameters: {
                name: roleName,
              },
            }

            setModules(prev => [...prev, newModule])

            collaborationCallbacks?.sendModuleAdd?.({
              moduleId: newModuleId,
              module: newModule,
              position: { x: relativeX, y: relativeY },
            })
          }
        } catch (error) {
          console.error('Failed to parse role data:', error)
        }
      }
    }
  }, [modules, links, setModules, collaborationCallbacks])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return {
    handleDrop,
    handleModuleDragStart,
    handleModuleDragOver,
    handleModuleDropOnModule,
    handleBlockSectionDrop,
    handlePlaySectionDrop,
    handleDragOver,
    handleDelete,
    createLink,
    deleteLink,
    updateTaskName,
    onSelectModule,
  }
}
