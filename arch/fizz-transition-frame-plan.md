# Frame-Based Fizz Transition Implementation Plan

## Overview

Adapt the fizz transition system to work with Frame-based rendering (renderingNew.ts) while maintaining backward compatibility with the existing bitmap-based renderer.

## Current State

- `FizzTransitionService` works with `MonochromeBitmap` (pixel-based), using LFSR to randomly dissolve pixels
- `renderingNew.ts` uses `Frame` (drawable-based) with z-ordered drawables
- Z-ordering: STATUS (200) is highest, SHIELD (100), SHIP (90)
- Currently, renderingNew.ts initializes fizz service with dummy bitmaps just to advance state machine

## Key Insights

1. Generate starmap as coordinate list → reuse for both Bitmap and Frame via simple converters
2. Ship must be drawn in fizz/starmap as a Frame sprite with special high z-order
3. Fizz pixels need z-order between regular game objects and status bar (170)
4. We don't need the "from" Frame - just progressively overlay "to" pixels

## Implementation Strategy

**Phase 1: Refactor Existing Code (No Breaking Changes)**

- Extract reusable utilities from existing implementations
- Update existing renderers to use new utilities
- Verify everything still works

**Phase 2: Add New Frame-Based Support**

- Add new types and services for Frame-based rendering
- Implement Frame-based fizz transition
- Update renderingNew.ts to use new service

---

## Phase 1: Refactoring (Maintain Existing Functionality)

### Step 1.1: Create Shared Starmap Pixel Generator

**File:** `src/render/transition/starmapPixels.ts` (new)

```typescript
/**
 * Generate random star coordinates for starmap background
 * Extracted from starBackground.ts for reuse by both bitmap and frame renderers
 */
export function generateStarmapPixels(
  starCount: number
): Array<{ x: number; y: number }>
```

**Implementation:**

- Uses `rint(SCRWTH)` and `rint(VIEWHT)` like original
- Returns raw coordinate list
- No bitmap/frame-specific logic

### Step 1.2: Create Starmap-to-Bitmap Converter

**File:** `src/render/transition/starmapToBitmap.ts` (new)

```typescript
/**
 * Convert starmap pixel coordinates to MonochromeBitmap
 * Allows bitmap renderer to use shared pixel generator
 */
export function starmapPixelsToBitmap(
  pixels: Array<{ x: number; y: number }>,
  additionalRender?: (screen: MonochromeBitmap) => MonochromeBitmap
): MonochromeBitmap
```

**Implementation:**

- Takes pixel coordinate list
- Creates bitmap with `setScreen({ color: 0xffffffff })`
- Applies `clearPoint` for each pixel
- Applies optional `additionalRender` (for ship)
- Returns `MonochromeBitmap`

### Step 1.3: Refactor starBackground.ts

**File:** `src/render/transition/starBackground.ts` (update)

**Changes:**

- Import `generateStarmapPixels` and `starmapPixelsToBitmap`
- Update implementation to use new utilities:

```typescript
export function starBackground(deps: {
  starCount: number
  additionalRender?: (screen: MonochromeBitmap) => MonochromeBitmap
}): MonochromeBitmap {
  const pixels = generateStarmapPixels(deps.starCount)
  return starmapPixelsToBitmap(pixels, deps.additionalRender)
}
```

- Maintain exact same API (no breaking changes)

**Testing:** Verify existing bitmap renderer still works correctly

### Step 1.4: Extract LFSR Utilities

**File:** `src/core/transition/lfsrUtils.ts` (new)

Extract reusable LFSR functions from `FizzTransitionService.ts`:

```typescript
/**
 * Advance Linear Feedback Shift Register one step
 * Uses 13-bit LFSR with feedback on bit 13, XOR mask 4287
 */
export function advanceLFSR(currentSeed: number): number

/**
 * Pre-generate complete sequence of pixel indices in LFSR visit order
 * The LFSR visits every number 0-8191 exactly once before repeating
 */
export function generatePixelSequence(
  totalPixels: number,
  initialSeed: number
): number[]

/**
 * Check if a seed position should be skipped
 * Seeds >= 8152 (8192-40) are skipped in original implementation
 */
export function shouldSkipSeed(seed: number): boolean
```

**Implementation Details:**

- Extract `advanceLFSR` logic (lines 122-133 of FizzTransitionService.ts)
- Extract seed validation/skipping logic
- Document the 13-bit LFSR, feedback bit, and XOR mask

### Step 1.5: Refactor FizzTransitionService.ts

**File:** `src/core/transition/FizzTransitionService.ts` (update)

**Changes:**

- Import `advanceLFSR` and helper functions from `lfsrUtils`
- Replace internal LFSR implementation with imported functions
- Keep all existing methods and API unchanged
- Internal refactoring only

