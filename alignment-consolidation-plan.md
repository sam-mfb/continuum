# Alignment Consolidation Plan

## Overview

Consolidate all alignment calculations and background pattern selections into shared utility functions to reduce duplication and ensure consistency across the codebase.

## New Shared Utilities

### 1. Core Alignment Function

**Location**: `/src/shared/alignment.ts`

```typescript
export type Alignment = 0 | 1

// For simple world position alignment
type GlobalPosition = {
  x: number
  y: number
}

// For combined screen + object position alignment (used in wall rendering)
type ScreenRelativePosition = {
  screenX: number
  screenY: number
  objectX: number
  objectY: number
}

/**
 * Calculate alignment based on position.
 * Creates a diagonal checkerboard pattern across the game world.
 * 
 * @param pos Either a global position or screen-relative position
 * @returns 0 or 1 for selecting between two background patterns
 */
export function getAlignment(pos: GlobalPosition): Alignment
export function getAlignment(pos: ScreenRelativePosition): Alignment
export function getAlignment(pos: GlobalPosition | ScreenRelativePosition): Alignment {
  if ('screenX' in pos) {
    // Combined alignment for screen-relative rendering
    // This combines screen alignment with object alignment in one calculation
    return ((pos.screenX + pos.screenY + pos.objectX + pos.objectY) & 1) as Alignment
  } else {
    // Simple global position alignment
    return ((pos.x + pos.y) & 1) as Alignment
  }
}
```

### 2. Background Pattern Selection

**Location**: `/src/shared/backgroundPattern.ts`

```typescript
import type { Alignment } from './alignment'

// Re-export from screen constants for convenience
export { BACKGROUND_PATTERNS } from '@/screen/constants'

/**
 * Get the appropriate background pattern for a given alignment.
 * 
 * @param alignment The alignment value (0 or 1)
 * @returns The 32-bit background pattern (0xaaaaaaaa or 0x55555555)
 */
export function getBackgroundPattern(alignment: Alignment): number {
  const [pattern0, pattern1] = BACKGROUND_PATTERNS
  return alignment === 0 ? pattern0 : pattern1
}
```

## Refactoring Targets

### Phase 1: Simple Sprite Rendering

These use straightforward global position calculations:

1. **Bunkers** (`/src/planet/render/bunker.ts`)
   - Before: `const align = (bp.x + bp.y + xcenter + ycenter) & 1`
   - After: `const align = getAlignment({ x: bp.x + xcenter, y: bp.y + ycenter })`

2. **Fuel Cells** (`/src/planet/render/drawFuels.ts`)
   - Before: `const rot = (fp.x + fp.y) & 1`
   - After: `const align = getAlignment({ x: fp.x, y: fp.y })`

3. **Craters** (`/src/planet/render/drawCraters.ts`)
   - Before: `const rot = (crat.x + crat.y) & 1`
   - After: `const align = getAlignment({ x: crat.x, y: crat.y })`

4. **Explosion Shards** (`/src/explosions/render/drawExplosions.ts`)
   - Before: `const align = (shard.x + shard.y) & 1`
   - After: `const align = getAlignment({ x: shard.x, y: shard.y })`

5. **Test Games** (various files in `/src/app/games/`)
   - Update all instances to use `getAlignment({ x, y })`

### Phase 2: Wall Rendering

Wall rendering needs screen-relative alignment:

1. **Remove getBackground function** (`/src/walls/render/getBackground.ts`)
   - This function becomes obsolete with the new approach

2. **Wall Directional Renderers**
   Update each to use the new alignment calculation:
   - `/src/walls/render/directional/sseBlack.ts`
   - `/src/walls/render/directional/eseBlack.ts`
   - `/src/walls/render/directional/neBlack.ts`
   - `/src/walls/render/directional/southBlack.ts`
   - `/src/walls/render/directional/seBlack.ts`

   Current pattern:
   ```typescript
   const background = getBackground(scrx, scry)
   eor1 = (background[(x + y) & 1]! & MASK) ^ VAL
   eor2 = (background[(x + y + 1) & 1]! & MASK) ^ VAL  // Some walls use this
   ```
   
   After refactoring:
   ```typescript
   // For first pattern
   const align1 = getAlignment({ 
     screenX: scrx, 
     screenY: scry, 
     objectX: x, 
     objectY: y 
   })
   const pattern1 = getBackgroundPattern(align1)
   eor1 = (pattern1 & MASK) ^ VAL
   
   // For second pattern (when needed)
   const align2 = getAlignment({ 
     screenX: scrx, 
     screenY: scry, 
     objectX: x, 
     objectY: y + 1  // Note: y+1 for second pattern
   })
   const pattern2 = getBackgroundPattern(align2)
   eor2 = (pattern2 & MASK) ^ VAL
   ```

### Phase 3: Junction Hashing

1. **White Hash Merge** (`/src/walls/init/whiteHashMerge.ts`)
   ```typescript
   import { getAlignment } from '@/shared/alignment'
   import { getBackgroundPattern } from '@/shared/backgroundPattern'
   
   // Before: const back = (wh.x + wh.y) & 1 ? backgr2! : backgr1!
   // After:
   const align = getAlignment({ x: wh.x, y: wh.y })
   const back = getBackgroundPattern(align)
   ```

### Phase 4: Pre-computed Sprite Generation

1. **Shard Sprites** (`/src/figs/shardSprites.ts`)
   ```typescript
   // Before: const rowBg = ((y + align) & 1) === 0 ? BACKGROUND1 : BACKGROUND2
   // After:
   const rowAlign = getAlignment({ x: 0, y: y + align })
   const rowBg = getBackgroundPattern(rowAlign)
   ```

2. **Other sprite generation files that use BACKGROUND1/BACKGROUND2**
   - Update to use `getAlignment()` and `getBackgroundPattern()`
   - Files include: `bunkerSprites.ts`, `fuelSprites.ts`, `craterSprites.ts`

## Migration Strategy

1. **Create shared modules first**
   - Add `/src/shared/alignment.ts`
   - Add `/src/shared/backgroundPattern.ts`
   - Add tests for both

2. **Update in phases**
   - Phase 1: Simple sprite rendering (lowest risk)
   - Phase 2: Wall rendering (medium complexity)
   - Phase 3: Junction hashing (isolated usage)
   - Phase 4: Pre-computed sprites (build-time only)

3. **Testing approach**
   - Unit test the new shared functions
   - Visual regression testing for each phase
   - Ensure checkerboard pattern remains consistent

## Benefits

1. **Single source of truth** for alignment calculation
2. **No more "swapping" logic** - the overloaded `getAlignment` handles screen-relative calculations transparently
3. **Type safety** with `Alignment` type and parameter objects
4. **Clearer intent** - parameter names make it obvious when we're doing screen-relative vs global alignment
5. **Reduced duplication** - no more `(x + y) & 1` scattered everywhere
6. **Consistent naming** - "align" instead of mix of "rot", "align", etc.
7. **Simplified wall rendering** - no need for `getBackground()` returning arrays

## Considerations

1. **Performance**: These functions will be called frequently in hot paths
   - Keep them simple and inline-able
   - Consider using `@inline` comments if TypeScript/bundler supports it

2. **Backwards compatibility**: Ensure the exact same values are produced
   - The alignment calculation must remain `(x + y) & 1`
   - Background pattern selection must maintain the same logic

3. **Type narrowing**: The `Alignment` type ensures only valid values (0 or 1) are used

## Next Steps

1. Review and approve this plan
2. Create the shared utility modules
3. Begin phased migration
4. Update tests as needed
5. Verify visual consistency after each phase