export type {
  Frame,
  PatternTileCache,
  SpriteCanvasCache,
  SpriteRegistry
} from './types'
export {
  drawFrameToCanvas,
  createSpriteCanvasCache,
  createPatternTileCache
} from './drawFrameToCanvas'
export {
  createSpriteRegistryCanvas,
  addMultipleSprites
} from './spriteRegistryCanvas'
export { initializeSpriteRegistry } from './initializeSpriteRegistry'
export { cloneFrame } from './cloneFrame'
