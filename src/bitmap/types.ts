/**
 * Core types for bitmap manipulation and rendering
 */

import type { GameFrameInfo, GameEnvironment } from '../app/components/GameView'

// Re-export MonochromeBitmap for convenience
export type { MonochromeBitmap } from '../walls/types'

/**
 * Function that renders to a monochrome bitmap
 */
export type BitmapRenderer = (
  bitmap: MonochromeBitmap,
  frame: GameFrameInfo,
  env: GameEnvironment
) => void

/**
 * Options for converting bitmap to canvas
 */
export type BitmapToCanvasOptions = {
  /** Color for set pixels (1s) */
  foregroundColor?: string // Default: 'black'
  /** Color for unset pixels (0s) */
  backgroundColor?: string // Default: 'white'
  /** Conversion method to use */
  conversionMethod?: 'imagedata' | 'fillrect' // Default: 'imagedata'
}

/**
 * Rectangle type for region operations
 */
export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}