**Testing:** Verify existing bitmap renderer fizz transition still works

---

## Phase 2: Add Frame-Based Support

### Step 2.1: Add Pixel Drawable Type

**File:** `src/lib/frame/types.ts` (update)

Add to the `Drawable` union:

```typescript
export type DrawablePixel = DrawableBase & {
  type: 'pixel'
  point: DrawablePoint
  color: DrawableColor
}

type Drawable =
  | DrawableLine
  | DrawableRect
  | DrawableShape
  | DrawableSprite
  | DrawablePixel
```

### Step 2.2: Update Frame Renderer

**File:** `src/lib/frame/drawFrameToCanvas.ts` (update)

Add case to switch statement:

```typescript
case 'pixel':
  drawPixel(drawable, canvas, scale, debug ?? false)
  break
```

Implement `drawPixel`:

```typescript
function drawPixel(
  pixel: DrawablePixel,
  canvas: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
): void {
  canvas.save()
  canvas.globalAlpha = debug ? 0.7 * pixel.alpha : pixel.alpha
  canvas.fillStyle = debug ? 'lime' : pixel.color
  canvas.fillRect(pixel.point.x * scale, pixel.point.y * scale, scale, scale)
  canvas.restore()
}
```

### Step 2.3: Update Z-Order Constants

**File:** `src/render-modern/z.ts` (update)

Add new constants:

```typescript
export const Z = {
  CRATER: 10,
  FUEL: 20,
  SHADOW: 30,
  GHOST_WALL: 40,
  BOUNCE_WALL: 40,
  NORMAL_WALL: 40,
  BUNKER: 50,
  WALL_TOP: 60,
  STRAFE: 67,
  BUNKER_SHOT: 68,
  SHIP_SHOT: 69,
  SHOT: 70,
  SHIP: 90,
  SHARD: 92,
  SPARK: 95,
  SHIELD: 100,
  FIZZ_PIXEL: 170, // NEW: Starmap pixels during fizz transition
  SHIP_FIZZ: 180, // NEW: Ship during fizz/starmap (above everything else)
  STATUS: 200 // Status bar (always highest)
}
```

### Step 2.4: Update drawShip for Fizz Mode

**File:** `src/render-modern/ship.ts` (update)

Add `inFizz` parameter:

```typescript
export function drawShip(deps: {
  x: number
  y: number
  rotation: number
  thrusting: boolean
  inFizz?: boolean // NEW: Use higher z-order during transition
}): (frame: Frame) => Frame
```

Update z-order usage:

```typescript
const shipZ = deps.inFizz ? Z.SHIP_FIZZ : Z.SHIP

// Apply to ship sprite
z: shipZ

// Apply to shadow
z: deps.inFizz ? Z.SHIP_FIZZ : Z.SHADOW

// Apply to flame (if thrusting)
z: shipZ
```

### Step 2.5: Create Frame-Based Fizz Service

**File:** `src/core/transition/FizzTransitionServiceFrame.ts` (new)

```typescript
export type FizzTransitionServiceFrame = {
  /** Initialize with star count and duration */
  initialize(starCount: number, durationFrames: number): void

  /** Get drawables for next frame of progressive reveal */
  getNextFrameDrawables(): DrawablePixel[]

  /** Get all starmap pixels (for 'starmap' phase) */
  getAllStarmapPixels(): DrawablePixel[]

  /** Reset to uninitialized state */
  reset(): void

  /** Whether initialized */
  readonly isInitialized: boolean

  /** Whether all pixels revealed */
  readonly isComplete: boolean

  /** Current progress (0.0 to 1.0) */
  readonly progress: number
}

export function createFizzTransitionServiceFrame(
  seed = 4357
): FizzTransitionServiceFrame
```

**State:**

```typescript
{
  starmapPixels: Array<{x: number, y: number}>,
  pixelRevealSequence: number[],  // indices into starmapPixels
  pixelsRevealed: number,
  pixelsPerFrame: number,
  durationFrames: number,
  initialized: boolean
}
```

**Implementation:**

- `initialize()`:

  - Call `generateStarmapPixels(starCount)`
  - Generate reveal sequence using LFSR utils
  - Calculate `pixelsPerFrame = starmapPixels.length / durationFrames`

- `getNextFrameDrawables()`:

  - Return next batch of pixels as `DrawablePixel[]`
  - Each with `z: Z.FIZZ_PIXEL`, `color: 'white'`, `alpha: 1`
  - Increment `pixelsRevealed`

- `getAllStarmapPixels()`:
  - Return all pixels as `DrawablePixel[]` (for starmap phase)

### Step 2.6: Update renderingNew.ts

**File:** `src/game/gameLoop/renderingNew.ts` (update)

**Add to imports:**

