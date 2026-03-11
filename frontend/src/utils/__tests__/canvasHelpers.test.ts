import { describe, it, expect } from 'vitest'
import {
  GRID_SIZE,
  snapToGrid,
  isSectionCollapsed,
  isPlaySectionCollapsed,
  getBlockDimensions,
  getModuleDimensions,
  getSectionColor,
  getPlaySectionColor,
  getPlayTheme,
  isOrphan,
  getBlockTheme,
  getTaskTheme,
  getLinkStyle,
  getLinkTypeFromSource,
  getStartChainCount,
  getModuleOrVirtual,
} from '../canvasHelpers'
import { ModuleBlock, Link } from '../../types/playbook'

// Helper to create a minimal module
const mod = (overrides: Partial<ModuleBlock> & { id: string }): ModuleBlock => ({
  collection: 'ansible.builtin',
  name: 'debug',
  description: '',
  taskName: 'Test',
  x: 0,
  y: 0,
  ...overrides,
})

describe('canvasHelpers', () => {
  // ==========================================
  // Grid
  // ==========================================
  describe('snapToGrid', () => {
    it('snaps value to nearest grid increment', () => {
      expect(snapToGrid(0)).toBe(0)
      expect(snapToGrid(24)).toBe(0)
      expect(snapToGrid(25)).toBe(GRID_SIZE)
      expect(snapToGrid(75)).toBe(100)
      expect(snapToGrid(100)).toBe(100)
    })

    it('handles negative values', () => {
      expect(snapToGrid(-10)).toBe(-0)
      expect(snapToGrid(-30)).toBe(-GRID_SIZE)
    })
  })

  // ==========================================
  // Collapsed checks
  // ==========================================
  describe('isSectionCollapsed', () => {
    it('returns true for explicit key', () => {
      const set = new Set(['block1:rescue'])
      expect(isSectionCollapsed('block1', 'rescue', set)).toBe(true)
    })

    it('returns true for wildcard key', () => {
      const set = new Set(['*:always'])
      expect(isSectionCollapsed('anyBlock', 'always', set)).toBe(true)
    })

    it('returns false when not collapsed', () => {
      const set = new Set(['block1:rescue'])
      expect(isSectionCollapsed('block1', 'normal', set)).toBe(false)
    })
  })

  describe('isPlaySectionCollapsed', () => {
    it('works with explicit and wildcard keys', () => {
      const set = new Set(['play1:handlers', '*:pre_tasks'])
      expect(isPlaySectionCollapsed('play1', 'handlers', set)).toBe(true)
      expect(isPlaySectionCollapsed('play2', 'pre_tasks', set)).toBe(true)
      expect(isPlaySectionCollapsed('play1', 'tasks', set)).toBe(false)
    })
  })

  // ==========================================
  // Dimensions
  // ==========================================
  describe('getBlockDimensions', () => {
    it('returns small size for PLAY (isPlay)', () => {
      const block = mod({ id: 'p1', isPlay: true })
      const dims = getBlockDimensions(block, [], new Set(), new Set())
      expect(dims).toEqual({ width: 150, height: 50 })
    })

    it('returns collapsed size', () => {
      const block = mod({ id: 'b1', isBlock: true })
      const dims = getBlockDimensions(block, [], new Set(['b1']), new Set())
      expect(dims).toEqual({ width: 140, height: 60 })
    })

    it('returns minimum dimensions for empty block', () => {
      const block = mod({
        id: 'b1',
        isBlock: true,
        blockSections: { normal: [], rescue: [], always: [] },
      })
      const dims = getBlockDimensions(block, [block], new Set(), new Set())
      expect(dims.width).toBeGreaterThanOrEqual(250)
      expect(dims.height).toBeGreaterThanOrEqual(250)
    })
  })

  describe('getModuleDimensions', () => {
    it('returns block dims for blocks', () => {
      const block = mod({ id: 'b1', isBlock: true })
      const dims = getModuleDimensions(block, [block], new Set(['b1']), new Set())
      expect(dims).toEqual({ width: 140, height: 60 })
    })

    it('returns 60x40 for virtual modules', () => {
      const m = mod({ id: 'v1', collection: 'virtual' })
      expect(getModuleDimensions(m, [], new Set(), new Set())).toEqual({ width: 60, height: 40 })
    })

    it('returns 60x40 for START tasks', () => {
      const m = mod({ id: 's1', isPlay: true })
      expect(getModuleDimensions(m, [], new Set(), new Set())).toEqual({ width: 60, height: 40 })
    })

    it('returns 140x60 for normal tasks', () => {
      const m = mod({ id: 't1' })
      expect(getModuleDimensions(m, [], new Set(), new Set())).toEqual({ width: 140, height: 60 })
    })
  })

  // ==========================================
  // Colors & Themes
  // ==========================================
  describe('getSectionColor', () => {
    it('returns correct colors', () => {
      expect(getSectionColor('normal')).toBe('#1976d2')
      expect(getSectionColor('rescue')).toBe('#ff9800')
      expect(getSectionColor('always')).toBe('#4caf50')
    })
  })

  describe('getPlaySectionColor', () => {
    it('returns distinct colors for each section', () => {
      const colors = new Set([
        getPlaySectionColor('variables'),
        getPlaySectionColor('roles'),
        getPlaySectionColor('pre_tasks'),
        getPlaySectionColor('tasks'),
        getPlaySectionColor('post_tasks'),
        getPlaySectionColor('handlers'),
      ])
      expect(colors.size).toBe(6)
    })
  })

  describe('getPlayTheme', () => {
    it('returns green theme', () => {
      const theme = getPlayTheme()
      expect(theme.borderColor).toBe('#2e7d32')
    })
  })

  describe('isOrphan', () => {
    it('returns false for PLAY modules', () => {
      const m = mod({ id: 's1', isPlay: true })
      expect(isOrphan('s1', [m], [])).toBe(false)
    })

    it('returns true for module with no incoming link', () => {
      const m = mod({ id: 't1' })
      expect(isOrphan('t1', [m], [])).toBe(true)
    })

    it('returns false for module connected to START via chain', () => {
      const start = mod({ id: 's1', isPlay: true })
      const t1 = mod({ id: 't1' })
      const links: Link[] = [{ id: 'l1', from: 's1', to: 't1', type: 'tasks' }]
      expect(isOrphan('t1', [start, t1], links)).toBe(false)
    })

    it('returns true for module linked to another orphan', () => {
      const t1 = mod({ id: 't1' })
      const t2 = mod({ id: 't2' })
      const links: Link[] = [{ id: 'l1', from: 't1', to: 't2', type: 'normal' }]
      expect(isOrphan('t2', [t1, t2], links)).toBe(true)
    })
  })

  describe('getBlockTheme', () => {
    it('returns grey for orphan blocks', () => {
      const block = mod({ id: 'b1', isBlock: true })
      const theme = getBlockTheme('b1', [block], [])
      expect(theme.borderColor).toBe('#757575')
    })

    it('returns orange for rescue-linked blocks', () => {
      const start = mod({ id: 's1', isPlay: true })
      const block = mod({ id: 'b1', isBlock: true })
      const links: Link[] = [{ id: 'l1', from: 's1', to: 'b1', type: 'rescue' }]
      const theme = getBlockTheme('b1', [start, block], links)
      expect(theme.borderColor).toBe('#ff9800')
    })
  })

  describe('getTaskTheme', () => {
    it('returns grey for orphans', () => {
      const t = mod({ id: 't1' })
      expect(getTaskTheme('t1', [t], []).numberBgColor).toBe('#757575')
    })

    it('returns blue for connected tasks', () => {
      const s = mod({ id: 's1', isPlay: true })
      const t = mod({ id: 't1' })
      const links: Link[] = [{ id: 'l1', from: 's1', to: 't1', type: 'tasks' }]
      expect(getTaskTheme('t1', [s, t], links).numberBgColor).toBe('#1976d2')
    })
  })

  describe('getLinkStyle', () => {
    it('returns distinct styles for different types', () => {
      expect(getLinkStyle('rescue').stroke).toBe('#ff9800')
      expect(getLinkStyle('always').stroke).toBe('#4caf50')
      expect(getLinkStyle('tasks').stroke).toBe('#1976d2')
      expect(getLinkStyle('handlers').stroke).toBe('#f57c00')
    })
  })

  // ==========================================
  // Link helpers
  // ==========================================
  describe('getLinkTypeFromSource', () => {
    it('detects block mini-START section', () => {
      expect(getLinkTypeFromSource('block1-normal-start', [])).toBe('normal')
      expect(getLinkTypeFromSource('block1-rescue-start', [])).toBe('rescue')
      expect(getLinkTypeFromSource('block1-always-start', [])).toBe('always')
    })

    it('detects play section from module', () => {
      const m = mod({ id: 't1', parentSection: 'pre_tasks' })
      expect(getLinkTypeFromSource('t1', [m])).toBe('pre_tasks')
    })

    it('detects block section from module with parentId', () => {
      const m = mod({ id: 't1', parentId: 'b1', parentSection: 'rescue' })
      expect(getLinkTypeFromSource('t1', [m])).toBe('rescue')
    })

    it('defaults to normal', () => {
      expect(getLinkTypeFromSource('unknown', [])).toBe('normal')
    })
  })

  describe('getStartChainCount', () => {
    it('returns 0 for isolated start', () => {
      expect(getStartChainCount('s1', [])).toBe(0)
    })

    it('counts tasks in a linear chain', () => {
      const links: Link[] = [
        { id: 'l1', from: 's1', to: 't1', type: 'tasks' },
        { id: 'l2', from: 't1', to: 't2', type: 'tasks' },
        { id: 'l3', from: 't2', to: 't3', type: 'tasks' },
      ]
      expect(getStartChainCount('s1', links)).toBe(3)
    })

    it('handles cycles without infinite loop', () => {
      const links: Link[] = [
        { id: 'l1', from: 's1', to: 't1', type: 'tasks' },
        { id: 'l2', from: 't1', to: 's1', type: 'tasks' },
      ]
      expect(getStartChainCount('s1', links)).toBe(1)
    })
  })

  // ==========================================
  // Module or virtual
  // ==========================================
  describe('getModuleOrVirtual', () => {
    it('returns existing module', () => {
      const m = mod({ id: 't1' })
      expect(getModuleOrVirtual('t1', [m])).toBe(m)
    })

    it('creates virtual for mini-START', () => {
      const parent = mod({ id: 'block1', isBlock: true })
      const result = getModuleOrVirtual('block1-normal-start', [parent])
      expect(result).toBeDefined()
      expect(result!.collection).toBe('virtual')
      expect(result!.parentId).toBe('block1')
      expect(result!.parentSection).toBe('normal')
    })

    it('returns undefined for non-existent non-start id', () => {
      expect(getModuleOrVirtual('nonexistent', [])).toBeUndefined()
    })
  })
})
