# Plan to Fix h1/h2 Update Timing in closeWhites

## Overview
Fix the critical issue where h1/h2 updates are applied after all wall pairs are processed, instead of immediately after each oneClose call. This causes later junctions to use stale h1/h2 values, resulting in different visual patches compared to the original C implementation.

## Step 1: Update Signatures and Call Sites (No Behavior Change)

### 1.1 Update processCloseWalls signature
```typescript
// OLD:
export function processCloseWalls(
  wallPairs: Array<[LineRec, LineRec, number, number]>,
  oneCloseFn: (...)
): {
  patches: WhiteRec[]
  wallUpdates: Array<{ wallId: string; h1?: number; h2?: number }>
}

// NEW:
export function processCloseWalls(
  walls: LineRec[],
  wallPairs: Array<[LineRec, LineRec, number, number]>,
  oneCloseFn: (...)
): {
  patches: WhiteRec[]
  finalWalls: LineRec[]
}
```

### 1.2 Move updateWallOptimization logic into processCloseWalls
- Copy the logic from `updateWallOptimization` into the end of `processCloseWalls`
- Instead of returning `wallUpdates`, apply them and return `finalWalls`
- Keep the same timing (all updates at the end) to maintain current behavior

### 1.3 Update closeWhites to use new signature
```typescript
export function closeWhites(walls: LineRec[]): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
} {
  const wallsWithInitialOpt = setInitialOptimization(walls)
  const wallPairs = findCloseWallPairs(wallsWithInitialOpt)
  const { patches, finalWalls } = processCloseWalls(wallsWithInitialOpt, wallPairs, oneClose)
  
  return {
    whites: patches,
    updatedWalls: finalWalls
  }
}
```

### 1.4 Remove updateWallOptimization function
- Delete the function entirely
- Remove any imports

## Step 2: Update Existing Tests

### 2.1 Update processCloseWalls test cases
- Add walls parameter to all test calls
- Change assertions from checking `wallUpdates` to checking `finalWalls`
- Tests should still pass because behavior hasn't changed yet

### 2.2 Remove updateWallOptimization tests
- Delete all test cases for the removed function

## Step 3: Write Integration Tests to Expose the Problem

### 3.1 Create new test file: `closeWhites.integration.test.ts`

### 3.2 Test case: "h1/h2 updates should affect subsequent junction calculations"
```typescript
it('applies h1/h2 updates immediately for subsequent junctions', () => {
  // Create walls that will generate multiple close pairs
  // where the second pair's decision depends on h1/h2 from first
  const walls: LineRec[] = [
    // Wall 1: Will get h1 updated by first junction
    {
      id: 'w1',
      newtype: NEW_TYPE.SE,  // dir1=6 at start
      h1: 0,  // Will be updated to 6+i
      // ... other properties
    },
    // Wall 2: Pairs with Wall 1
    {
      id: 'w2',
      newtype: NEW_TYPE.SSE,  // Creates a case that updates w1.h1
      // ... other properties
    },
    // Wall 3: Also pairs with Wall 1, decision depends on w1.h1
    {
      id: 'w3',
      newtype: NEW_TYPE.S,  // Creates a case that checks w1.h1
      // ... other properties  
    }
  ]
  
  const result = closeWhites(walls)
  
  // With current implementation: w3-w1 junction uses initial h1=0
  // With fixed implementation: w3-w1 junction uses updated h1
  // This should result in different patches
  
  // Assert on the number or properties of patches generated
  expect(result.whites.length).toBe(expectedCount)
})
```

### 3.3 Test case: "h2 updates should affect subsequent junction calculations"
- Similar structure but focusing on h2 updates affecting later decisions

### 3.4 Run tests and confirm they fail
- Document the expected vs actual behavior

## Step 4: Implement the Fix

### 4.1 Create helper function to apply updates immediately
```typescript
function applyWallUpdates(
  walls: LineRec[],
  updates: Array<{ wallId: string; h1?: number; h2?: number }>
): LineRec[] {
  const wallMap = new Map(walls.map(w => [w.id, { ...w }]))
  
  for (const update of updates) {
    const wall = wallMap.get(update.wallId)
    if (wall) {
      if (update.h1 !== undefined) wall.h1 = update.h1
      if (update.h2 !== undefined) wall.h2 = update.h2
    }
  }
  
  return Array.from(wallMap.values())
}
```

### 4.2 Modify processCloseWalls to apply updates immediately
```typescript
export function processCloseWalls(
  walls: LineRec[],
  wallPairs: Array<[LineRec, LineRec, number, number]>,
  oneCloseFn: (...)
): {
  patches: WhiteRec[]
  finalWalls: LineRec[]
} {
  let currentWalls = walls
  let patches: WhiteRec[] = []

  for (const [wall1, wall2, endpoint1, endpoint2] of wallPairs) {
    // Get current versions with any previous updates
    const currentWall1 = currentWalls.find(w => w.id === wall1.id) || wall1
    const currentWall2 = currentWalls.find(w => w.id === wall2.id) || wall2
    
    const result = oneCloseFn(currentWall1, currentWall2, endpoint1, endpoint2, patches)
    patches = result.newWhites
    
    // Apply updates immediately after each oneClose
    const updates: Array<{ wallId: string; h1?: number; h2?: number }> = []
    if (Object.keys(result.wall1Updates).length > 0) {
      updates.push({ wallId: wall1.id, ...result.wall1Updates })
    }
    if (Object.keys(result.wall2Updates).length > 0) {
      updates.push({ wallId: wall2.id, ...result.wall2Updates })
    }
    
    if (updates.length > 0) {
      currentWalls = applyWallUpdates(currentWalls, updates)
    }
  }

  return { patches, finalWalls: currentWalls }
}
```

## Step 5: Verify the Fix

### 5.1 Run integration tests
- Confirm they now pass
- Document the behavior change

### 5.2 Run existing unit tests
- Ensure no regressions
- Update any tests that were implicitly relying on the old behavior

### 5.3 Visual verification (if possible)
- Compare junction patches in a test level
- Look for visual differences at complex wall intersections

## Notes

- The key insight is that `wallPairs` contains references to the original walls, but we need to look up the current version with updates
- This maintains immutability while achieving the immediate update behavior of the C code
- The fix should only affect scenarios where multiple wall pairs share a wall and later pairs make decisions based on h1/h2 values