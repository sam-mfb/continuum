/**
 * Explosion Bitmap Game
 *
 * A bitmap-based game that demonstrates the explosion system.
 * Shows a ship in the center of the screen. When spacebar is pressed,
 * it triggers a ship explosion. When '1' is pressed, it triggers a bunker
 * explosion. After 80 frames (4 seconds at 20 FPS), everything resets
 * so it can be done again.
 */

import type { BitmapRenderer, MonochromeBitmap } from '../../bitmap'
import { fullFigure } from '../../ship/render/fullFigure'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { buildGameStore } from './store'
import { SCRWTH, TOPMARG, BOTMARG } from '@/screen/constants'
import { loadSprites } from '@/store/spritesSlice'
import { SCENTER } from '@/figs/types'
import { getBackground } from '@/walls/render/getBackground'
import { grayFigure } from '@/ship/render/grayFigure'
import { eraseFigure } from '@/ship/render/eraseFigure'
import { shiftFigure } from '@/ship/render/shiftFigure'
import {
  explosionsSlice,
  startShipDeath,
  startExplosion,
  updateExplosions
} from '@/explosions/explosionsSlice'
import { drawExplosions } from '@/explosions/render/drawExplosions'
import { gravityVector } from '@/shared/gravityVector'
import type { ExplosionsState } from '@/explosions/types'
import { drawBunker } from '@/planet/render/bunker'
import { ptToAngle } from '@/shared/ptToAngle'

// Configure store with explosions slice
const store = buildGameStore({
  explosions: explosionsSlice.reducer
})

// Type for our extended state
type ExtendedGameState = ReturnType<typeof store.getState> & {
  explosions: ExplosionsState
}

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Track explosion state
let shipExplosionTriggered = false
let bunkerExplosionTriggered = false
let explosionFrame = 0
const EXPLOSION_DURATION = 80 // 4 seconds at 20 FPS (from DEAD_TIME in GW.h)

// Bunker state - positioned to the right of the ship
let bunkerAlive = true
const BUNKER_X = SCRWTH / 2 + 80 // 80 pixels to the right of center
const BUNKER_Y = Math.floor((TOPMARG + BOTMARG) / 2) // Same height as ship

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting explosionBitmap initialization...')

    // Load sprites first
    console.log('Loading sprites...')
    await store.dispatch(loadSprites()).unwrap()
    console.log('Sprites loaded successfully')

    // Load the release galaxy file to get planet data
    console.log('Loading galaxy file...')
    const response = await fetch('/src/assets/release_galaxy.bin')
    if (!response.ok) {
      throw new Error('Failed to load galaxy file')
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('Galaxy file loaded, size:', arrayBuffer.byteLength)

    const { parsePlanet } = await import('@/planet/parsePlanet')
    const { Galaxy } = await import('@/galaxy/methods')

    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
    const galaxyHeader = Galaxy.parseHeader(headerBuffer)
    console.log('Galaxy header:', galaxyHeader)

    // Load planet 1
    const planet1 = parsePlanet(planetsBuffer, galaxyHeader.indexes, 1)
    console.log('Planet 1 loaded:', {
      dimensions: `${planet1.worldwidth}x${planet1.worldheight}`,
      start: `(${planet1.xstart}, ${planet1.ystart})`,
      gravity: `(${planet1.gravx}, ${planet1.gravy})`
    })

    // Initialize planet
    store.dispatch(planetSlice.actions.loadPlanet(planet1))

    // Initialize ship at center of screen
    const shipScreenX = SCRWTH / 2 // 256
    const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2) // 159

    store.dispatch(
      shipSlice.actions.initShip({
        x: shipScreenX,
        y: shipScreenY
      })
    )

    // Initialize screen position so ship appears at center
    store.dispatch(
      screenSlice.actions.setPosition({
        x: 0,
        y: 0
      })
    )

    initializationComplete = true
    console.log('explosionBitmap initialization complete')
  } catch (error) {
    console.error('Error initializing explosionBitmap:', error)
    initializationError = error as Error
  }
}

// Start initialization
void initializeGame()

const resetGame = (): void => {
  // Reset ship to center of screen
  const shipScreenX = SCRWTH / 2 // 256
  const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2) // 159

  store.dispatch(
    shipSlice.actions.resetShip({
      x: shipScreenX,
      y: shipScreenY
    })
  )

  // Clear explosion state
  store.dispatch(explosionsSlice.actions.clearExplosions())
  shipExplosionTriggered = false
  bunkerExplosionTriggered = false
  explosionFrame = 0

  // Reset bunker
  bunkerAlive = true
}

const triggerShipExplosion = (): void => {
  const state = store.getState()

  // Get ship position in world coordinates
  const worldX = state.ship.shipx + state.screen.screenx
  const worldY = state.ship.shipy + state.screen.screeny

  // Trigger ship explosion using startShipDeath
  // Based on start_death() in Terrain.c:411
  store.dispatch(
    startShipDeath({
      x: worldX % state.planet.worldwidth,
      y: worldY
    })
  )

  shipExplosionTriggered = true
  explosionFrame = 0
}

