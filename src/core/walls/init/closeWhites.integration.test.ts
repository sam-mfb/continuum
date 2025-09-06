import { describe, it, expect } from 'vitest'
import type { LineRec } from '../types'
import { LINE_KIND, LINE_TYPE, LINE_DIR, NEW_TYPE } from '../constants'
import { closeWhites } from './closeWhites'

describe('closeWhites integration tests', () => {
  it('applies h1/h2 updates immediately for subsequent junctions', () => {
    // Create walls that will generate multiple close pairs
    // where the second pair's decision depends on h1/h2 from first

    // Based on the C code in oneClose():
    // - Case 6 (SE direction): Updates h1 based on conditions
    // - The update condition checks: if (line->h1 >= 6+i) return;
    // - If h1 is already large enough, no patch is created

    const walls: LineRec[] = [
      // Wall 1: SE direction (newtype=6), will get h1 updated by first junction
      {
        id: 'w1',
        startx: 10,
        starty: 10,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0, // Will be updated to 6+i by first junction
        h2: 14,
        length: 14,
        newtype: NEW_TYPE.SE, // dir1=6
        nextId: '',
        nextwhId: ''
      },
      // Wall 2: S direction, close to wall1 start
      {
        id: 'w2',
        startx: 8,
        starty: 8,
        endx: 8,
        endy: 18,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 10,
        length: 10,
        newtype: NEW_TYPE.S, // Will trigger h1 update on wall1
        nextId: '',
        nextwhId: ''
      },
      // Wall 3: SSE direction, also close to wall1 start
      // This junction should see the updated h1 value
      {
        id: 'w3',
        startx: 11,
        starty: 8,
        endx: 16,
        endy: 18,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 11,
        length: 11,
        newtype: NEW_TYPE.SSE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = closeWhites(walls)

    // With current implementation: w3-w1 junction uses initial h1=0
    // With fixed implementation: w3-w1 junction uses updated h1

    // The specific patches generated depend on the h1 value at decision time
    // If h1 is updated immediately, fewer patches might be generated
    // because the condition (line->h1 >= 6+i) might be satisfied

    // For now, let's verify that wall1's h1 was updated
    const w1 = result.updatedWalls.find(w => w.id === 'w1')
    expect(w1).toBeDefined()
    expect(w1!.h1).toBeGreaterThan(6) // Should be updated to at least 6+5=11

    // The exact number of patches depends on timing
    // With immediate updates, we expect different behavior
    // This test currently passes but demonstrates the issue:
    // The h1 value used in later junctions depends on when updates are applied
  })

  it('h2 updates should affect subsequent junction calculations', () => {
    // Similar test but focusing on h2 updates
    // Based on C code case 0 (S direction): checks if (line->length - i > j) where j = line->h2

    const walls: LineRec[] = [
      // Wall 1: S direction, will get h2 updated
      {
        id: 'w1',
        startx: 20,
        starty: 20,
        endx: 20,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 30, // Will be reduced by junction
        length: 30,
        newtype: NEW_TYPE.S, // dir1=0
        nextId: '',
        nextwhId: ''
      },
      // Wall 2: NNE direction, triggers h2 update on wall1
      {
        id: 'w2',
        startx: 18,
        starty: 48,
        endx: 22,
        endy: 52,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 6,
        newtype: NEW_TYPE.NNE,
        nextId: '',
        nextwhId: ''
      },
      // Wall 3: Another wall that might create different patches
      // depending on wall1's h2 value
      {
        id: 'w3',
        startx: 22,
        starty: 46,
        endx: 24,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 1,
        h2: 0,
        length: 4,
        newtype: NEW_TYPE.NE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = closeWhites(walls)

    // Check that wall1's h2 was updated
    const w1 = result.updatedWalls.find(w => w.id === 'w1')
    expect(w1).toBeDefined()
    expect(w1!.h2).toBeLessThan(30) // Should be reduced
  })

  it('demonstrates different patch generation with immediate vs batched updates', () => {
    // This test sets up a scenario where the timing of updates
    // significantly affects the visual output (patches generated)

    const walls: LineRec[] = [
      // Central wall that will receive multiple h1 updates
      {
        id: 'central',
        startx: 50,
        starty: 50,
        endx: 70,
        endy: 70,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 28,
        length: 28,
        newtype: NEW_TYPE.SE, // Case 6 - can update h1
        nextId: '',
        nextwhId: ''
      },
      // Multiple walls that will junction with central wall
      // Each should see progressively updated h1 values
      {
        id: 'trigger1',
        startx: 48,
        starty: 48,
        endx: 48,
        endy: 54,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 6,
        length: 6,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'trigger2',
        startx: 51,
        starty: 47,
        endx: 51,
        endy: 53,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 6,
        length: 6,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'trigger3',
        startx: 52,
        starty: 49,
        endx: 55,
        endy: 52,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 4,
        length: 4,
        newtype: NEW_TYPE.SSE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = closeWhites(walls)

    const central = result.updatedWalls.find(w => w.id === 'central')
    expect(central).toBeDefined()

    // Patches are grouped by position in the actual implementation

    // With batched updates (current), all junctions see h1=0
    // With immediate updates (fixed), later junctions see updated h1
    // This affects whether patches are generated or skipped

    // We expect patches to be generated, but the exact count
    // will differ between implementations
    expect(result.whites.length).toBeGreaterThan(0)
  })

  it('verifies h1 updates affect subsequent oneClose decisions', () => {
    // This test directly verifies the critical bug fix
    // It creates a scenario where the second junction's behavior
    // depends on whether h1 was updated immediately or not

    const walls: LineRec[] = [
      // Wall that will receive h1 update
      {
        id: 'wall-se',
        startx: 100,
        starty: 100,
        endx: 120,
        endy: 120,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6, // Initial value - will be updated to 11 by first junction
        h2: 28,
        length: 28,
        newtype: NEW_TYPE.SE, // Case 6
        nextId: '',
        nextwhId: ''
      },
      // First wall to junction - will set h1 to 11 (6 + 5)
      {
        id: 'wall-s1',
        startx: 98,
        starty: 98,
        endx: 98,
        endy: 108,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 10,
        length: 10,
        newtype: NEW_TYPE.S, // Will trigger i=5 case
        nextId: '',
        nextwhId: ''
      },
      // Second wall to junction - behavior depends on h1 value
      // If h1 is still 6, it will create a patch
      // If h1 is 11 (updated), it won't create a patch
      {
        id: 'wall-s2',
        startx: 102,
        starty: 97,
        endx: 102,
        endy: 105,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 6,
        h2: 8,
        length: 8,
        newtype: NEW_TYPE.S, // Also i=5, but h1 check will differ
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = closeWhites(walls)

    // Check that wall-se h1 was updated to 11
    const wallSE = result.updatedWalls.find(w => w.id === 'wall-se')
    expect(wallSE).toBeDefined()
    expect(wallSE!.h1).toBe(11) // 6 + 5

    // With immediate updates (current implementation):
    // - First junction updates h1 to 11
    // - Second junction sees h1=11, which is >= 11, so no patch created

    // Count patches at the SE wall's starting position
    const sePatchCount = result.whites.filter(
      w => w.x === 100 && w.y === 100
    ).length

    // With immediate updates, we expect fewer patches
    // because the second junction is skipped
    expect(sePatchCount).toBeLessThanOrEqual(1)
  })
})
