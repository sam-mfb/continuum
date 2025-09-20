/**
 * GameLoop adaptation layer for bitmap rendering
 */

import type {
  GameLoopFunction,
  GameFrameInfo,
  GameEnvironment
} from '@dev/components/GameView'
import type {
  BitmapRenderer,
  MonochromeBitmap,
  BitmapToCanvasOptions
} from './types'
import { createMonochromeBitmap } from './create'
import { bitmapToCanvas } from './conversion'

/**
 * Convert a bitmap renderer to a GameLoopFunction
 */
export const createBitmapGameLoop = (
  renderer: BitmapRenderer,
  options: BitmapToCanvasOptions = {}
): GameLoopFunction => {
  // Create persistent bitmap (allocated once)
  let bitmap: MonochromeBitmap | null = null

  return (
    ctx: CanvasRenderingContext2D,
    frame: GameFrameInfo,
    env: GameEnvironment
  ) => {
    // Lazy initialize bitmap to match canvas size
    if (
      !bitmap ||
      bitmap.width !== ctx.canvas.width ||
      bitmap.height !== ctx.canvas.height
    ) {
      bitmap = createMonochromeBitmap(ctx.canvas.width, ctx.canvas.height)
    }

    // Call the bitmap renderer and get the result
    // The renderer is responsible for clearing/initializing the bitmap as needed
    const renderedBitmap = renderer(bitmap, frame, env)

    // Update the bitmap for the next frame
    bitmap = renderedBitmap

    // Convert bitmap to canvas
    bitmapToCanvas(renderedBitmap, ctx, options)
  }
}

/**
 * Wrap a bitmap renderer with conversion logic
 * This is a more explicit version that returns the bitmap for inspection
 */
export const wrapBitmapRenderer = (
  renderer: BitmapRenderer,
  options: BitmapToCanvasOptions = {}
): {
  gameLoop: GameLoopFunction
  getBitmap: () => MonochromeBitmap | null
} => {
  let bitmap: MonochromeBitmap | null = null

  const gameLoop: GameLoopFunction = (ctx, frame, env) => {
    // Lazy initialize bitmap
    if (
      !bitmap ||
      bitmap.width !== ctx.canvas.width ||
      bitmap.height !== ctx.canvas.height
    ) {
      bitmap = createMonochromeBitmap(ctx.canvas.width, ctx.canvas.height)
    }

    // Render and get the result
    // The renderer is responsible for clearing/initializing the bitmap as needed
    const renderedBitmap = renderer(bitmap, frame, env)

    // Update the stored bitmap reference for getBitmap
    bitmap = renderedBitmap

    // Convert to canvas
    bitmapToCanvas(renderedBitmap, ctx, options)
  }

  return {
    gameLoop,
    getBitmap: () => bitmap
  }
}
