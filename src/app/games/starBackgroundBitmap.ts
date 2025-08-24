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
import { fizz } from '@/screen/render/fizz'
import { fullFigure } from '@/ship/render/fullFigure'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import type { SpriteServiceV2 } from '@/sprites/service'
import { SCENTER } from '@/figs/types'
import { cloneBitmap } from '@/bitmap'

// State for tracking the transition
type TransitionState = {
  mode: 'normal' | 'stars' | 'fizzing' | 'delay'
  starBitmap: Uint8Array | null
  fizzingBitmap: Uint8Array | null
  delayFrames: number
  fizzProgress: number
}

const state: TransitionState = {
  mode: 'normal',
  starBitmap: null,
  fizzingBitmap: null,
  delayFrames: 0,
  fizzProgress: 0
}

// Ship position - center of screen
const SHIP_X = SCRWTH / 2
const SHIP_Y = VIEWHT / 2

const DELAY_FRAMES = 60 // 3 seconds at 20 FPS
const FIZZ_DURATION = 40 // 2 seconds at 20 FPS

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

      // Create star background with ship
      const starBg = starBackground({
        starCount: 150,
        additionalRender: screen => {
          // Render ship at center using fullFigure
          return fullFigure({
            x: SHIP_X - SCENTER,
            y: SHIP_Y - SCENTER,
            def: shipSprite.bitmap,
            mask: shipMaskSprite.bitmap
          })(screen)
        }
      })

      // Apply star background to a fresh bitmap
      const starBitmap = cloneBitmap(bitmap)
      const withStars = starBg(starBitmap)

      // Store the star background bitmap
      state.starBitmap = new Uint8Array(withStars.data)
      state.mode = 'stars'
      state.fizzProgress = 0

      // Immediately transition to fizzing
      state.mode = 'fizzing'
      return
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

      case 'stars': {
        // Show the star background (this state is very brief)
        if (state.starBitmap) {
          bitmap.data.set(state.starBitmap)
        }
        break
      }

      case 'fizzing': {
        // Apply fizz transition from gray+ship to stars
        if (state.fizzProgress === 0) {
          // First frame of fizz: create the initial gray+ship bitmap
          const clearedBitmap = viewClear({
            screenX: 0,
            screenY: 0
          })(bitmap)

          const shipSprite = spriteService.getShipSprite(0, { variant: 'def' })
          const shipMaskSprite = spriteService.getShipSprite(0, {
            variant: 'mask'
          })

          const fromBitmap = fullFigure({
            x: SHIP_X - SCENTER,
            y: SHIP_Y - SCENTER,
            def: shipSprite.bitmap,
            mask: shipMaskSprite.bitmap
          })(clearedBitmap)

          // Create the fizz effect that transitions to star background
          if (state.starBitmap) {
            const toBitmap = cloneBitmap(bitmap)
            toBitmap.data.set(state.starBitmap)

            // Apply fizz effect (it runs to completion each call)
            const fizzEffect = fizz({
              from: fromBitmap
            })
            const fizzed = fizzEffect(toBitmap)
            state.fizzingBitmap = new Uint8Array(fizzed.data)
          }
        }

        state.fizzProgress++

        // Show the fizz result
        if (state.fizzingBitmap) {
          bitmap.data.set(state.fizzingBitmap)
        }

        // Transition to delay after fizz duration
        if (state.fizzProgress >= FIZZ_DURATION) {
          state.mode = 'delay'
          state.delayFrames = 0
        }
        break
      }

      case 'delay': {
        // Show the star background during delay
        if (state.starBitmap) {
          bitmap.data.set(state.starBitmap)
        }

        state.delayFrames++

        // Reset after delay
        if (state.delayFrames >= DELAY_FRAMES) {
          state.mode = 'normal'
          state.starBitmap = null
          state.fizzingBitmap = null
          state.delayFrames = 0
          state.fizzProgress = 0
        }
        break
      }
    }
  }
