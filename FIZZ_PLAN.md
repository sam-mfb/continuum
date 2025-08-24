# Fizz Effect Implementation Plan

## Problem Statement

Our current `fizz` function runs the entire LFSR sequence to completion and returns the final result. This doesn't work with our immutable render pattern where we need to see progressive frame-by-frame transitions.

## Proposed Solution: Progressive LFSR State

Create a stateful fizz transition object that maintains LFSR state and progressively updates the bitmap over multiple frames.

## API Design

### Core Types

```typescript
// The main fizz transition object
type FizzTransition = {
  // Generate the next frame of the transition
  nextFrame(): MonochromeBitmap

  // Current progress (0.0 = just started, 1.0 = complete)
  readonly progress: number

  // Whether all pixels have been transitioned
  readonly isComplete: boolean

  // Reset to beginning (optional, for reusability)
  reset(): void
}

// Factory function to create a fizz transition
function createFizzTransition(deps: {
  from: MonochromeBitmap // Starting image
  to: MonochromeBitmap // Ending image
  durationFrames: number // Number of intermediate frames (0 = instant, 1 = very fast)
  seed?: number // Optional LFSR seed (default: 4357 from original)
}): FizzTransition
```

### Implementation Details

The `FizzTransition` object will internally maintain:

1. **LFSR State**: Current seed value for the random number generator
2. **Working Bitmap**: Current state of the transition (starts as copy of `to`)
3. **From Bitmap**: Reference to source image
4. **Pixel Tracking**: Set or bitmap to track which pixels have been processed (ensures each pixel changes only once)
5. **Progress Counter**: How many pixels have been transitioned
6. **Pixels Per Frame**: Calculated as `totalPixels / durationFrames`

#### Frame Semantics

- `durationFrames` represents the number of **intermediate** transition frames
- `durationFrames = 0`: Returns the "to" frame immediately (no transition)
- `durationFrames = 1`: Produces 1 transitional frame (processes totalPixels/1 pixels, likely showing partial transition)
- `durationFrames = 40`: Produces 40 transitional frames (processes totalPixels/40 pixels per frame)

The complete sequence is:

- Before fizz: Show "from" image
- During fizz: Show `durationFrames` transitional images
- After fizz: Show "to" image

Each call to `nextFrame()`:

1. Processes exactly `Math.floor(totalPixels / durationFrames)` pixels
2. For each pixel to process:
   - Advance LFSR to get next random position
   - If pixel not yet processed, copy from `from` bitmap to working bitmap
   - Mark pixel as processed to prevent duplicate changes
   - If pixel already processed, continue advancing LFSR until finding unprocessed pixel
3. Return cloned copy of working bitmap (maintaining immutability)
4. After `durationFrames` calls, `isComplete` becomes true (even if some pixels remain unprocessed)

## Usage in Render Loop

### Example: starBackgroundBitmap.ts

```typescript
import { createFizzTransition, type FizzTransition } from '@/screen/render/fizz'

// State for tracking the transition - LIVES OUTSIDE THE RENDER FUNCTION
type TransitionState = {
  mode: 'normal' | 'fizzing' | 'complete'
  fizzTransition: FizzTransition | null
  fromBitmap: Uint8Array | null // Store the "from" image
  toBitmap: Uint8Array | null // Store the "to" image
}

// This state persists across render calls
const state: TransitionState = {
  mode: 'normal',
  fizzTransition: null,
  fromBitmap: null,
  toBitmap: null
}

export const createStarBackgroundBitmapRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Handle spacebar press to start transition
    if (frame.keysDown.has('Space') && state.mode === 'normal') {
      // Create the "from" bitmap (gray background with ship) ONCE
      const fromBitmap = cloneBitmap(bitmap)
      const clearedFrom = viewClear({ screenX: 0, screenY: 0 })(fromBitmap)
      const withShip = fullFigure({
        x: SHIP_X - SCENTER,
        y: SHIP_Y - SCENTER,
        def: shipSprite.bitmap,
        mask: shipMaskSprite.bitmap
      })(clearedFrom)

      // Create the "to" bitmap (star background with ship) ONCE
      const toBitmap = cloneBitmap(bitmap)
      const starBg = starBackground({
        starCount: 150,
        additionalRender: screen =>
          fullFigure({
            x: SHIP_X - SCENTER,
            y: SHIP_Y - SCENTER,
            def: shipSprite.bitmap,
            mask: shipMaskSprite.bitmap
          })(screen)
      })(toBitmap)

      // Store bitmaps for potential reuse
      state.fromBitmap = new Uint8Array(withShip.data)
      state.toBitmap = new Uint8Array(starBg.data)

      // Initialize fizz transition ONCE (40 frames = 2 seconds at 20 FPS)
      // This object will persist and maintain its state across frames
      state.fizzTransition = createFizzTransition({
        from: withShip,
        to: starBg,
        durationFrames: 40
      })
      state.mode = 'fizzing'
      return
    }

    // Handle different modes
    switch (state.mode) {
      case 'normal':
        // Render normal gray background with ship
        const clearedBitmap = viewClear({ screenX: 0, screenY: 0 })(bitmap)
        const withShip = fullFigure({
          /* ... */
        })(clearedBitmap)
        bitmap.data.set(withShip.data)
        break

      case 'fizzing':
        if (state.fizzTransition) {
          // Get next frame of the transition
          // This advances the internal LFSR and returns the current state
          const fizzFrame = state.fizzTransition.nextFrame()
          bitmap.data.set(fizzFrame.data)

          // Check if complete
          if (state.fizzTransition.isComplete) {
            state.mode = 'complete'
            // Clean up the transition object
            state.fizzTransition = null
          }
        }
        break

      case 'complete':
        // Show final star background (use stored bitmap)
        if (state.toBitmap) {
          bitmap.data.set(state.toBitmap)
        }
        break
    }
  }
```

