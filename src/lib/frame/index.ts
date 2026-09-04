export type { Frame, SpriteRegistry } from './types'
export { drawFrameToCanvas } from './drawFrameToCanvas'
export {
  createSpriteCanvasCache,
  type SpriteCanvasCache
} from './spriteCanvasCache'
export {
  createPatternTileCache,
  type PatternTileCache
} from './patternTileCache'
export {
  createBitmapScratchCache,
  type BitmapScratchCache
} from './bitmapScratchCache'
export {
  createSpriteRegistryCanvas,
  addMultipleSprites
} from './spriteRegistryCanvas'
export { initializeSpriteRegistry } from './initializeSpriteRegistry'
export { cloneFrame } from './cloneFrame'
