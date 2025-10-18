/**
 * Planet Renderer Factory
 *
 * Creates planet-specific bitmap renderers using the game rendering approach
 */

import type { PlanetRendererFactory, GameRendererStore } from './types'
import type { PlanetState } from '@core/planet'
import type { BitmapRenderer, FrameInfo, KeyInfo } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import { whiteTerrain, blackTerrain } from '@render/walls'
import { wallsActions } from '@core/walls'
import { screenSlice } from '@core/screen'
import { gameViewSlice } from '@dev/store'
const gameViewActions = gameViewSlice.actions
import { LINE_KIND } from '@core/walls'
import { VIEWHT } from '@core/screen'
import { isOnRightSide } from '@core/shared/viewport'
import { doBunks } from '@render/planet'
import { configureStore } from '@reduxjs/toolkit'
import {
  planetSlice,
  loadPlanet,
  updateBunkerRotations,
  initializeFuels,
  updateFuelAnimations
} from '@core/planet'
import { drawFuels } from '@render/planet'
import { drawCraters } from '@render/planet'
import { viewClear } from '@render/screen'

// Create store with planet slice
const bunkerStore = configureStore({
  reducer: {
    planet: planetSlice.reducer
  }
})

/**
 * Creates a bitmap renderer for a specific planet
 */
