import { describe, it, expect } from 'vitest'
import { createLine } from './createLine'
import { packLine, packLines } from './packLine'
import { unpackLine, unpackLines } from './unpackLine'
import { LINE_TYPE, LINE_KIND } from '../shared/types/line'

describe('Complete line flow: createLine -> packLine -> unpackLine', () => {
  describe('round-trip data integrity', () => {
    it('preserves essential line data through pack/unpack cycle', () => {
      // Create a line
      const created = createLine(100, 100, 150, 100, {
        kind: LINE_KIND.NORMAL
      })
      expect(created).toBeTruthy()

      console.log('Created line:', {
        start: `(${created!.startx}, ${created!.starty})`,
        end: `(${created!.endx}, ${created!.endy})`,
        type: created!.type,
        length: created!.length
      })

      // Pack it (strip calculated fields)
      const packed = packLine(created!)
      console.log('Packed line:', packed)

      // Unpack it (recalculate fields)
      const unpacked = unpackLine(packed, 'test-line-1')
      console.log('Unpacked line:', {
        start: `(${unpacked.startx}, ${unpacked.starty})`,
        end: `(${unpacked.endx}, ${unpacked.endy})`,
        type: unpacked.type,
        length: unpacked.length,
        newtype: unpacked.newtype
      })

      // Verify essential fields match
      expect(unpacked.startx).toBe(created!.startx)
      expect(unpacked.starty).toBe(created!.starty)
      expect(unpacked.type).toBe(created!.type)
      expect(unpacked.kind).toBe(created!.kind)
      expect(unpacked.up_down).toBe(created!.up_down)
    })

    it('handles all 8 primary directions', () => {
      const directions = [
        { name: 'Visual South', x2: 100, y2: 130 },
        { name: 'Visual North', x2: 100, y2: 70 },
        { name: 'Visual East', x2: 130, y2: 100 },
        { name: 'Visual West', x2: 70, y2: 100 },
        { name: 'Visual SE', x2: 125, y2: 125 },
        { name: 'Visual NE', x2: 125, y2: 75 },
        { name: 'Visual SW', x2: 75, y2: 125 },
        { name: 'Visual NW', x2: 75, y2: 75 }
      ]

      directions.forEach(({ name, x2, y2 }) => {
        const created = createLine(100, 100, x2, y2)
        expect(created).toBeTruthy()

        const packed = packLine(created!)
        const unpacked = unpackLine(packed)

        console.log(`${name}:`, {
          createdEnd: `(${created!.endx}, ${created!.endy})`,
          unpackedEnd: `(${unpacked.endx}, ${unpacked.endy})`,
          type: unpacked.type,
          newtype: unpacked.newtype
        })

        // Basic validation
        expect(unpacked.startx).toBe(created!.startx)
        expect(unpacked.starty).toBe(created!.starty)
      })
    })
  })

  describe('odd length enforcement for diagonal lines', () => {
    it('preserves odd lengths for NNE lines through pack/unpack', () => {
      // Create a line that should be NNE
      const created = createLine(100, 100, 110, 85, {
        kind: LINE_KIND.BOUNCE
      })

      const packed = packLine(created!)
      const unpacked = unpackLine(packed)

      console.log('NNE line lengths:', {
        created: created!.length,
        packed: packed.length,
        unpacked: unpacked.length,
        unpackedIsOdd: unpacked.length % 2 === 1
      })

      // Should maintain odd length
      expect(unpacked.length % 2).toBe(1)

      // If created had even length and type is NNE, unpack should force odd
      if (created!.type === LINE_TYPE.NNE && created!.length % 2 === 0) {
        expect(unpacked.length).toBe(created!.length | 1)
      }
    })

    it('preserves odd lengths for ENE lines through pack/unpack', () => {
      // Create a line that should be ENE
      const created = createLine(100, 100, 125, 90, {
        kind: LINE_KIND.NORMAL
      })

      const packed = packLine(created!)
      const unpacked = unpackLine(packed)

      console.log('ENE line lengths:', {
        created: created!.length,
        createdType: created!.type,
        unpacked: unpacked.length,
        unpackedIsOdd: unpacked.length % 2 === 1
      })

      // If it's ENE, should have odd length after unpack
      if (unpacked.type === LINE_TYPE.ENE) {
        expect(unpacked.length % 2).toBe(1)
      }
    })
  })

  describe('endpoint calculation differences', () => {
    it('shows how createLine and unpackLine calculate endpoints differently', () => {
      // Create a horizontal line
      const created = createLine(100, 100, 150, 100)
      expect(created).toBeTruthy()

      const packed = packLine(created!)
      const unpacked = unpackLine(packed)

      console.log('Endpoint calculation comparison:', {
        input: '(100,100) -> (150,100)',
        created: {
          type: created!.type,
          length: created!.length,
          start: `(${created!.startx},${created!.starty})`,
          end: `(${created!.endx},${created!.endy})`
        },
        unpacked: {
          type: unpacked.type,
          length: unpacked.length,
          start: `(${unpacked.startx},${unpacked.starty})`,
          end: `(${unpacked.endx},${unpacked.endy})`,
          newtype: unpacked.newtype
        }
      })

      // The endpoints might differ because:
      // - createLine uses rot2lens table with angle-based calculation
      // - unpackLine uses xlength/ylength tables with type-based calculation
    })
  })

  describe('batch operations', () => {
    it('handles multiple lines with packLines/unpackLines', () => {
      const specs = [
        { x1: 50, y1: 50, x2: 100, y2: 50 },
        { x1: 100, y1: 100, x2: 100, y2: 150 },
        { x1: 150, y1: 150, x2: 200, y2: 200 }
      ]

      // Create multiple lines
      const created = specs
        .map(spec => createLine(spec.x1, spec.y1, spec.x2, spec.y2))
        .filter((line): line is NonNullable<typeof line> => line !== null)

      // Pack them all
      const packed = packLines(created)
      expect(packed).toHaveLength(3)

      // Unpack them all
      const unpacked = unpackLines(packed)
      expect(unpacked).toHaveLength(3)

      // Verify IDs are generated
      expect(unpacked[0]!.id).toBe('line-0')
      expect(unpacked[1]!.id).toBe('line-1')
      expect(unpacked[2]!.id).toBe('line-2')
    })
  })

  describe('data size comparison', () => {
    it('demonstrates space savings from packing', () => {
      const created = createLine(100, 100, 200, 200, {
        kind: LINE_KIND.GHOST
      })!

      const packed = packLine(created)

      // Count fields
      const createdFields = Object.keys(created).length
      const packedFields = Object.keys(packed).length

      console.log('Storage efficiency:', {
        createdFields,
        packedFields,
        savings: `${(((createdFields - packedFields) / createdFields) * 100).toFixed(1)}%`
      })

      expect(packedFields).toBeLessThan(createdFields)
      expect(packed).not.toHaveProperty('endx')
      expect(packed).not.toHaveProperty('endy')
      expect(packed).not.toHaveProperty('newtype')
      expect(packed).not.toHaveProperty('id')
    })
  })
})
