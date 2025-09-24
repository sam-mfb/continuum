/**
 * Bitmap creation utilities
 */

import type { MonochromeBitmap } from './types'

/**
 * Create an empty monochrome bitmap
 */
export const createMonochromeBitmap = (
  width: number,
  height: number
): MonochromeBitmap => {
  const rowBytes = Math.ceil(width / 8)
  const data = new Uint8Array(rowBytes * height)

  return {
    data,
    width,
    height,
    rowBytes
  }
}

/**
 * Create a bitmap from existing canvas content
 * Converts to monochrome using a simple threshold
 */
export const createBitmapFromCanvas = (
  ctx: CanvasRenderingContext2D,
  x: number = 0,
  y: number = 0,
  width?: number,
  height?: number,
  threshold: number = 128
): MonochromeBitmap => {
  const w = width ?? ctx.canvas.width
  const h = height ?? ctx.canvas.height

  const imageData = ctx.getImageData(x, y, w, h)
  const bitmap = createMonochromeBitmap(w, h)

  // Convert RGBA to monochrome
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const pixelIndex = (py * w + px) * 4
      const r = imageData.data[pixelIndex] || 0
      const g = imageData.data[pixelIndex + 1] || 0
      const b = imageData.data[pixelIndex + 2] || 0

      // Simple grayscale conversion
      const gray = (r + g + b) / 3

      // Set bit if pixel is dark enough
      if (gray < threshold) {
        const byteIndex = py * bitmap.rowBytes + Math.floor(px / 8)
        const bitMask = 0x80 >> px % 8
        if (byteIndex < bitmap.data.length) {
          bitmap.data[byteIndex]! |= bitMask
        }
      }
    }
  }

  return bitmap
}

/**
 * Deep copy a bitmap
 */
export const cloneBitmap = (source: MonochromeBitmap): MonochromeBitmap => {
  return {
    data: new Uint8Array(source.data),
    width: source.width,
    height: source.height,
    rowBytes: source.rowBytes
  }
}

/**
 * Create a standard game bitmap (512x342)
 * This matches the original Macintosh screen dimensions
 */
export const createGameBitmap = (): MonochromeBitmap => {
  return createMonochromeBitmap(512, 342)
}