export const createPlanetRenderer: PlanetRendererFactory = (
  planet: PlanetState,
  store: GameRendererStore,
  spriteService
): BitmapRenderer => {
  // Initialize walls for this planet
  store.dispatch(wallsActions.initWalls({ walls: planet.lines }))

  // Load planet data into bunker store
  bunkerStore.dispatch(loadPlanet(planet))

  // Initialize fuels with random animation states
  bunkerStore.dispatch(initializeFuels())

  // Initialize viewport to planet's starting position
  // Note: bitmap dimensions are 512x342, but viewable area is 512x318 (VIEWHT)
  const bitmapWidth = 512

  // Apply constraints based on whether planet wraps
  let initialX = planet.xstart - bitmapWidth / 2

  if (planet.worldwrap) {
    // For circular planets: ensure X is properly wrapped
    initialX =
      ((initialX % planet.worldwidth) + planet.worldwidth) % planet.worldwidth
  } else {
    // For non-circular planets: clamp X to world boundaries
    initialX = Math.max(0, Math.min(planet.worldwidth - bitmapWidth, initialX))
  }
  const initialY = Math.max(
    0,
    Math.min(planet.worldheight - VIEWHT, planet.ystart - VIEWHT / 2)
  )

  store.dispatch(screenSlice.actions.setPosition({ x: initialX, y: initialY }))
  store.dispatch(gameViewActions.setInitialized())

  // Return the renderer function
  const renderer: BitmapRenderer = (_frame: FrameInfo, keys: KeyInfo) => {
    const bitmap = createGameBitmap()
    const state = store.getState()
    const { walls, gameView, screen } = state

    // If viewport is not initialized, ensure we use the initial viewport
    if (!gameView.initialized) {
      store.dispatch(
        screenSlice.actions.setPosition({ x: initialX, y: initialY })
      )
      store.dispatch(gameViewActions.setInitialized())
      // Return empty bitmap for first frame to avoid jump
      const emptyBitmap = { ...bitmap }
      emptyBitmap.data.fill(0)
      return emptyBitmap
    }

    // Handle keyboard input for viewport movement
    const moveSpeed = 5
    let dx = 0
    let dy = 0

    if (keys.keysDown.has('ArrowUp')) {
      dy = -moveSpeed
    }
    if (keys.keysDown.has('ArrowDown')) {
      dy = moveSpeed
    }
    if (keys.keysDown.has('ArrowLeft')) {
      dx = -moveSpeed
    }
    if (keys.keysDown.has('ArrowRight')) {
      dx = moveSpeed
    }

    // Update viewport if there's movement
    if (dx !== 0 || dy !== 0) {
      let newX = screen.screenx + dx
      let newY = screen.screeny + dy

      if (planet.worldwrap) {
        // For circular planets: wrap X coordinate
        newX =
          ((newX % planet.worldwidth) + planet.worldwidth) % planet.worldwidth
      } else {
        // For non-circular planets: clamp X to world boundaries
        newX = Math.max(0, Math.min(planet.worldwidth - bitmap.width, newX))
      }

      // Always clamp Y for all planets (no vertical wrapping)
      // Use VIEWHT instead of bitmap.height to account for status bar
      newY = Math.max(0, Math.min(planet.worldheight - VIEWHT, newY))

      store.dispatch(screenSlice.actions.setPosition({ x: newX, y: newY }))
    }

    // Get updated viewport after potential movement
    const currentScreen = store.getState().screen

    // Create crosshatch gray background using viewClear
    let renderedBitmap = viewClear({
      screenX: currentScreen.screenx,
      screenY: currentScreen.screeny
    })(bitmap)

    // Set up viewport for rendering
    const viewport = {
      x: currentScreen.screenx,
      y: currentScreen.screeny,
      b: currentScreen.screeny + bitmap.height, // bottom
      r: currentScreen.screenx + bitmap.width // right
    }

    // First render white terrain (undersides, patches, junctions)
    renderedBitmap = whiteTerrain({
      whites: walls.whites,
      junctions: walls.junctions,
      firstWhite: walls.firstWhite,
      organizedWalls: walls.organizedWalls,
      viewport: viewport,
      worldwidth: planet.worldwidth
    })(renderedBitmap)

    // Then render black terrain (top surfaces) for each wall type
    // Render in order: NORMAL, BOUNCE, GHOST, XPLODE
    const wallKinds = [
      LINE_KIND.NORMAL,
      LINE_KIND.BOUNCE,
      LINE_KIND.GHOST,
      LINE_KIND.EXPLODE
    ]

    for (const kind of wallKinds) {
      renderedBitmap = blackTerrain({
        thekind: kind,
        kindPointers: walls.kindPointers,
        organizedWalls: walls.organizedWalls,
        viewport: viewport,
        worldwidth: planet.worldwidth
      })(renderedBitmap)
    }

    // Keep track of the result
    let resultBitmap = renderedBitmap

    // Draw bunkers and other sprites
    {
      // Update bunker rotations for animated bunkers
      // Use planet center as a mock ship position for FOLLOW bunkers
      const globalx = currentScreen.screenx + bitmap.width / 2
      const globaly = currentScreen.screeny + bitmap.height / 2
      bunkerStore.dispatch(updateBunkerRotations({ globalx, globaly }))

      // Get updated planet state with rotated bunkers
      const planetState = bunkerStore.getState().planet

      // Draw bunkers at normal position (Bunkers.c:46 - "do_bunks(screenx, screeny);")
      resultBitmap = doBunks({
        bunkrec: planetState.bunkers,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        getSprite: (kind, rotation) => {
          const def = spriteService.getBunkerSprite(kind, rotation, {
            variant: 'def'
          })
          const mask = spriteService.getBunkerSprite(kind, rotation, {
            variant: 'mask'
          })
          const bg1 = spriteService.getBunkerSprite(kind, rotation, {
            variant: 'background1'
          })
          const bg2 = spriteService.getBunkerSprite(kind, rotation, {
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
      })(resultBitmap)

      // Second pass - wrapped position (Bunkers.c:47-48)
      // "if (on_right_side) do_bunks(screenx-worldwidth, screeny);"
      const onRightSide = isOnRightSide(
        currentScreen.screenx,
        bitmap.width,
        planet.worldwidth,
        planet.worldwrap
      )

      if (onRightSide) {
        resultBitmap = doBunks({
          bunkrec: planetState.bunkers,
          scrnx: currentScreen.screenx - planet.worldwidth,
          scrny: currentScreen.screeny,
          getSprite: (kind, rotation) => {
            const def = spriteService.getBunkerSprite(kind, rotation, {
              variant: 'def'
            })
            const mask = spriteService.getBunkerSprite(kind, rotation, {
              variant: 'mask'
            })
            const bg1 = spriteService.getBunkerSprite(kind, rotation, {
              variant: 'background1'
            })
            const bg2 = spriteService.getBunkerSprite(kind, rotation, {
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
        })(resultBitmap) // Pass already-rendered bitmap
      }

      // Continue with fuel rendering

      // Update fuel cell animations
      bunkerStore.dispatch(updateFuelAnimations())

      // Get updated planet state with animated fuels
      const updatedPlanetState = bunkerStore.getState().planet

      // Draw fuels at normal position
      resultBitmap = drawFuels({
        fuels: updatedPlanetState.fuels,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        fuelSprites: {
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          emptyCell: (() => {
            const empty = spriteService.getFuelSprite(8, { variant: 'def' })
            const emptyMask = spriteService.getFuelSprite(8, {
              variant: 'mask'
            })
            const emptyBg1 = spriteService.getFuelSprite(8, {
              variant: 'background1'
            })
            const emptyBg2 = spriteService.getFuelSprite(8, {
              variant: 'background2'
            })
            return {
              def: empty.uint8,
              mask: emptyMask.uint8,
              images: {
                background1: emptyBg1.uint8,
                background2: emptyBg2.uint8
              }
            }
          })(),
          getFrame: (index: number) => {
            const def = spriteService.getFuelSprite(index, { variant: 'def' })
            const mask = spriteService.getFuelSprite(index, { variant: 'mask' })
            const bg1 = spriteService.getFuelSprite(index, {
              variant: 'background1'
            })
            const bg2 = spriteService.getFuelSprite(index, {
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
        }
      })(resultBitmap)

      // If wrapping world and near right edge, draw wrapped fuels
      if (onRightSide) {
        resultBitmap = drawFuels({
          fuels: updatedPlanetState.fuels,
          scrnx: currentScreen.screenx - planet.worldwidth,
          scrny: currentScreen.screeny,
          fuelSprites: {
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            emptyCell: (() => {
              const empty = spriteService.getFuelSprite(8, { variant: 'def' })
              const emptyMask = spriteService.getFuelSprite(8, {
                variant: 'mask'
              })
              const emptyBg1 = spriteService.getFuelSprite(8, {
                variant: 'background1'
              })
              const emptyBg2 = spriteService.getFuelSprite(8, {
                variant: 'background2'
              })
              return {
                def: empty.uint8,
                mask: emptyMask.uint8,
                images: {
                  background1: emptyBg1.uint8,
                  background2: emptyBg2.uint8
                }
              }
            })(),
            getFrame: (index: number) => {
              const def = spriteService.getFuelSprite(index, { variant: 'def' })
              const mask = spriteService.getFuelSprite(index, {
                variant: 'mask'
              })
              const bg1 = spriteService.getFuelSprite(index, {
                variant: 'background1'
              })
              const bg2 = spriteService.getFuelSprite(index, {
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
          }
        })(resultBitmap)
      }

      // Draw craters (world wrapping is handled internally by drawCraters)
      resultBitmap = drawCraters({
        craters: updatedPlanetState.craters,
        numcraters: updatedPlanetState.numcraters,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        worldwidth: planet.worldwidth,
        on_right_side: onRightSide,
        craterImages: {
          background1: spriteService.getCraterSprite({ variant: 'background1' })
            .uint8,
          background2: spriteService.getCraterSprite({ variant: 'background2' })
            .uint8
        }
      })(resultBitmap)
    }

    return resultBitmap
  }

  return renderer
}