### Key Points About State Management

1. **State Lives Outside Render Function**: The `state` object is declared at module level, so it persists across render calls

2. **FizzTransition Created Once**: When spacebar is pressed, we create the `FizzTransition` object once and store it in `state.fizzTransition`

3. **Progressive Updates**: Each frame during 'fizzing' mode, we call `nextFrame()` which:

   - Advances the internal LFSR state
   - Processes the next batch of pixels
   - Returns the updated bitmap

4. **Cleanup**: When transition completes, we null out the `FizzTransition` object but keep the final bitmaps for reuse

## Implementation Steps

1. **Create new `fizz.ts` module** with the progressive implementation

   - Keep existing `fizz` function for backwards compatibility
   - Add new `createFizzTransition` function

2. **Implement LFSR state management**

   - Track seed value between calls
   - Implement efficient pixel tracking (BitSet or Uint8Array)

3. **Handle edge cases**

   - Ensure all pixels get transitioned even with rounding
   - Handle very short durations (< 10 frames)
   - Handle very long durations efficiently

4. **Optimize performance**

   - Consider processing pixels in chunks for cache efficiency
   - Maybe pre-calculate some LFSR advances

5. **Update starBackgroundBitmap.ts** to use new implementation

## Alternative Considerations

### Pixel Processing Strategy

We will use **Fixed pixels per frame**:

- Process exactly `Math.floor(totalPixels / durationFrames)` pixels each frame
- Any remainder pixels that don't get processed are fine - we simply show the "to" bitmap after completion
- With reasonable frame rates (20+ fps) and durations (20+ frames), untouched pixels won't be noticeable
- This approach is simple, predictable, and performs consistently

### Memory vs Computation Tradeoff

We could optionally support a "pre-rendered" mode where all frames are calculated upfront:

```typescript
function createFizzTransition(deps: {
  from: MonochromeBitmap
  to: MonochromeBitmap
  durationFrames: number
  preRender?: boolean // Pre-calculate all frames
}): FizzTransition
```

This would use more memory but provide consistent frame timing.

## Testing Approach

1. **Unit tests** for LFSR sequence generation
2. **Visual tests** comparing frame sequences to original
3. **Performance tests** ensuring smooth 20 FPS operation
4. **Edge case tests** (1 frame duration, huge durations, etc.)

## Timeline

1. Implement core `createFizzTransition` function
2. Add unit tests
3. Update `starBackgroundBitmap.ts` to use new implementation
4. Test visually to ensure effect matches original
5. Optimize if needed for performance

## Design Decisions

1. **Pixel tracking**: Each pixel will be tracked to ensure it's only changed once. This prevents the LFSR from affecting the same pixel multiple times.

2. **Bitmap size handling**: The implementation will handle arbitrary bitmap sizes for maximum flexibility.

3. **Reverse fizz**: Not included in initial implementation.

4. **Duration semantics**:
   - `durationFrames = 0`: Instant transition (return "to" immediately)
   - `durationFrames = 1`: One transitional frame processing totalPixels/1 pixels
   - `durationFrames = N`: N transitional frames, each processing approximately totalPixels/N pixels
   - The LFSR may not hit all pixels if duration is too short, creating a partial transition effect