const triggerBunkerExplosion = (): void => {
  if (!bunkerAlive) return

  const state = store.getState()

  // Get bunker position in world coordinates
  const worldX = BUNKER_X + state.screen.screenx
  const worldY = BUNKER_Y + state.screen.screeny

  // Use the bunker's actual rotation (north-facing = 0)
  const bunkerRotation = 0 // North-facing bunker

  // Trigger bunker explosion using startExplosion
  // Based on start_explosion() in Terrain.c:315
  store.dispatch(
    startExplosion({
      x: worldX % state.planet.worldwidth,
      y: worldY,
      dir: bunkerRotation, // Use bunker's rotation, not angle from ship
      kind: 0 // First bunker type (WALL)
    })
  )

  bunkerAlive = false
  bunkerExplosionTriggered = true
  explosionFrame = 0
}

/**
 * Bitmap renderer for explosion game
 */
export const explosionBitmapRenderer: BitmapRenderer = (
  bitmap,
  frame,
  _env
) => {
  // Clear the bitmap each frame so background and XOR sprites start from a known state
  bitmap.data.fill(0)
  // Check initialization status
  if (initializationError) {
    console.error('Initialization failed:', initializationError)
    bitmap.data.fill(0)
    return
  }

  if (!initializationComplete) {
    // Still loading
    return
  }

  const state = store.getState()

  // Check if sprites are loaded
  if (!state.sprites.allSprites) {
    console.error('Sprites not loaded')
    return
  }

  // Handle key presses
  if (frame.keysDown.has('Space') && !shipExplosionTriggered) {
    triggerShipExplosion()
  }

  if (frame.keysDown.has('Digit1') && !bunkerExplosionTriggered) {
    triggerBunkerExplosion()
  }

  // Update explosion if active
  if (shipExplosionTriggered || bunkerExplosionTriggered) {
    explosionFrame++

    // Update explosion physics
    const gravityVectorFunc = (
      x: number,
      y: number
    ): { xg: number; yg: number } =>
      gravityVector({
        x,
        y,
        gravx: state.planet.gravx,
        gravy: state.planet.gravy,
        gravityPoints: [], // No gravity points for now
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap
      })

    store.dispatch(
      updateExplosions({
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap,
        gravityVector: gravityVectorFunc
      })
    )

    // Reset after EXPLOSION_DURATION frames
    if (explosionFrame >= EXPLOSION_DURATION) {
      resetGame()
    }
  }

  // Get final state for drawing
  const finalState = store.getState()

  // First, create a crosshatch gray background
  // IMPORTANT: Pattern must be based on world coordinates, not screen coordinates
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Calculate world position
      const worldX = x + finalState.screen.screenx
      const worldY = y + finalState.screen.screeny
      // Set pixel if worldX + worldY is even (creates fixed checkerboard)
      if ((worldX + worldY) % 2 === 0) {
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }

  // Get ship sprite
  const shipSprite = finalState.sprites.allSprites!.ships.getRotationIndex(
    finalState.ship.shiprot
  )

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

  const SHADOW_OFFSET_X = 8
  const SHADOW_OFFSET_Y = 5

  // Only draw ship if ship explosion hasn't been triggered
  let renderedBitmap = bitmap
  if (!shipExplosionTriggered) {
    // 1. gray_figure - ship shadow background
    renderedBitmap = grayFigure({
      x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap,
      background: getBackground(
        finalState.screen.screenx,
        finalState.screen.screeny
      )
    })(renderedBitmap)

    // 2. erase_figure - erase ship area
    renderedBitmap = eraseFigure({
      x: finalState.ship.shipx - SCENTER,
      y: finalState.ship.shipy - SCENTER,
      def: shipMaskBitmap
    })(renderedBitmap)

    // 3. shift_figure - ship shadow
    renderedBitmap = shiftFigure({
      x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap
    })(renderedBitmap)

    // 4. full_figure - draw ship
    renderedBitmap = fullFigure({
      x: finalState.ship.shipx - SCENTER,
      y: finalState.ship.shipy - SCENTER,
      def: shipDefBitmap,
      mask: shipMaskBitmap
    })(renderedBitmap)
  }

  // Draw bunker if alive
  if (bunkerAlive && finalState.sprites.allSprites) {
    const bunkerSprites = finalState.sprites.allSprites.bunkers
    // Use the first bunker type (kind 0)
    const bunkerSprite = bunkerSprites.getSprite(0, 0) // kind 0, rotation 0

    if (bunkerSprite) {
      // Use pre-rendered image based on alignment (like doBunks does)
      const align = (BUNKER_X + BUNKER_Y) & 1
      const bunkerBitmap: MonochromeBitmap = {
        data:
          align === 0
            ? bunkerSprite.images.background1
            : bunkerSprite.images.background2,
        width: 48,
        height: 32,
        rowBytes: 6
      }

      renderedBitmap = drawBunker({
        x: BUNKER_X,
        y: BUNKER_Y,
        def: bunkerBitmap
      })(renderedBitmap)
    }
  }

  // Draw explosions if active
  if (shipExplosionTriggered || bunkerExplosionTriggered) {
    const extendedState = finalState as ExtendedGameState

    // Get shard images from sprites
    const shardImages = finalState.sprites.allSprites?.shards || null

    renderedBitmap = drawExplosions({
      explosions: extendedState.explosions,
      screenx: extendedState.screen.screenx,
      screeny: extendedState.screen.screeny,
      worldwidth: extendedState.planet.worldwidth,
      worldwrap: extendedState.planet.worldwrap,
      shardImages
    })(renderedBitmap)
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}