```typescript
import type { FizzTransitionServiceFrame } from '@/core/transition'
import { SCENTER } from '@/core/figs'
```

**Update RenderContextNew:**

```typescript
export type RenderContextNew = {
  frame: Frame
  state: RootState
  spriteService: SpriteService
  fizzTransitionServiceFrame: FizzTransitionServiceFrame // Changed type
}
```

**Replace fizz handling (lines 40-51):**

```typescript
// Handle fizz transition
if (state.transition.status === 'fizz') {
  if (!fizzTransitionServiceFrame.isInitialized) {
    fizzTransitionServiceFrame.initialize(150, FIZZ_DURATION)
  }

  // Get progressive pixel reveal
  const fizzPixels = fizzTransitionServiceFrame.getNextFrameDrawables()
  newFrame.drawables.push(...fizzPixels)

  // Draw ship on top if alive
  if (state.ship.deadCount === 0) {
    newFrame = drawShip({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      rotation: state.ship.shiprot,
      thrusting: false,
      inFizz: true
    })(newFrame)
  }

  // Draw status bar on top
  newFrame = drawStatusBar({
    lives: state.ship.lives,
    score: state.status.score,
    fuel: state.ship.fuel,
    bonus: state.status.planetbonus,
    level: state.status.currentlevel,
    message: state.status.curmessage
  })(newFrame)

  return newFrame
}

// Handle starmap phase
if (state.transition.status === 'starmap') {
  // Show all starmap pixels
  const starmapPixels = fizzTransitionServiceFrame.getAllStarmapPixels()
  newFrame.drawables.push(...starmapPixels)

  // Draw ship on top if alive
  if (state.ship.deadCount === 0) {
    newFrame = drawShip({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      rotation: state.ship.shiprot,
      thrusting: false,
      inFizz: true
    })(newFrame)
  }

  // Draw status bar on top
  newFrame = drawStatusBar({
    lives: state.ship.lives,
    score: state.status.score,
    fuel: state.ship.fuel,
    bonus: state.status.planetbonus,
    level: state.status.currentlevel,
    message: state.status.curmessage
  })(newFrame)

  return newFrame
}
```

### Step 2.7: Update Service Instantiation

**File:** `src/game/gameLoop/index.ts` or wherever services are created (update)

Change from:

```typescript
const fizzTransitionService = createFizzTransitionService()
```

To:

```typescript
const fizzTransitionServiceFrame = createFizzTransitionServiceFrame()
```

And pass to renderingNew instead of renderingOriginal.

---

## Z-Order Summary

From lowest to highest during transitions:

- `-1000`: Background
- `10-100`: Game objects (walls, ship, shield, etc.) - not rendered during fizz/starmap
- `170`: `FIZZ_PIXEL` - Starmap pixels being progressively revealed
- `180`: `SHIP_FIZZ` - Ship during transition (on top of stars)
- `200`: `STATUS` - Status bar (always on top)

---

## Testing Strategy

### Phase 1 Testing (After Each Refactor)

1. **After Step 1.3:** Run game with bitmap renderer, complete a level, verify fizz transition looks identical
2. **After Step 1.5:** Same as above, verify no visual changes

### Phase 2 Testing

1. **After Step 2.2:** Test pixel rendering in isolation (create test frame with pixels)
2. **After Step 2.6:** Run game with modern renderer, complete a level, verify:
   - Starmap appears with progressive pixel reveal
   - Ship renders on top of starmap
   - Status bar renders on top of ship
   - Transition timing matches bitmap renderer

---

## Key Benefits

✅ **Incremental:** Refactor first, add features second
✅ **Safe:** Existing renderer keeps working throughout Phase 1
✅ **Code Reuse:** Starmap and LFSR logic shared between renderers
✅ **Clean Architecture:** Proper z-ordering, clear separation of concerns
✅ **Maintainable:** Well-documented utilities can be reused/extended

---

## File Structure Summary

### New Files

- `src/render/transition/starmapPixels.ts` - Shared pixel generator
- `src/render/transition/starmapToBitmap.ts` - Bitmap converter
- `src/core/transition/lfsrUtils.ts` - LFSR utilities
- `src/core/transition/FizzTransitionServiceFrame.ts` - Frame-based service

### Updated Files

- `src/render/transition/starBackground.ts` - Use shared utilities
- `src/core/transition/FizzTransitionService.ts` - Use LFSR utilities
- `src/lib/frame/types.ts` - Add DrawablePixel
- `src/lib/frame/drawFrameToCanvas.ts` - Render pixels
- `src/render-modern/z.ts` - Add FIZZ_PIXEL and SHIP_FIZZ
- `src/render-modern/ship.ts` - Add inFizz parameter
- `src/game/gameLoop/renderingNew.ts` - Implement fizz/starmap rendering
