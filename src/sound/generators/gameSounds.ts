/**
 * Game Sound Generators
 * 
 * This module exports the actual sound generators from the original Continuum game.
 * These are faithful recreations of the original 68K Mac assembly implementations.
 */

import { createThrusterGenerator } from './thrusterGenerator'

/**
 * Factory function to create all game sound generators
 */
export const createGameSounds = () => ({
  thruster: createThrusterGenerator(),
  // Future game sounds will be added here:
  // fire: createFireGenerator(),
  // explosion1: createExplosion1Generator(),
  // explosion2: createExplosion2Generator(),
  // explosion3: createExplosion3Generator(),
  // shield: createShieldGenerator(),
  // fuel: createFuelGenerator(),
  // bunker: createBunkerGenerator(),
  // crack: createCrackGenerator(),
  // fizz: createFizzGenerator(),
  // echo: createEchoGenerator(),
}) as const

export type GameSoundType = keyof ReturnType<typeof createGameSounds>