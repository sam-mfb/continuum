// Main exports for the figure/sprite management module

export * from './types'
export * from './extract'
export * from './rotate'
export * from './shipSprites'
export * from './bunkerSprites'
export * from './fuelSprites'
export * from './shardSprites'
export * from './craterSprites'

// Re-export key functions for convenience
export { extractAllSprites } from './extract'
export { createShipSpriteSet } from './shipSprites'
export { createBunkerSpriteSet } from './bunkerSprites'
export { createFuelSpriteSet } from './fuelSprites'
export { createShardSpriteSet } from './shardSprites'
export { processCraterSprite } from './craterSprites'

// Re-export debug helpers
export { shipSpriteToAscii } from './shipSprites'
export { bunkerSpriteToAscii } from './bunkerSprites'
export { fuelSpriteToAscii } from './fuelSprites'
export { shardSpriteToAscii } from './shardSprites'
export { craterSpriteToAscii } from './craterSprites'
