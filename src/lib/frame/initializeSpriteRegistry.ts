import {
  createSpriteRegistryCanvas,
  addMultipleSprites
} from './spriteRegistryCanvas'
import type { SpriteRegistry } from './types'

const SPRITES_BASE_PATH = '/assets/sprites_bw'

/**
 * Initialize sprite registry with all sprites from the sprites_bw directory
 * Excludes title-page.png as it's loaded separately
 */
export async function initializeSpriteRegistry(): Promise<
  SpriteRegistry<ImageData>
> {
  const registry = createSpriteRegistryCanvas()

  // Generate sprite definitions from known naming patterns
  const spriteDefinitions: Array<{ id: string; path: string }> = []

  // We'll need to enumerate the sprites manually or use a build-time script
  // For now, let's use a pattern-based approach for the known sprite types

  // Bunker sprites
  const bunkerTypes = ['diff', 'follow', 'generator', 'shoot', 'smart']
  const bunkerMaxFrames: Record<string, number> = {
    diff: 3,
    follow: 8,
    generator: 6,
    shoot: 4,
    smart: 4
  }

  for (const type of bunkerTypes) {
    const maxFrame = bunkerMaxFrames[type] ?? 0
    for (let i = 0; i < maxFrame; i++) {
      const frameStr = i.toString().padStart(2, '0')
      const id = `bunker-${type}-${frameStr}`
      spriteDefinitions.push({
        id,
        path: `${SPRITES_BASE_PATH}/bunker-${type}-${frameStr}.png`
      })
    }
  }

  // Crater sprites
  const craterTypes = ['half', 'large', 'medium', 'small']
  for (const type of craterTypes) {
    const id = `crater-${type}`
    spriteDefinitions.push({
      id,
      path: `${SPRITES_BASE_PATH}/crater-${type}.png`
    })
  }

  // Explosion sprites (shards)
  for (let i = 0; i < 20; i++) {
    const frameStr = i.toString().padStart(2, '0')
    const id = `explosion-shard-${frameStr}`
    spriteDefinitions.push({
      id,
      path: `${SPRITES_BASE_PATH}/explosion-shard-${frameStr}.png`
    })
  }

  // Fuel sprites
  for (let i = 0; i < 4; i++) {
    const frameStr = i.toString().padStart(2, '0')
    const id = `fuel-${frameStr}`
    spriteDefinitions.push({
      id,
      path: `${SPRITES_BASE_PATH}/fuel-${frameStr}.png`
    })
  }

  // Ship sprites (36 rotations)
  for (let i = 0; i < 36; i++) {
    const frameStr = i.toString().padStart(2, '0')
    const id = `ship-${frameStr}`
    spriteDefinitions.push({
      id,
      path: `${SPRITES_BASE_PATH}/ship-${frameStr}.png`
    })
  }

  // Ship thrust sprites (36 rotations)
  for (let i = 0; i < 36; i++) {
    const frameStr = i.toString().padStart(2, '0')
    const id = `ship-thrust-${frameStr}`
    spriteDefinitions.push({
      id,
      path: `${SPRITES_BASE_PATH}/ship-thrust-${frameStr}.png`
    })
  }

  // Add all sprites to registry
  addMultipleSprites(registry, spriteDefinitions)

  // Load all sprites into memory
  await registry.loadSprites()

  return registry
}
