/**
 * Star Background Bitmap Game
 *
 * Demonstrates the starBackground and fizz transition effects
 * as used in the original game's crackle() function.
 *
 * Press SPACE to trigger the transition sequence:
 * 1. Creates star background with ship
 * 2. Applies fizz effect to transition
 * 3. Delays for a few seconds
 * 4. Resets back to start
 */

import type { BitmapRenderer } from '../../bitmap'
import { viewClear } from '@/screen/render'
import { starBackground } from '@/screen/render/starBackground'
import { createFizzTransition, type FizzTransition } from '@/screen/render/fizz'
import { fullFigure } from '@/ship/render/fullFigure'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import type { SpriteServiceV2 } from '@/sprites/service'
import { SCENTER } from '@/figs/types'
import { cloneBitmap } from '@/bitmap'

// State for tracking the transition - persists across render calls
type TransitionState = {
  mode: 'normal' | 'fizzing' | 'complete'
  fizzTransition: FizzTransition | null
  fromBitmap: Uint8Array | null
  toBitmap: Uint8Array | null
  delayFrames: number
}

const state: TransitionState = {
  mode: 'normal',
  fizzTransition: null,
  fromBitmap: null,
  toBitmap: null,
  delayFrames: 0
}

// Ship position - center of screen
const SHIP_X = SCRWTH / 2
const SHIP_Y = VIEWHT / 2

const DELAY_FRAMES = 40 // 2 seconds at 20 FPS
const FIZZ_DURATION = 26 // based on measurements of fizz time on a Mac Plus

/**
 * Factory function to create bitmap renderer for star background demo
 */
export const createStarBackgroundBitmapRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Handle spacebar press to trigger transition
    if (frame.keysDown.has('Space') && state.mode === 'normal') {
      // Get ship sprite for rotation 0
      const shipSprite = spriteService.getShipSprite(0, { variant: 'def' })
      const shipMaskSprite = spriteService.getShipSprite(0, { variant: 'mask' })

      // Create the "from" bitmap (gray background with ship)
      const fromBitmap = cloneBitmap(bitmap)
      const clearedFrom = viewClear({ screenX: 0, screenY: 0 })(fromBitmap)
      const withShip = fullFigure({
        x: SHIP_X - SCENTER,
        y: SHIP_Y - SCENTER,
        def: shipSprite.bitmap,
        mask: shipMaskSprite.bitmap
      })(clearedFrom)

      // Create the "to" bitmap (star background with ship)
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

      // Initialize fizz transition with progressive implementation
      state.fizzTransition = createFizzTransition({
        from: withShip,
        to: starBg,
        durationFrames: FIZZ_DURATION
      })
      state.mode = 'fizzing'
      // Don't return - fall through to render the first frame
    }

    // Handle different modes
    switch (state.mode) {
      case 'normal': {
        // Normal mode: gray background with ship
        const clearedBitmap = viewClear({
          screenX: 0,
          screenY: 0
        })(bitmap)

        // Get ship sprites
        const shipSprite = spriteService.getShipSprite(0, { variant: 'def' })
        const shipMaskSprite = spriteService.getShipSprite(0, {
          variant: 'mask'
        })

        // Draw ship at center
        const withShip = fullFigure({
          x: SHIP_X - SCENTER,
          y: SHIP_Y - SCENTER,
          def: shipSprite.bitmap,
          mask: shipMaskSprite.bitmap
        })(clearedBitmap)

        bitmap.data.set(withShip.data)
        break
      }

      case 'fizzing': {
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
            state.delayFrames = 0
          }
        }
        break
      }

      case 'complete': {
        // Show final star background during delay
        if (state.toBitmap) {
          bitmap.data.set(state.toBitmap)
        }

        state.delayFrames++

        // Reset after delay
        if (state.delayFrames >= DELAY_FRAMES) {
          state.mode = 'normal'
          state.fromBitmap = null
          state.toBitmap = null
          state.fizzTransition = null
          state.delayFrames = 0
        }
        break
      }
    }
  }
