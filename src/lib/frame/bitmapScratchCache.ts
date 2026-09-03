/**
 * @fileoverview Cache of the scratch canvas bitmap layers are blitted from.
 *
 * A bitmap layer supplies fresh pixel data every frame, so there is nothing
 * stable to cache the way sprite canvases are - but the scratch canvas the
 * data is put into can be reused instead of allocated per draw, which is
 * what matters: at 20fps a per-draw allocation churns through canvas backing
 * stores and shows up as stalls mid-game.
 */

type BitmapScratch = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

/**
 * The scratch canvas bitmap layers are blitted from, built on first use.
 *
 * Owned by whoever calls drawFrameToCanvas - create one alongside the canvas
 * being drawn to and pass the same one every frame, so the draw function
 * itself holds no state.
 */
export type BitmapScratchCache = {
  cache: BitmapScratch | null
}

export function createBitmapScratchCache(): BitmapScratchCache {
  return { cache: null }
}

/**
 * Returns the scratch canvas sized to these dimensions, building it on first
 * use and resizing it when a layer of a different size comes along.
 */
export function getBitmapScratch(
  bitmapScratchCache: BitmapScratchCache,
  width: number,
  height: number
): BitmapScratch {
  let scratch = bitmapScratchCache.cache
  if (scratch === null) {
    const canvas = document.createElement('canvas')
    scratch = { canvas, ctx: canvas.getContext('2d')! }
    bitmapScratchCache.cache = scratch
  }

  if (scratch.canvas.width !== width || scratch.canvas.height !== height) {
    scratch.canvas.width = width
    scratch.canvas.height = height
  }

  return scratch
}
