/**
 * Bitmap to canvas conversion functions
 */

import type { MonochromeBitmap, BitmapToCanvasOptions } from './types'
import { createBitmapFromCanvas } from './create'

/**
 * Convert monochrome bitmap to ImageData
 */
export const bitmapToImageData = (
  bitmap: MonochromeBitmap,
  options: BitmapToCanvasOptions = {}
): ImageData => {
  const { foregroundColor = 'black', backgroundColor = 'white' } = options

  // Parse colors to RGB
  const fg = parseColor(foregroundColor)
  const bg = parseColor(backgroundColor)

  // Create ImageData
  const imageData = new ImageData(bitmap.width, bitmap.height)
  const pixels = imageData.data

  // Convert each pixel
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
      const bitMask = 0x80 >> x % 8
      const isSet =
        byteIndex < bitmap.data.length &&
        (bitmap.data[byteIndex]! & bitMask) !== 0

      const pixelIndex = (y * bitmap.width + x) * 4
      const color = isSet ? fg : bg

      pixels[pixelIndex] = color.r
      pixels[pixelIndex + 1] = color.g
      pixels[pixelIndex + 2] = color.b
      pixels[pixelIndex + 3] = 255 // Full opacity
    }
  }

  return imageData
}

/**
 * Main conversion function - bitmap to canvas
 */
export const bitmapToCanvas = (
  bitmap: MonochromeBitmap,
  ctx: CanvasRenderingContext2D,
  options: BitmapToCanvasOptions = {}
): void => {
  const {
    conversionMethod = 'imagedata',
    foregroundColor = 'black',
    backgroundColor = 'white'
  } = options

  switch (conversionMethod) {
    case 'imagedata':
      renderViaImageData(bitmap, ctx, options)
      break

    case 'fillrect':
      renderViaFillRect(bitmap, ctx, foregroundColor, backgroundColor)
      break
  }
}

/**
 * Convert canvas content to monochrome bitmap
 */
export const canvasToBitmap = (
  ctx: CanvasRenderingContext2D,
  x: number = 0,
  y: number = 0,
  width?: number,
  height?: number,
  threshold: number = 128
): MonochromeBitmap => {
  // Use the create utility we already have
  return createBitmapFromCanvas(ctx, x, y, width, height, threshold)
}

// Helper functions

/**
 * Render bitmap using ImageData (fast for full-screen updates)
 */
const renderViaImageData = (
  bitmap: MonochromeBitmap,
  ctx: CanvasRenderingContext2D,
  options: BitmapToCanvasOptions
): void => {
  const imageData = bitmapToImageData(bitmap, options)
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Render bitmap using fillRect (useful for debugging)
 */
const renderViaFillRect = (
  bitmap: MonochromeBitmap,
  ctx: CanvasRenderingContext2D,
  foregroundColor: string,
  backgroundColor: string
): void => {
  // First fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, bitmap.width, bitmap.height)

  // Then draw set pixels
  ctx.fillStyle = foregroundColor

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
      const bitMask = 0x80 >> x % 8

      if (
        byteIndex < bitmap.data.length &&
        (bitmap.data[byteIndex]! & bitMask) !== 0
      ) {
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

/**
 * Parse color string to RGB
 */
const parseColor = (color: string): { r: number; g: number; b: number } => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex.charAt(0) + hex.charAt(0), 16),
        g: parseInt(hex.charAt(1) + hex.charAt(1), 16),
        b: parseInt(hex.charAt(2) + hex.charAt(2), 16)
      }
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      }
    }
  }

  // Handle named colors (basic set)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 }
  }

  return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0 }
}
