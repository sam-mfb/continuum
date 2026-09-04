/**
 * @fileoverview Cache of the crosshatch pattern tiles rects are filled from.
 *
 * Cached for the same reason sprite canvases are: building a tile per draw
 * churns through canvas backing stores at 20fps.
 */

/**
 * Crosshatch tiles the renderer fills from, keyed by alignment and scale.
 * Caller-owned on the same terms as SpriteCanvasCache.
 */
export type PatternTileCache = {
  cache: Map<string, HTMLCanvasElement>
}

export function createPatternTileCache(): PatternTileCache {
  return { cache: new Map() }
}

/**
 * Returns the crosshatch tile for this alignment and scale, building it on
 * first use.
 */
export function getPatternTile(
  patternTileCache: PatternTileCache,
  alignment: number,
  scale: number
): HTMLCanvasElement {
  const key = `${alignment}-${scale}`
  const cached = patternTileCache.cache.get(key)
  if (cached) return cached

  // Build the tile at 1:1 first, then scale it up
  const unscaledCanvas = document.createElement('canvas')
  unscaledCanvas.width = 32
  unscaledCanvas.height = 2
  const unscaledCtx = unscaledCanvas.getContext('2d')!
  const patternData = unscaledCtx.createImageData(32, 2)

  // Pattern 0: 0xaaaaaaaa (binary: 10101010...) - alternating pixels horizontally
  // Pattern 1: 0x55555555 (binary: 01010101...) - inverse alternating pixels
  // The pattern alternates by scanline (row), creating a diagonal checkerboard
  const firstPattern = alignment === 0 ? 0xaaaaaaaa : 0x55555555
  const secondPattern = alignment === 0 ? 0x55555555 : 0xaaaaaaaa

  // Fill first row (32 pixels using firstPattern)
  for (let x = 0; x < 32; x++) {
    const bit = (firstPattern >>> (31 - x)) & 1
    const color = bit ? 0 : 255 // bit 1 = black, bit 0 = white
    const idx = x * 4
    patternData.data[idx] = color // R
    patternData.data[idx + 1] = color // G
    patternData.data[idx + 2] = color // B
    patternData.data[idx + 3] = 255 // A
  }

  // Fill second row (32 pixels using secondPattern)
  for (let x = 0; x < 32; x++) {
    const bit = (secondPattern >>> (31 - x)) & 1
    const color = bit ? 0 : 255 // bit 1 = black, bit 0 = white
    const idx = (32 + x) * 4 // Second row starts at pixel 32
    patternData.data[idx] = color // R
    patternData.data[idx + 1] = color // G
    patternData.data[idx + 2] = color // B
    patternData.data[idx + 3] = 255 // A
  }

  unscaledCtx.putImageData(patternData, 0, 0)

  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = 32 * scale // Scale the pattern width
  patternCanvas.height = 2 * scale // Scale the pattern height
  const patternCtx = patternCanvas.getContext('2d')!
  patternCtx.imageSmoothingEnabled = false // Keep pixels crisp
  patternCtx.drawImage(unscaledCanvas, 0, 0, 32 * scale, 2 * scale)

  patternTileCache.cache.set(key, patternCanvas)
  return patternCanvas
}
