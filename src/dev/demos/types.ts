import type { BitmapRenderer } from '@lib/bitmap'
import type { PlanetState } from '@core/planet'
import type { WallsState } from '@core/walls'
import type { GameViewState } from '@dev/store'
import type { ScreenState } from '@core/screen'
import type { AppDispatch } from '@dev/store'
import type { SpriteService } from '@core/sprites'

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
  spriteService: SpriteService
) => BitmapRenderer
