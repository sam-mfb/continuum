# Update getAlignment Function Signature Plan

## Overview

Update `getAlignment` to always require screen position data, and update all call sites to provide it. This sets up the infrastructure for future alignment mode switching without actually changing the alignment behavior yet.

## Phase A: Pre-compute Two Junction Alternatives

### 1. Update WhiteRec Type
```typescript
// src/walls/types.ts
export type WhiteRec = {
  id: string
  x: number
  y: number
  hasj: boolean
  ht: number
  data: number[]  // Original data - used for non-junction whites
  // New fields for junction alternatives:
  dataAlign0?: number[]  // Junction data when alignment = 0
  dataAlign1?: number[]  // Junction data when alignment = 1
}
```

### 2. Modify whiteHashMerge to Generate Both Versions
```typescript
// src/walls/init/whiteHashMerge.ts
if (junctionIndex !== -1) {
  // No getAlignment call needed since we're pre-computing both versions!
  
  // Generate version for alignment 0
  const back0 = getBackgroundPattern(0 as Alignment)
  const dataAlign0 = applyHashPattern(wh.data, back0, hashFigure)
  
  // Generate version for alignment 1  
  const back1 = getBackgroundPattern(1 as Alignment)
  const dataAlign1 = applyHashPattern(wh.data, back1, hashFigure)
  
  // Store both versions
  result[whIndex] = {
    ...wh,
    hasj: true,
    dataAlign0: dataAlign0,
    dataAlign1: dataAlign1,
    data: wh.data  // Keep original data (won't be used, but preserved for clarity)
  }
}
```

## Phase B: Update getAlignment Function Signature

### 1. Update Types and Function
```typescript
// src/shared/alignment.ts

// Update GlobalPosition to require screen coordinates
type GlobalPosition = {
  x: number       // world x
  y: number       // world y
  screenX: number // viewport x offset  
  screenY: number // viewport y offset
}

// ScreenRelativePosition stays the same
type ScreenRelativePosition = {
  screenX: number
  screenY: number
  objectX: number  
  objectY: number
}

// Update function implementation
export function getAlignment(pos: GlobalPosition): Alignment
export function getAlignment(pos: ScreenRelativePosition): Alignment
export function getAlignment(
  pos: GlobalPosition | ScreenRelativePosition
): Alignment {
  if ('objectX' in pos) {
    // Screen-relative position (for walls) - unchanged
    return ((pos.screenX + pos.screenY + pos.objectX + pos.objectY) & 1) as Alignment
  } else {
    // Global position - now has screen info available for future use
    // For now, still use world-fixed calculation
    return ((pos.x + pos.y) & 1) as Alignment
  }
}
```

## Phase C: Update All Call Sites

### 1. Bunker Rendering
```typescript
// src/planet/render/bunker.ts
// Change from:
const align = getAlignment({ x: bp.x + xcenter, y: bp.y + ycenter })

// To:
const align = getAlignment({ 
  x: bp.x + xcenter, 
  y: bp.y + ycenter,
  screenX: scrnx,
  screenY: scrny
})
```

### 2. Fuel Rendering  
```typescript
// src/planet/render/drawFuels.ts
// Change from:
const align = getAlignment({ x: fp.x, y: fp.y })

// To:
const align = getAlignment({ 
  x: fp.x, 
  y: fp.y,
  screenX: scrnx,
  screenY: scrny  
})
```

### 3. Crater Rendering
```typescript
// src/planet/render/drawCraters.ts
// Change from (2 locations):
const align = getAlignment({ x: crat.x, y: crat.y })

// To:
const align = getAlignment({ 
  x: crat.x, 
  y: crat.y,
  screenX: scrnx,
  screenY: scrny
})
```

### 4. Explosion Rendering
```typescript
// src/explosions/render/drawExplosions.ts
// Change from (2 locations):
const align = getAlignment({ x: shard.x, y: shard.y })

// To:
const align = getAlignment({ 
  x: shard.x, 
  y: shard.y,
  screenX: screenx,  // Note: different variable name here
  screenY: screeny
})
```

### 5. Wall Directional Renderers
```typescript
// These already use ScreenRelativePosition overload, so no changes needed
// Files: sseBlack.ts, eseBlack.ts, neBlack.ts, southBlack.ts, seBlack.ts
// They already call getAlignment with screenX, screenY, objectX, objectY
```

## Phase D: Update Junction Rendering

### 1. Modify fastWhites to Calculate Alignment
```typescript
// src/walls/render/fastWhites.ts
export const fastWhites =
  (deps: {
    whites: readonly WhiteRec[]
    viewport: Viewport  
    worldwidth: number
  }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    // ... existing code ...
    
    if (wh.hasj) {
      // Calculate current alignment for this junction
      const align = getAlignment({
        x: wh.x,
        y: wh.y,
        screenX: viewport.scrx,
        screenY: viewport.scry
      })
      
      // Select appropriate pre-computed data
      const data = align === 0 
        ? (wh.dataAlign0 || wh.data)
        : (wh.dataAlign1 || wh.data)
      
      newScreen = eorWallPiece({
        x: drawX,
        y: drawY,
        height: wh.ht,
        data: new Uint8Array(data)
      })(newScreen)
    } else {
      // Non-junction whites unchanged
      newScreen = whiteWallPiece({
        x: drawX,
        y: drawY,
        height: wh.ht,
        data: new Uint8Array(wh.data)
      })(newScreen)
    }
  }
```

## Implementation Order

1. Update `alignment.ts` with new `GlobalPosition` type requiring screenX/screenY
2. Update `WhiteRec` type to include `dataAlign0` and `dataAlign1`
3. Update `whiteHashMerge` to generate both junction versions (no getAlignment call needed)
4. Update all sprite rendering call sites (bunkers, fuels, craters, explosions) to pass screen coordinates
5. Update `fastWhites` to calculate alignment and select correct junction data
6. Verify everything compiles and runs

## Key Points

- The `getAlignment` function behavior doesn't change yet - still returns `(x + y) & 1` for global positions
- But now it has access to screen coordinates for future mode switching
- `whiteHashMerge` doesn't call `getAlignment` - it directly generates both alignment versions
- Junction decorations will now adapt correctly when alignment mode switching is implemented later
- Wall renderers don't need changes since they already use the `ScreenRelativePosition` overload