import type { BitmapRenderer } from '@lib/bitmap'
import type { PlanetState } from '@core/planet/types'
import type { WallsState } from '@core/walls/types'
import type { GameViewState } from '@dev/store/gameViewSlice'
import type { ScreenState } from '@core/screen/types'
import type { AppDispatch } from '@dev/store/store'
import type { SpriteServiceV2 } from '@core/sprites/service'

/**
 * Narrow store interface for game renderers.
 * Only includes the slices needed by the renderer.
 */
export type GameRendererStore = {
  getState(): {
    walls: WallsState
    gameView: GameViewState
    screen: ScreenState
  }
  dispatch: AppDispatch
}

/**
 * Factory function type for creating planet-specific renderers
 */
export type PlanetRendererFactory = (
  planet: PlanetState,
  store: GameRendererStore,
  spriteService: SpriteServiceV2
) => BitmapRenderer
