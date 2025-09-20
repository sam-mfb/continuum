import React from 'react'
import { Provider } from 'react-redux'
import GameCanvas from './components/GameCanvas'
import { store } from './store'
import { loadLevel } from './levelManager'
import type { BitmapRenderer } from '@lib/bitmap'

type AppProps = {
  renderer: BitmapRenderer
  totalLevels: number
}

const App: React.FC<AppProps> = ({ renderer, totalLevels }) => {
  return (
    <Provider store={store}>
      <GameCanvas
        renderer={renderer}
        width={512}
        height={342}
        scale={2} // Pixel-doubled like the demos
        fps={20} // Original Continuum runs at 20 FPS
        totalLevels={totalLevels}
        onLevelSelect={(level: number) => {
          loadLevel(store, level)
        }}
      />
    </Provider>
  )
}

export default App
