/**
 * Bitmap module exports
 */

// Types
export type {
  MonochromeBitmap,
  BitmapRenderer,
  BitmapToCanvasOptions,
  Rectangle
} from './types'

// Creation utilities
export {
  createMonochromeBitmap,
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

// Adapter
export { createBitmapGameLoop, wrapBitmapRenderer } from './adapter'
