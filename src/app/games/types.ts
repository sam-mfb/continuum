import type { BitmapRenderer } from '../../bitmap'
import type { PlanetState } from '../../planet/types'
import type { WallsState } from '../../walls/types'
import type { GameViewState } from '../../store/gameViewSlice'
import type { AppDispatch } from '../../store/store'

/**
 * Narrow store interface for game renderers.
 * Only includes the slices needed by the renderer.
 */
export type GameRendererStore = {
  getState(): {
    walls: WallsState
    gameView: GameViewState
  }
  dispatch: AppDispatch
}

/**
 * Factory function type for creating planet-specific renderers
 */
export type PlanetRendererFactory = (
  planet: PlanetState,
  store: GameRendererStore
) => BitmapRenderer
