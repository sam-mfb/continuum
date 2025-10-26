import type { HeadlessStore } from './createHeadlessStore'
import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo } from '@lib/bitmap'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import { updateGameState } from '@/game/gameLoop/stateUpdates'
import { FIZZ_DURATION } from '@core/transition'

type HeadlessGameEngine = {
  step: (frameCount: number, controls: ControlMatrix) => void
}

const createHeadlessGameEngine = (
  store: HeadlessStore,
  galaxyService: GalaxyService,
  _fizzTransitionService: FizzTransitionService,
  randomService: RandomService,
  galaxyId: string,
  initialLives: number
): HeadlessGameEngine => {
  // Track fizz state to simulate correct duration in headless mode
  let fizzFramesElapsed = 0

  // Create transition callbacks for headless mode
  // We don't render the fizz animation, but we simulate its duration
  // to keep frame numbers aligned with recordings
  const transitionCallbacks = {
    isInitialized: (): boolean => true, // Always initialized in headless mode (no bitmap needed)
    isComplete: (): boolean => {
      // Report complete after FIZZ_DURATION frames in fizz state
      // We increment after each frame in fizz, starting from frame 1
      // So we need to transition when counter reaches FIZZ_DURATION + 1
      return fizzFramesElapsed > FIZZ_DURATION
    },
    reset: (): void => {
      // Reset fizz frame counter
      fizzFramesElapsed = 0
    }
  }

  // Create state update callbacks for headless mode
  const stateUpdateCallbacks = {
    onGameOver: (): void => {
      // No-op - headless doesn't care about UI transitions or high scores
    },
    getGalaxyId: (): string => galaxyId,
    getInitialLives: (): number => initialLives
  }

  return {
    step: (frameCount, controls): void => {
      // Track fizz state BEFORE update to properly simulate rendering sequence
      // In the real game: updateGameState runs, THEN rendering increments framesGenerated
      // But isComplete is checked DURING updateGameState, so it sees the OLD framesGenerated value
      // We need to increment BEFORE updateGameState so isComplete sees the current frame's counter
      const prevTransitionStatus = store.getState().transition.status
      const wasInFizzBefore = prevTransitionStatus === 'fizz'

      // If we're in fizz at the START of this frame, increment counter
      // (matches real game where rendering from PREVIOUS frame already incremented the counter)
      if (wasInFizzBefore) {
        fizzFramesElapsed++
      }

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
        randomService,
        stateUpdateCallbacks
      })

      // Check if we just entered or exited fizz to reset counter
      const currentTransitionStatus = store.getState().transition.status
      const isInFizzNow = currentTransitionStatus === 'fizz'

      if (isInFizzNow && !wasInFizzBefore) {
        // Just entered fizz - reset and increment to 1
        fizzFramesElapsed = 1
      } else if (!isInFizzNow && wasInFizzBefore) {
        // Just exited fizz - reset counter
        fizzFramesElapsed = 0
      }
    }
  }
}

export { createHeadlessGameEngine, type HeadlessGameEngine }
