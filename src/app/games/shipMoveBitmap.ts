/**
 * Ship Move Bitmap Game
 *
 * A bitmap-based version of the ship movement game that uses the
 * proper rendering functions for drawing the ship and bullets.
 * Combines shipMove.ts logic with bitmap rendering like wallDrawing.ts.
 */

import type { BitmapRenderer, MonochromeBitmap } from '../../bitmap'
import { fullFigure } from '../../ship/render/fullFigure'
import { drawShipShot } from '../../shots/render/drawShipShot'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { shotsSlice } from '@/shots/shotsSlice'
import { ShipControl } from '@/ship/types'
import { shipControl } from './shipControlThunk'
import { buildGameStore } from './store'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import { getBackground } from '@/walls/render/getBackground'
import { loadSprites } from '@/store/spritesSlice'
import { SCENTER } from '@/figs/types'

// Configure store with all slices and containment middleware
const store = buildGameStore()

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  // Load sprites first
  await store.dispatch(loadSprites()).unwrap()

  // Initialize dummy planet (1000x1000)
  store.dispatch(
    planetSlice.actions.loadPlanet({
      worldwidth: 1000,
      worldheight: 1000,
      worldwrap: false,
      shootslow: 0,
      xstart: 500,
      ystart: 500,
      planetbonus: 0,
      gravx: 0,
      gravy: 0,
      numcraters: 0,
      lines: [],
      bunkers: [],
      fuels: [],
      craters: []
    })
  )

  // Initialize ship at center of viewport
  store.dispatch(shipSlice.actions.initShip({ x: 256, y: 159 }))

  // Initialize screen to show ship at world center
  store.dispatch(
    screenSlice.actions.setPosition({
      x: 500 - 256, // World center - screen center
      y: 500 - 159
    })
  )
}

// Start initialization
void initializeGame()

const getPressedControls = (keysDown: Set<string>): ShipControl[] => {
  const controls: ShipControl[] = []

  if (keysDown.has('KeyZ')) controls.push(ShipControl.LEFT)
  if (keysDown.has('KeyX')) controls.push(ShipControl.RIGHT)
  if (keysDown.has('Period')) controls.push(ShipControl.THRUST)
  if (keysDown.has('Slash')) controls.push(ShipControl.FIRE)
  if (keysDown.has('Space')) controls.push(ShipControl.SHIELD)

  return controls
}

/**
 * Bitmap renderer for ship movement game
 */
export const shipMoveBitmapRenderer: BitmapRenderer = (bitmap, frame, _env) => {
  const state = store.getState()

  // Check if sprites are loaded
  if (!state.sprites.allSprites) {
    // Show loading message or just clear screen
    bitmap.data.fill(0)
    return
  }

  // Get gravity from planet
  const gravity = {
    x: state.planet.gravx,
    y: state.planet.gravy
  }

  // Handle controls
  store.dispatch(
    shipControl({
      controlsPressed: getPressedControls(frame.keysDown),
      gravity
    })
  )

  // Move ship - containment middleware will automatically apply
  store.dispatch(shipSlice.actions.moveShip())

  // Move all bullets
  store.dispatch(
    shotsSlice.actions.moveBullets({
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
    })
  )

  // Get final state for drawing
  const finalState = store.getState()

  // Draw crosshatch background using the proper background pattern
  const background = getBackground(
    finalState.screen.screenx,
    finalState.screen.screeny
  )
  
  // Fill bitmap with background pattern
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const worldX = x + finalState.screen.screenx
      const worldY = y + finalState.screen.screeny
      const pattern = background[(worldX + worldY) & 1]!
      
      // Apply pattern byte by byte for efficiency
      if (x % 8 === 0 && x + 7 < bitmap.width) {
        // Full byte
        const byteIndex = y * bitmap.rowBytes + x / 8
        bitmap.data[byteIndex] = pattern >>> 24
      } else {
        // Individual bit
        const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
        const bitIndex = 7 - (x % 8)
        if (pattern & 0x80000000) {
          bitmap.data[byteIndex]! |= 1 << bitIndex
        } else {
          bitmap.data[byteIndex]! &= ~(1 << bitIndex)
        }
      }
    }
  }

  // Draw ship using the proper fullFigure function
  const shipSprite = finalState.sprites.allSprites!.ships.getRotationIndex(finalState.ship.shiprot)
  
  // Convert sprite data to MonochromeBitmap format
  const shipDefBitmap: MonochromeBitmap = {
    data: shipSprite.def,
    width: 32,
    height: 32,
    rowBytes: 4
  }
  
  const shipMaskBitmap: MonochromeBitmap = {
    data: shipSprite.mask,
    width: 32,
    height: 32,
    rowBytes: 4
  }
  
  // Ship position needs to be offset by SCENTER (15) to account for center point
  // Original: full_figure(shipx-SCENTER, shipy-SCENTER, ship_defs[shiprot], ship_masks[shiprot], SHIPHT)
  let renderedBitmap = fullFigure({
    x: finalState.ship.shipx - SCENTER,
    y: finalState.ship.shipy - SCENTER,
    def: shipDefBitmap,
    mask: shipMaskBitmap
  })(bitmap)

  // Draw all active ship shots
  for (const shot of finalState.shots.shipshots) {
    if (shot.lifecount > 0) {
      // Convert world coordinates to screen coordinates
      // Original: shotx = sp->x - screenx - 1; shoty = sp->y - screeny - 1;
      const shotx = shot.x - finalState.screen.screenx - 1
      const shoty = shot.y - finalState.screen.screeny - 1

      // Check if shot is visible on screen (original checks: shotx < SCRWTH-3)
      if (
        shotx >= 0 &&
        shotx < SCRWTH - 3 &&
        shoty >= 0 &&
        shoty < VIEWHT - 3
      ) {
        renderedBitmap = drawShipShot({
          x: shotx,
          y: shoty
        })(renderedBitmap)
      }

      // Handle world wrapping for toroidal worlds
      if (
        finalState.planet.worldwrap &&
        finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
      ) {
        const wrappedShotx =
          shot.x + finalState.planet.worldwidth - finalState.screen.screenx - 1
        if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 3) {
          renderedBitmap = drawShipShot({
            x: wrappedShotx,
            y: shoty
          })(renderedBitmap)
        }
      }
    }
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}