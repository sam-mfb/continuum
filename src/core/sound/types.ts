/**
 * TypeScript interfaces for the sound system
 */

/**
 * Sound types available in the engine
 */
export type GameSoundType =
  | 'silence'
  | 'fire'
  | 'thruster'
  | 'shield'
  | 'explosionBunker'
  | 'explosionShip'
  | 'explosionAlien'
  | 'bunker'
  | 'soft'
  | 'fuel'
  | 'crack'
  | 'fizz'
  | 'echo'

/**
 * Sound service interface
 *
 * This defines what the sound service implementation PROVIDES.
 * Consumers may depend on a subset of this interface.
 */
export type SoundService = {
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
  playLevelComplete(): void // Crack sound
  playLevelTransition(): void // Fizz sound
  playEcho(): void

  // Alien sounds
  playAlienExplosion(): void

  // Control methods
  clearSound(): void // Matches original game's clear_sound()
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Engine lifecycle
  startEngine(): Promise<void> // Pre-start audio engine to eliminate first-sound delay
  cleanup(): void
}
