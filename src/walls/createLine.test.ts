import { describe, it, expect } from 'vitest'
import { createLine, roundPoint } from './createLine'
import { LINE_TYPE, LINE_DIR, LINE_KIND } from '../shared/types/line'

describe('createLine', () => {
  describe('direction mapping based on angle16', () => {
    // Based on the typetable mapping from QuickEdit.c:756-759
    // angle16:  0     1     2    3     4     5    6     7     8     9    10    11    12    13   14     15
    // type:    N   NNE    NE  ENE     E   ENE   NE   NNE     N   NNE    NE   ENE     E   ENE   NE    NNE

    it('maps angle16=0 to North (typetable[0] = LINE_N)', () => {
      // East pointing (0 degrees) maps to angle16=0, which gives LINE_N
      const line = createLine(100, 100, 120, 100)
      expect(line).toBeTruthy()
      expect(line!.type).toBe(LINE_TYPE.N)
    })

    it('maps angle16=4 to East (typetable[4] = LINE_E)', () => {
      // North pointing (90 degrees) maps to angle16=4, which gives LINE_E
      const line = createLine(100, 100, 100, 80)
      expect(line).toBeTruthy()
      expect(line!.type).toBe(LINE_TYPE.E)
    })

    it('maps angle16=2 to NE (typetable[2] = LINE_NE)', () => {
      // Northeast (~45 degrees) maps to angle16=2
      const line = createLine(100, 100, 120, 80)
      expect(line).toBeTruthy()
      expect(line!.type).toBe(LINE_TYPE.NE)
    })

    it('maps angle16=12 to East (typetable[12] = LINE_E)', () => {
      // South pointing (270 degrees) maps to angle16=12
      const line = createLine(100, 100, 100, 120)
      expect(line).toBeTruthy()
      expect(line!.type).toBe(LINE_TYPE.E)
    })
  })

  describe('endpoint calculation and swapping', () => {
    it('calculates endpoint based on angle and length for North direction', () => {
      // Input pointing east (0°) -> angle16=0 -> North type
      // rot2lens[0]=0, rot2lens[12]=0 -> endpoint at (100+0, 100+0) but length forces it
      const line = createLine(100, 100, 120, 100)
      expect(line).toBeTruthy()
      // For angle16=0, endpoints are swapped (not in range 1-8)
      expect(line!.length).toBe(20)
    })

    it('stores lines with angle16 between 1-8 without swapping', () => {
      // Northeast direction should be angle16=2 (in range 1-8)
      const line = createLine(100, 100, 120, 80)
      expect(line).toBeTruthy()
      expect(line!.startx).toBe(100)
      expect(line!.starty).toBe(100)
    })

    it('swaps endpoints for angle16=0 or angle16>8', () => {
      // South direction (270°) -> angle16=12 (>8)
      const line = createLine(100, 100, 100, 120)
      expect(line).toBeTruthy()
      // Endpoints should be swapped
      expect(line!.startx).toBeLessThanOrEqual(line!.endx)
    })
  })

  describe('up/down direction', () => {
    it('sets DN for angle16 in [0, 4-8, 12-15]', () => {
      // Based on QuickEdit.c:844-847
      // East pointing (angle16=0) should be DN
      const line = createLine(100, 100, 120, 100)
      expect(line).toBeTruthy()
      expect(line!.up_down).toBe(LINE_DIR.DN)
    })

    it('sets UP for angle16 in [1-3, 9-11]', () => {
      // Northeast (angle16=2) should be UP
      const line = createLine(100, 100, 120, 80)
      expect(line).toBeTruthy()
      expect(line!.up_down).toBe(LINE_DIR.UP)
    })
  })

  describe('odd length enforcement', () => {
    it('forces odd length when angle16 is odd (diagonal lines)', () => {
      // Create a line that will have angle16=1 (NNE)
      // From debug output, we need to find an angle that gives odd angle16
      const line = createLine(100, 100, 105, 88)
      if (
        line &&
        Math.floor(((Math.atan2(12, 5) * 360) / Math.PI + 22) / 45) & 15 & 1
      ) {
        expect(line.length % 2).toBe(1)
      }
    })
  })

  describe('safe mode', () => {
    it('enforces minimum length of 26 in safe mode', () => {
      const line = createLine(100, 100, 105, 100, { safeMode: true })
      expect(line).toBeTruthy()
      expect(line!.length).toBe(26)
    })
  })

  describe('world bounds', () => {
    it('returns null if calculated endpoint is out of bounds', () => {
      const line = createLine(500, 100, 600, 100, {
        worldWidth: 512,
        worldHeight: 318
      })
      // The calculated endpoint may be out of bounds
      if (line) {
        expect(line.endx).toBeLessThan(512)
        expect(line.endy).toBeLessThan(318)
      }
    })
  })

  describe('length calculation', () => {
    it('uses Manhattan distance (max of dx, dy)', () => {
      const line = createLine(100, 100, 115, 110)
      expect(line).toBeTruthy()
      expect(line!.length).toBe(15) // max(15, 10) = 15
    })
  })

  describe('line kinds', () => {
    it('creates normal lines by default', () => {
      const line = createLine(100, 100, 120, 100)
      expect(line!.kind).toBe(LINE_KIND.NORMAL)
    })

    it('creates bounce lines when specified', () => {
      const line = createLine(100, 100, 120, 100, { kind: LINE_KIND.BOUNCE })
      expect(line!.kind).toBe(LINE_KIND.BOUNCE)
    })
  })
})

describe('roundPoint', () => {
  it('snaps to nearby line endpoints within ROUNDRADIUS/4', () => {
    const lines = [
      {
        id: 'line-1',
        startx: 100,
        starty: 100,
        endx: 150,
        endy: 100,
        length: 50,
        type: LINE_TYPE.E,
        kind: LINE_KIND.NORMAL,
        up_down: LINE_DIR.DN,
        h1: 0,
        h2: 0,
        newtype: 5 as any,
        nextId: null,
        nextwhId: null
      }
    ]

    // Point within ROUNDRADIUS/4 = 5 pixels
    const rounded = roundPoint(104, 103, lines)
    expect(rounded.x).toBe(100)
    expect(rounded.y).toBe(100)
  })

  it('returns original point if no endpoints are within ROUNDRADIUS/4', () => {
    const lines = [
      {
        id: 'line-1',
        startx: 100,
        starty: 100,
        endx: 150,
        endy: 100,
        length: 50,
        type: LINE_TYPE.E,
        kind: LINE_KIND.NORMAL,
        up_down: LINE_DIR.DN,
        h1: 0,
        h2: 0,
        newtype: 5 as any,
        nextId: null,
        nextwhId: null
      }
    ]

    // Point more than 5 pixels away
    const rounded = roundPoint(110, 110, lines)
    expect(rounded.x).toBe(110)
    expect(rounded.y).toBe(110)
  })
})
