/**
 * Explosion Bitmap Game
 *
 * A comprehensive test of the explosion system showing all bunker types
 * at various rotations. Press keys to trigger explosions for each bunker.
 * After explosions complete, bunkers reset.
 */

import type { BitmapRenderer, MonochromeBitmap } from '@lib/bitmap'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { buildGameStore } from '@dev/store'
import type { SpriteServiceV2 } from '@core/sprites'
import type { ShardSprite, ShardSpriteSet } from '@core/figs/types'
import { xbcenter, ybcenter } from '@core/planet'
import {
  explosionsSlice,
  startExplosion,
  updateExplosions
} from '@core/explosions'
import { drawExplosions } from '@core/explosions'
import type { ExplosionsState } from '@core/explosions'
import { drawBunker } from '@core/planet'
import { viewClear } from '@core/screen'
import { ASSET_PATHS } from '@core/constants'

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

// Bunker configuration
type BunkerConfig = {
  kind: number
  rotation: number
  x: number
  y: number
  key: string
  alive: boolean
  explosionFrame: number
}

// Layout bunkers in a grid
// 5 bunker types (0-4), various rotations for each
const bunkers: BunkerConfig[] = []
const BUNKER_SPACING_X = 30
const BUNKER_SPACING_Y = 50
const START_X = 20
const START_Y = 40

// WALL (kind 0) - show all 16 rotations (0-15)
// Row 1: rotations 0-7 (N, NNE, NE, ENE, E, ESE, SE, SSE)
for (let i = 0; i < 8; i++) {
  bunkers.push({
    kind: 0,
    rotation: i,
    x: START_X + i * BUNKER_SPACING_X,
    y: START_Y,
    key: `Digit${i + 1}`, // Keys 1-8
    alive: true,
    explosionFrame: 0
  })
}
// Row 2: rotations 8-15 (S, SSW, SW, WSW, W, WNW, NW, NNW)
const wallKeys2 = [
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'KeyU',
  'KeyI'
]
for (let i = 0; i < 8; i++) {
  bunkers.push({
    kind: 0,
    rotation: i + 8,
    x: START_X + i * BUNKER_SPACING_X,
    y: START_Y + BUNKER_SPACING_Y,
    key: wallKeys2[i]!,
    alive: true,
    explosionFrame: 0
  })
}

// DIFF (kind 1) - show all 16 rotations
// Row 3: rotations 0-7
const diffKeys1 = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK'
]
for (let i = 0; i < 8; i++) {
  bunkers.push({
    kind: 1,
    rotation: i,
    x: START_X + i * BUNKER_SPACING_X,
    y: START_Y + BUNKER_SPACING_Y * 2,
    key: diffKeys1[i]!,
    alive: true,
    explosionFrame: 0
  })
}
// Row 4: rotations 8-15
const diffKeys2 = [
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'KeyM',
  'Comma'
]
for (let i = 0; i < 8; i++) {
  bunkers.push({
    kind: 1,
    rotation: i + 8,
    x: START_X + i * BUNKER_SPACING_X,
    y: START_Y + BUNKER_SPACING_Y * 3,
    key: diffKeys2[i]!,
    alive: true,
    explosionFrame: 0
  })
}

// GROUND (kind 2) - just show one (animation frame 0)
bunkers.push({
  kind: 2,
  rotation: 0, // Animation frame 0
  x: START_X + 9 * BUNKER_SPACING_X,
  y: START_Y,
  key: 'KeyO',
  alive: true,
  explosionFrame: 0
})

// FOLLOW (kind 3) - just show one (animation frame 0)
bunkers.push({
  kind: 3,
  rotation: 0, // Animation frame 0
  x: START_X + 9 * BUNKER_SPACING_X,
  y: START_Y + BUNKER_SPACING_Y,
  key: 'KeyP',
  alive: true,
  explosionFrame: 0
})

// GENERATOR (kind 4) - just show one (animation frame 0)
bunkers.push({
  kind: 4,
  rotation: 0, // Animation frame 0
  x: START_X + 9 * BUNKER_SPACING_X,
  y: START_Y + BUNKER_SPACING_Y * 2,
  key: 'KeyL',
  alive: true,
  explosionFrame: 0
})

