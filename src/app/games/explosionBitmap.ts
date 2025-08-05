/**
 * Explosion Bitmap Game
 *
 * A bitmap-based game that demonstrates the explosion system.
 * Shows a ship in the center of the screen. When spacebar is pressed,
 * it triggers a ship explosion. After 80 frames (4 seconds at 20 FPS),
 * everything resets so it can be done again.
 */

import type { BitmapRenderer, MonochromeBitmap } from '../../bitmap'
import { fullFigure } from '../../ship/render/fullFigure'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { buildGameStore } from './store'
import { SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@/screen/constants'
import { loadSprites } from '@/store/spritesSlice'
import { SCENTER } from '@/figs/types'
import { getBackground } from '@/walls/render/getBackground'
import { grayFigure } from '@/ship/render/grayFigure'
import { eraseFigure } from '@/ship/render/eraseFigure'
import { shiftFigure } from '@/ship/render/shiftFigure'
import { 
  explosionsSlice, 
  startBlowup,
  updateExplosions 
} from '@/explosions/explosionsSlice'
import { drawExplosions } from '@/explosions/render/drawExplosions'
import { gravityVector } from '@/shared/gravityVector'
import { SHIPSPARKS, SH_SP_SPEED16, SH_SPARKLIFE, SH_SPADDLIFE } from '@/explosions/constants'

// Configure store with explosions slice
const store = buildGameStore({
  explosions: explosionsSlice.reducer
})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Track explosion state
let explosionTriggered = false
let explosionFrame = 0
const EXPLOSION_DURATION = 80 // 4 seconds at 20 FPS (from DEAD_TIME in GW.h)

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
  explosionTriggered = false
  explosionFrame = 0
}

const triggerExplosion = (): void => {
  const state = store.getState()
  
  // Get ship position in world coordinates
  const worldX = state.ship.shipx + state.screen.screenx
  const worldY = state.ship.shipy + state.screen.screeny
  
  // Trigger ship explosion using start_blowup pattern from start_death()
  // start_blowup((shipx + screenx) % worldwidth, shipy + screeny, ...)
  store.dispatch(
    startBlowup({
      x: worldX % state.planet.worldwidth,
      y: worldY,
      numspks: SHIPSPARKS,
      minsp: 16,  // From start_death() call in Terrain.c:417
      addsp: SH_SP_SPEED16,
      minlife: SH_SPARKLIFE,
      addlife: SH_SPADDLIFE
    })
  )
  
  explosionTriggered = true
  explosionFrame = 0
}

/**
 * Bitmap renderer for explosion game
 */
export const explosionBitmapRenderer: BitmapRenderer = (bitmap, frame, _env) => {
  // Check initialization status
  if (initializationError) {
    console.error('Initialization failed:', initializationError)
    bitmap.data.fill(0)
    return
  }

  if (!initializationComplete) {
    // Still loading
    bitmap.data.fill(0)
    return
  }

  const state = store.getState()

  // Check if sprites are loaded
  if (!state.sprites.allSprites) {
    console.error('Sprites not loaded')
    bitmap.data.fill(0)
    return
  }

  // Handle spacebar press
  if (frame.keysDown.has('Space') && !explosionTriggered) {
    triggerExplosion()
  }

  // Update explosion if active
  if (explosionTriggered) {
    explosionFrame++
    
    // Update explosion physics
    const gravityVectorFunc = (x: number, y: number) => 
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

  // Clear bitmap to black
  bitmap.data.fill(0xff)

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

  // Only draw ship if explosion hasn't been triggered
  let renderedBitmap = bitmap
  if (!explosionTriggered) {
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

  // Draw explosions if active
  if (explosionTriggered) {
    // For now, use empty shard images array since we haven't loaded them yet
    renderedBitmap = drawExplosions({
      explosions: finalState.explosions,
      screenx: finalState.screen.screenx,
      screeny: finalState.screen.screeny,
      worldwidth: finalState.planet.worldwidth,
      worldwrap: finalState.planet.worldwrap,
      shardImages: [] // TODO: Load and provide actual shard images
    })(renderedBitmap)
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}