import { createContext } from 'react'
import type { SpriteService } from './types'

export const SpriteServiceContext = createContext<SpriteService | null>(null)
