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
  // Create transition callbacks for headless mode
  // In headless mode, we skip the fizz animation and treat it as instantly complete
  const transitionCallbacks = {
    isInitialized: (): boolean => true, // Always initialized in headless mode
    isComplete: (): boolean => true, // Always complete in headless mode (skip animation)
    reset: (): void => {
      // No-op in headless mode
    }
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
