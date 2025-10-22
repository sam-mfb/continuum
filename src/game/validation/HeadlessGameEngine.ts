import type { HeadlessStore } from './createHeadlessStore'
import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo } from '@lib/bitmap'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import { updateGameState } from '@/game/gameLoop/stateUpdates'

type HeadlessGameEngine = {
  step: (frameCount: number, controls: ControlMatrix) => void
}

const createHeadlessGameEngine = (
  store: HeadlessStore,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService,
  randomService: RandomService
): HeadlessGameEngine => {
  // Create transition callbacks for the fizz service
  const transitionCallbacks = {
    isInitialized: (): boolean => fizzTransitionService.isInitialized,
    isComplete: (): boolean => fizzTransitionService.isComplete,
    reset: (): void => fizzTransitionService.reset()
  }

  return {
    step: (frameCount, controls) => {
      // Create minimal frame info
      const frameInfo: FrameInfo = {
        frameCount,
        deltaTime: 50, // 20 FPS = 50ms per frame
        totalTime: frameCount * 50,
        targetDelta: 50
      }

      // Update game state only - no rendering needed
      updateGameState({
        store,
        frame: frameInfo,
        controls,
        galaxyService,
        transitionCallbacks,
        randomService
      })
    }
  }
}

export { createHeadlessGameEngine, type HeadlessGameEngine }
