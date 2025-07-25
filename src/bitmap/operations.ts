/**
 * Basic bitmap manipulation operations
 */

import type { MonochromeBitmap, Rectangle } from './types'

/**
 * Clear bitmap to all white (all bits off)
 */
export const clearBitmap = (bitmap: MonochromeBitmap): void => {
  bitmap.data.fill(0)
}

/**
 * Fill bitmap to all black (all bits on)
 */
export const fillBitmap = (bitmap: MonochromeBitmap): void => {
  bitmap.data.fill(0xff)
}

/**
 * Copy a region from one bitmap to another
 */
export const copyBitmapRegion = (
  source: MonochromeBitmap,
  dest: MonochromeBitmap,
  sourceRect: Rectangle,
  destX: number,
  destY: number
): void => {
  const { x: srcX, y: srcY, width, height } = sourceRect

  // Bounds checking
  const copyWidth = Math.min(width, dest.width - destX, source.width - srcX)
  const copyHeight = Math.min(height, dest.height - destY, source.height - srcY)

  if (copyWidth <= 0 || copyHeight <= 0) return

  // Copy row by row
  for (let y = 0; y < copyHeight; y++) {
    const srcRow = srcY + y
    const destRow = destY + y

    // Handle byte-aligned case (fast path)
    if (srcX % 8 === 0 && destX % 8 === 0 && copyWidth % 8 === 0) {
      const srcByteOffset = srcRow * source.rowBytes + srcX / 8
      const destByteOffset = destRow * dest.rowBytes + destX / 8
      const bytesToCopy = copyWidth / 8

      for (let i = 0; i < bytesToCopy; i++) {
        if (
          destByteOffset + i < dest.data.length &&
          srcByteOffset + i < source.data.length
        ) {
          dest.data[destByteOffset + i] = source.data[srcByteOffset + i]!
        }
      }
    } else {
      // Handle unaligned case (bit by bit)
      for (let x = 0; x < copyWidth; x++) {
        if (getPixel(source, srcX + x, srcRow)) {
          setPixel(dest, destX + x, destRow)
        } else {
          clearPixel(dest, destX + x, destRow)
        }
      }
    }
  }
}

/**
 * Set a single pixel (turn bit on)
 */
export const setPixel = (
  bitmap: MonochromeBitmap,
  x: number,
  y: number
): void => {
  if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) return

  const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> x % 8
  if (byteIndex < bitmap.data.length) {
    bitmap.data[byteIndex]! |= bitMask
  }
}

/**
 * Clear a single pixel (turn bit off)
 */
export const clearPixel = (
  bitmap: MonochromeBitmap,
  x: number,
  y: number
): void => {
  if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) return

  const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> x % 8
  if (byteIndex < bitmap.data.length) {
    bitmap.data[byteIndex]! &= ~bitMask
  }
}

/**
 * XOR a pixel (toggle bit)
 */
export const xorPixel = (
  bitmap: MonochromeBitmap,
  x: number,
  y: number
): void => {
  if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) return

  const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> x % 8
  if (byteIndex < bitmap.data.length) {
    bitmap.data[byteIndex]! ^= bitMask
  }
}

/**
 * Get pixel value
 */
export const getPixel = (
  bitmap: MonochromeBitmap,
  x: number,
  y: number
): boolean => {
  if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) return false

  const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> x % 8
  return (
    byteIndex < bitmap.data.length && (bitmap.data[byteIndex]! & bitMask) !== 0
  )
}
