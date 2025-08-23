import type { ReactNode } from 'react'
import { SpriteServiceContext } from './context'
import type { SpriteService } from './types'

type SpriteServiceProviderProps = {
  service: SpriteService
  children: ReactNode
}

export function SpriteServiceProvider({
  service,
  children
}: SpriteServiceProviderProps): React.JSX.Element {
  return (
    <SpriteServiceContext.Provider value={service}>
      {children}
    </SpriteServiceContext.Provider>
  )
}
