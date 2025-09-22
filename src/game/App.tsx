import React from 'react'
import { useStore } from 'react-redux'
import GameCanvas from './components/GameCanvas'
import { loadLevel } from './levelManager'
import type { BitmapRenderer } from '@lib/bitmap'
import type { GalaxyService } from '@core/galaxy'
import type { GameStore } from './store'

type AppProps = {
  renderer: BitmapRenderer
  totalLevels: number
  galaxyService: GalaxyService
}

const App: React.FC<AppProps> = ({ renderer, totalLevels, galaxyService }) => {
  const store = useStore() as GameStore

  return (
    <GameCanvas
      renderer={renderer}
      width={512}
      height={342}
      scale={2} // Pixel-doubled like the demos
      fps={20} // Original Continuum runs at 20 FPS
      totalLevels={totalLevels}
      onLevelSelect={(level: number) => {
        loadLevel(store, level, galaxyService)
      }}
    />
  )
}

export default App
