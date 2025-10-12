import type { SpriteRegistry, SpriteRegistryId } from './types'

type SpriteDefinition = {
  id: SpriteRegistryId
  path: string
}

export function createSpriteRegistryCanvas(): SpriteRegistry<ImageData> {
  const definitions: Record<SpriteRegistryId, string> = {}
  const loadedSprites: Record<SpriteRegistryId, ImageData> = {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  return {
    addSprite: (args): void => {
      definitions[args.id] = args.path
    },
    getSprite: (id): ImageData => {
      const imageData = loadedSprites[id]
      if (!imageData) {
        if (definitions[id]) {
          throw new Error(
            `Sprite '${id}' is registered but not loaded. Call loadSprites() first.`
          )
        }
        throw new Error(
          `No sprite matching id '${id}' found in sprite registry`
        )
      }
      return imageData
    },
    loadSprites: async (): Promise<void> => {
      const loadPromises = Object.entries(definitions).map(([id, path]) => {
        // Skip if already loaded
        if (loadedSprites[id]) {
          return Promise.resolve()
        }

        return new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.src = path

          img.onload = (): void => {
            canvas.width = img.width
            canvas.height = img.height
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)
            loadedSprites[id] = ctx.getImageData(0, 0, img.width, img.height)
            resolve()
          }

          img.onerror = (): void => {
            reject(
              new Error(`Failed to load sprite '${id}' from path: ${path}`)
            )
          }
        })
      })

      await Promise.all(loadPromises)
    },
    unloadSprites: (): void => {
      // Clear all loaded sprites from memory
      for (const key in loadedSprites) {
        delete loadedSprites[key]
      }
    }
  }
}

export function addMultipleSprites(
  registry: SpriteRegistry<ImageData>,
  sprites: SpriteDefinition[]
): void {
  sprites.forEach(sprite => registry.addSprite(sprite))
}
