import { useContext } from 'react'
import { SpriteServiceContext } from './context'
import type { SpriteService } from './types'

export function useSpriteService(): SpriteService {
  const service = useContext(SpriteServiceContext)
  if (!service) {
    throw new Error(
      'useSpriteService must be used within SpriteServiceProvider'
    )
  }
  return service
}