const EXPLOSION_DURATION = 80 // 4 seconds at 20 FPS

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting explosionBitmap initialization...')

    // Load the release galaxy file to get planet data
    console.log('Loading galaxy file...')
    const response = await fetch(ASSET_PATHS.GALAXY_DATA)
    if (!response.ok) {
      throw new Error('Failed to load galaxy file')
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('Galaxy file loaded, size:', arrayBuffer.byteLength)

    const { parsePlanet } = await import('@core/planet/parsePlanet')
    const { Galaxy } = await import('@core/galaxy/methods')

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

    // Initialize screen position at origin
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

const triggerBunkerExplosion = (bunker: BunkerConfig): void => {
  if (!bunker.alive) return

  const state = store.getState()

  // Get bunker CENTER in world coordinates
  // bunker.x/y is the top-left corner for rendering, but explosion needs center
  // Use the actual center offsets for this bunker type and rotation
  const centerOffsetX = xbcenter[bunker.kind]?.[bunker.rotation] ?? 24
  const centerOffsetY = ybcenter[bunker.kind]?.[bunker.rotation] ?? 24
  const worldX = bunker.x + centerOffsetX + state.screen.screenx
  const worldY = bunker.y + centerOffsetY + state.screen.screeny

  // For animated bunkers (kinds 2-4), use rotation 0 for direction
  // For static bunkers (kinds 0-1), use the actual rotation
  const dir = bunker.kind >= 2 ? 0 : bunker.rotation

  // Debug: log what we're triggering
  console.log(
    `Exploding bunker: kind=${bunker.kind}, rotation=${bunker.rotation}, dir=${dir}`
  )

  // Trigger bunker explosion
  store.dispatch(
    startExplosion({
      x: worldX % state.planet.worldwidth,
      y: worldY,
      dir,
      kind: bunker.kind
    })
  )

  bunker.alive = false
  bunker.explosionFrame = 0
}

/**
 * Factory function to create bitmap renderer for explosion game
 */
export const createExplosionBitmapRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Clear the bitmap each frame
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

    // Handle key presses
    for (const bunker of bunkers) {
      if (frame.keysDown.has(bunker.key) && bunker.alive) {
        triggerBunkerExplosion(bunker)
      }
    }

    // Update explosion physics
    let anyExplosionActive = false
    for (const bunker of bunkers) {
      if (!bunker.alive) {
        bunker.explosionFrame++
        anyExplosionActive = true

        // Reset bunker after explosion completes
        if (bunker.explosionFrame >= EXPLOSION_DURATION) {
          bunker.alive = true
          bunker.explosionFrame = 0
        }
      }
    }

    if (anyExplosionActive) {
      store.dispatch(
        updateExplosions({
          worldwidth: state.planet.worldwidth,
          worldwrap: state.planet.worldwrap,
          gravx: state.planet.gravx,
          gravy: state.planet.gravy,
          gravityPoints: state.planet.gravityPoints
        })
      )
    }

    // Get final state for drawing
    const finalState = store.getState()

    // Create a crosshatch gray background
    const clearedBitmap = viewClear({
      screenX: finalState.screen.screenx,
      screenY: finalState.screen.screeny
    })(bitmap)
    bitmap.data.set(clearedBitmap.data)

    let renderedBitmap = bitmap

    // Draw all bunkers
    for (const bunker of bunkers) {
      if (bunker.alive) {
        // Use pre-rendered image based on alignment
        const align = (bunker.x + bunker.y) & 1
        const variant = align === 0 ? 'background1' : 'background2'
        const bunkerSprite = spriteService.getBunkerSprite(
          bunker.kind,
          bunker.rotation,
          { variant: variant as 'background1' | 'background2' }
        )

        const bunkerBitmap: MonochromeBitmap = bunkerSprite.bitmap

        renderedBitmap = drawBunker({
          x: bunker.x,
          y: bunker.y,
          def: bunkerBitmap
        })(renderedBitmap)
      }
    }

    // Draw explosions if any are active
    if (anyExplosionActive) {
      const extendedState = finalState as ExtendedGameState

      // Get shard images from sprites - only getSprite is used by drawExplosions
      const shardImages = {
        kinds: {} as Record<number, Record<number, ShardSprite>>,
        getSprite: (kind: number, rotation: number) => {
          const def = spriteService.getShardSprite(kind, rotation, {
            variant: 'def'
          })
          const mask = spriteService.getShardSprite(kind, rotation, {
            variant: 'mask'
          })
          const bg1 = spriteService.getShardSprite(kind, rotation, {
            variant: 'background1'
          })
          const bg2 = spriteService.getShardSprite(kind, rotation, {
            variant: 'background2'
          })
          return {
            def: def.uint8,
            mask: mask.uint8,
            images: {
              background1: bg1.uint8,
              background2: bg2.uint8
            }
          }
        }
      } as ShardSpriteSet

      renderedBitmap = drawExplosions({
        explosions: extendedState.explosions,
        screenx: extendedState.screen.screenx,
        screeny: extendedState.screen.screeny,
        worldwidth: extendedState.planet.worldwidth,
        worldwrap: extendedState.planet.worldwrap,
        shardImages
      })(renderedBitmap)
    }

    // Instructions text would go here, but we need to implement drawSmall first
    // Keys:
    // 1-8: WALL rotations 0-7 (N to SSE)
    // Q-I: WALL rotations 8-15 (S to NNW)
    // A-K: DIFF rotations 0-7
    // Z-M,comma: DIFF rotations 8-15
    // O: GROUND (omnidirectional)
    // P: FOLLOW (omnidirectional)
    // L: GENERATOR (omnidirectional)

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)
  }
