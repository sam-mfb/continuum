import { describe, it, expect } from 'vitest'
import { createAlignmentSystem } from './alignment'

describe('Alignment Mode Switching', () => {
  it('defaults to world-fixed mode', () => {
    const alignmentSystem = createAlignmentSystem()
    expect(alignmentSystem.getMode()).toBe('world-fixed')
  })

  it('allows switching to screen-fixed mode', () => {
    const alignmentSystem = createAlignmentSystem()
    alignmentSystem.setMode('screen-fixed')
    expect(alignmentSystem.getMode()).toBe('screen-fixed')
  })

  it('allows switching back to world-fixed mode', () => {
    const alignmentSystem = createAlignmentSystem()
    alignmentSystem.setMode('screen-fixed')
    alignmentSystem.setMode('world-fixed')
    expect(alignmentSystem.getMode()).toBe('world-fixed')
  })

  describe('GlobalPosition alignment calculations', () => {
    it('uses world coordinates in world-fixed mode', () => {
      const alignmentSystem = createAlignmentSystem()
      alignmentSystem.setMode('world-fixed')

      const pos = { x: 100, y: 101, screenX: 50, screenY: 51 }
      // (100 + 101) & 1 = 201 & 1 = 1
      expect(alignmentSystem.getAlignment(pos)).toBe(1)

      const pos2 = { x: 100, y: 100, screenX: 50, screenY: 51 }
      // (100 + 100) & 1 = 200 & 1 = 0
      expect(alignmentSystem.getAlignment(pos2)).toBe(0)
    })

    it('uses screen coordinates in screen-fixed mode', () => {
      const alignmentSystem = createAlignmentSystem()
      alignmentSystem.setMode('screen-fixed')

      const pos = { x: 100, y: 101, screenX: 50, screenY: 51 }
      // Screen position = world - viewport = (100-50) + (101-51) = 50 + 50 = 100
      // 100 & 1 = 0
      expect(alignmentSystem.getAlignment(pos)).toBe(0)

      const pos2 = { x: 100, y: 101, screenX: 50, screenY: 50 }
      // Screen position = world - viewport = (100-50) + (101-50) = 50 + 51 = 101
      // 101 & 1 = 1
      expect(alignmentSystem.getAlignment(pos2)).toBe(1)
    })

    it('ignores world coordinates in screen-fixed mode', () => {
      const alignmentSystem = createAlignmentSystem()
      alignmentSystem.setMode('screen-fixed')

      // Different world coordinates, same screen coordinates
      const pos1 = { x: 0, y: 0, screenX: 10, screenY: 11 }
      const pos2 = { x: 999, y: 999, screenX: 10, screenY: 11 }

      // Both should have same alignment since screen coords are same
      expect(alignmentSystem.getAlignment(pos1)).toBe(
        alignmentSystem.getAlignment(pos2)
      )
      expect(alignmentSystem.getAlignment(pos1)).toBe(1) // (10 + 11) & 1 = 1
    })

    it('ignores screen coordinates in world-fixed mode', () => {
      const alignmentSystem = createAlignmentSystem()
      alignmentSystem.setMode('world-fixed')

      // Same world coordinates, different screen coordinates
      const pos1 = { x: 100, y: 101, screenX: 0, screenY: 0 }
      const pos2 = { x: 100, y: 101, screenX: 999, screenY: 999 }

      // Both should have same alignment since world coords are same
      expect(alignmentSystem.getAlignment(pos1)).toBe(
        alignmentSystem.getAlignment(pos2)
      )
      expect(alignmentSystem.getAlignment(pos1)).toBe(1) // (100 + 101) & 1 = 1
    })
  })

  describe('ScreenRelativePosition alignment (walls)', () => {
    it('always uses combined screen+object calculation regardless of mode', () => {
      const alignmentSystem = createAlignmentSystem()

      // Wall rendering should be the same in both modes
      const wallPos = { screenX: 10, screenY: 20, objectX: 5, objectY: 7 }

      alignmentSystem.setMode('world-fixed')
      const worldFixedAlign = alignmentSystem.getAlignment(wallPos)

      alignmentSystem.setMode('screen-fixed')
      const screenFixedAlign = alignmentSystem.getAlignment(wallPos)

      // Should be the same in both modes
      expect(worldFixedAlign).toBe(screenFixedAlign)
      // (10 + 20 + 5 + 7) & 1 = 42 & 1 = 0
      expect(worldFixedAlign).toBe(0)
    })
  })

  describe('Independent alignment system instances', () => {
    it('each instance maintains its own state', () => {
      const system1 = createAlignmentSystem()
      const system2 = createAlignmentSystem()

      system1.setMode('screen-fixed')
      system2.setMode('world-fixed')

      expect(system1.getMode()).toBe('screen-fixed')
      expect(system2.getMode()).toBe('world-fixed')

      // Test that they calculate differently
      // Use a position where screen-fixed and world-fixed give different results
      const pos = { x: 51, y: 50, screenX: 50, screenY: 51 }
      // screen-fixed: screen pos = (51-50) + (50-51) = 1 + (-1) = 0, 0 & 1 = 0
      expect(system1.getAlignment(pos)).toBe(0)
      // world-fixed: (51 + 50) & 1 = 101 & 1 = 1
      expect(system2.getAlignment(pos)).toBe(1)
    })
  })
})
