import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo, MonochromeBitmap } from '@/lib/bitmap'
import type { Frame } from '@/lib/frame/types'

export type GameRenderLoop = (
  frame: FrameInfo,
  controls: ControlMatrix
) => MonochromeBitmap

export type NewGameRenderLoop = (
  frame: FrameInfo,
  controls: ControlMatrix
) => Frame

/**
 * Sound service interface required by the game
 *
 * This defines what the game NEEDS, not what any particular
 * implementation provides. The actual sound service may provide
 * additional methods beyond this interface.
 *
 * Following the Dependency Inversion Principle: the game defines
 * the abstraction it depends on, rather than depending on
 * implementation details.
 */
export type GameSoundService = {
  // Volume and mute controls
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Ship sounds
  playShipFire(): void
  playShipThrust(): void
  playShipShield(): void
  playShipExplosion(): void
  stopShipThrust(): void
  stopShipShield(): void

  // Bunker sounds
  playBunkerShoot(): void
  playBunkerExplosion(): void
  playBunkerSoft(): void

  // Pickup sounds
  playFuelCollect(): void

  // Level sounds
  playLevelTransition(): void
  playEcho(): void

  // Lifecycle
  startEngine(): Promise<void> // Pre-start audio engine to eliminate first-sound delay
  cleanup(): void
}
