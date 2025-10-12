import type { SpriteRegistry, SpriteRegistryId } from './types'

export function createSpriteRegistryCanvas(): SpriteRegistry<ImageData> {
  const registry: Record<SpriteRegistryId, ImageData> = {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  return {
    addSprite: (args): void => {
      const img = new Image()
      img.src = args.path

      img.onload = (): void => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        registry[args.id] = ctx.getImageData(0, 0, img.width, img.height)
      }

      img.onerror = (): void => {
        throw new Error(`Failed to load sprite from path: ${args.path}`)
      }
    },
    getSprite: (id): ImageData => {
      const imageData = registry[id]
      if (!imageData) {
        throw new Error(`No sprite matching id ${id} found in sprite registry`)
      }
      return imageData
    }
  }
}
