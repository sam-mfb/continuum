import { describe, it, expect } from 'vitest'
import { prepareLine, prepareLines } from './prepareLine'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from '../shared/types/line'
import type { LineRec } from '../shared/types/line'

describe('prepareLine', () => {
  describe('endpoint calculation', () => {
    it('calculates endpoints for North lines', () => {
      const line: LineRec = {
        id: 'test-1',
        startx: 100,
        starty: 100,
        endx: 0, // Will be calculated
        endy: 0, // Will be calculated
        length: 20,
        type: LINE_TYPE.N,
        up_down: LINE_DIR.DN,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S, // Will be recalculated
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // N type: xlength[1]=0, ylength[1]=2
      // endx = 100 + (0 * 20) >> 1 = 100
      // endy = 100 + 1 * (2 * 20) >> 1 = 100 + 20 = 120
      expect(prepared.endx).toBe(100)
      expect(prepared.endy).toBe(120)
    })
    
    it('calculates endpoints for East lines', () => {
      const line: LineRec = {
        id: 'test-2',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 30,
        type: LINE_TYPE.E,
        up_down: LINE_DIR.DN,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.E,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // E type: xlength[5]=2, ylength[5]=0
      // endx = 100 + (2 * 30) >> 1 = 100 + 30 = 130
      // endy = 100 + 1 * (0 * 30) >> 1 = 100
      expect(prepared.endx).toBe(130)
      expect(prepared.endy).toBe(100)
    })
    
    it('calculates endpoints for diagonal NE lines', () => {
      const line: LineRec = {
        id: 'test-3',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 20,
        type: LINE_TYPE.NE,
        up_down: LINE_DIR.UP,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NE,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // NE type: xlength[3]=2, ylength[3]=2
      // endx = 100 + (2 * 20) >> 1 = 100 + 20 = 120
      // endy = 100 + (-1) * (2 * 20) >> 1 = 100 - 20 = 80
      expect(prepared.endx).toBe(120)
      expect(prepared.endy).toBe(80)
    })
  })
  
  describe('odd length enforcement', () => {
    it('forces odd length for NNE lines', () => {
      const line: LineRec = {
        id: 'test-4',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 20, // Even length
        type: LINE_TYPE.NNE,
        up_down: LINE_DIR.DN,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.SSE,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // Should force to odd
      expect(prepared.length).toBe(21)
      expect(prepared.length % 2).toBe(1)
    })
    
    it('forces odd length for ENE lines', () => {
      const line: LineRec = {
        id: 'test-5',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 24, // Even length
        type: LINE_TYPE.ENE,
        up_down: LINE_DIR.UP,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.ENE,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // Should force to odd
      expect(prepared.length).toBe(25)
      expect(prepared.length % 2).toBe(1)
    })
    
    it('preserves odd length for NNE lines', () => {
      const line: LineRec = {
        id: 'test-6',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 21, // Already odd
        type: LINE_TYPE.NNE,
        up_down: LINE_DIR.DN,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.SSE,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // Should stay odd
      expect(prepared.length).toBe(21)
    })
    
    it('allows even length for non-diagonal lines', () => {
      const line: LineRec = {
        id: 'test-7',
        startx: 100,
        starty: 100,
        endx: 0,
        endy: 0,
        length: 20, // Even length
        type: LINE_TYPE.E,
        up_down: LINE_DIR.DN,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.E,
        nextId: null,
        nextwhId: null
      }
      
      const prepared = prepareLine(line)
      
      // Should stay even
      expect(prepared.length).toBe(20)
    })
  })
  
  describe('newtype calculation', () => {
    it('calculates newtype for down-facing lines', () => {
      const testCases = [
        { type: LINE_TYPE.N, up_down: LINE_DIR.DN, expected: NEW_TYPE.S },
        { type: LINE_TYPE.NNE, up_down: LINE_DIR.DN, expected: NEW_TYPE.SSE },
        { type: LINE_TYPE.NE, up_down: LINE_DIR.DN, expected: NEW_TYPE.SE },
        { type: LINE_TYPE.ENE, up_down: LINE_DIR.DN, expected: NEW_TYPE.ESE },
        { type: LINE_TYPE.E, up_down: LINE_DIR.DN, expected: NEW_TYPE.E },
      ]
      
      testCases.forEach(({ type, up_down, expected }) => {
        const line: LineRec = {
          id: 'test',
          startx: 100,
          starty: 100,
          endx: 0,
          endy: 0,
          length: 20,
          type,
          up_down,
          kind: LINE_KIND.NORMAL,
          h1: 0,
          h2: 0,
          newtype: NEW_TYPE.S, // Will be recalculated
          nextId: null,
          nextwhId: null
        }
        
        const prepared = prepareLine(line)
        expect(prepared.newtype).toBe(expected)
      })
    })
    
    it('calculates newtype for up-facing lines', () => {
      const testCases = [
        { type: LINE_TYPE.N, up_down: LINE_DIR.UP, expected: 9 }, // 10 - 1 = 9
        { type: LINE_TYPE.NNE, up_down: LINE_DIR.UP, expected: NEW_TYPE.NNE }, // 10 - 2 = 8
        { type: LINE_TYPE.NE, up_down: LINE_DIR.UP, expected: NEW_TYPE.NE }, // 10 - 3 = 7
        { type: LINE_TYPE.ENE, up_down: LINE_DIR.UP, expected: NEW_TYPE.ENE }, // 10 - 4 = 6
        { type: LINE_TYPE.E, up_down: LINE_DIR.UP, expected: 5 }, // 10 - 5 = 5
      ]
      
      testCases.forEach(({ type, up_down, expected }) => {
        const line: LineRec = {
          id: 'test',
          startx: 100,
          starty: 100,
          endx: 0,
          endy: 0,
          length: 20,
          type,
          up_down,
          kind: LINE_KIND.NORMAL,
          h1: 0,
          h2: 0,
          newtype: NEW_TYPE.S,
          nextId: null,
          nextwhId: null
        }
        
        const prepared = prepareLine(line)
        expect(prepared.newtype).toBe(expected)
      })
    })
  })
  
  describe('prepareLines helper', () => {
    it('prepares multiple lines without mutating originals', () => {
      const lines: LineRec[] = [
        {
          id: 'line-1',
          startx: 100,
          starty: 100,
          endx: 0,
          endy: 0,
          length: 20,
          type: LINE_TYPE.NNE,
          up_down: LINE_DIR.DN,
          kind: LINE_KIND.NORMAL,
          h1: 0,
          h2: 0,
          newtype: NEW_TYPE.SSE,
          nextId: null,
          nextwhId: null
        },
        {
          id: 'line-2',
          startx: 200,
          starty: 200,
          endx: 0,
          endy: 0,
          length: 30,
          type: LINE_TYPE.E,
          up_down: LINE_DIR.DN,
          kind: LINE_KIND.NORMAL,
          h1: 0,
          h2: 0,
          newtype: NEW_TYPE.E,
          nextId: null,
          nextwhId: null
        }
      ]
      
      const originalLines = JSON.parse(JSON.stringify(lines))
      const prepared = prepareLines(lines)
      
      // Check that originals weren't mutated
      expect(lines[0]!.endx).toBe(0)
      expect(lines[0]!.length).toBe(20)
      
      // Check that prepared lines have correct values
      expect(prepared[0]!.length).toBe(21) // NNE forced to odd
      expect(prepared[0]!.endx).toBeGreaterThan(0)
      expect(prepared[1]!.endx).toBe(230) // 200 + 30
      
      // Verify originals unchanged
      expect(lines).toEqual(originalLines)
    })
  })
})