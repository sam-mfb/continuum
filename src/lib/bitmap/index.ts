/**
 * Bitmap module exports
 */

// Types
export type {
  MonochromeBitmap,
  BitmapRenderer,
  LegacyBitmapRenderer,
  BitmapToCanvasOptions,
  Rectangle,
  FrameInfo,
  KeyInfo,
  GameFrameInfo,
  GameEnvironment
} from './types'

// Creation utilities
export {
  createMonochromeBitmap,
  createGameBitmap,
  createBitmapFromCanvas,
  cloneBitmap
} from './create'

// Operations
export {
  clearBitmap,
  fillBitmap,
  copyBitmapRegion,
  setPixel,
  clearPixel,
  xorPixel,
  getPixel
} from './operations'

// Conversion
export { bitmapToImageData, bitmapToCanvas, canvasToBitmap } from './conversion'
