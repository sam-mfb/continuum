/**
 * Game Sound Generators
 * 
 * This module exports the actual sound generators from the original Continuum game.
 * These are faithful recreations of the original 68K Mac assembly implementations.
 */

import { createThrusterGenerator } from './thrusterGenerator'
import { createShieldGenerator } from './shieldGenerator'
import { createExplosionGenerator, ExplosionType } from './explosionGenerator'

/**
 * Factory function to create all game sound generators
 */
export const createGameSounds = () => ({
  thruster: createThrusterGenerator(),
  shield: createShieldGenerator(),
  explosionBunker: createExplosionGenerator(ExplosionType.BUNKER),
  explosionShip: createExplosionGenerator(ExplosionType.SHIP),
  explosionAlien: createExplosionGenerator(ExplosionType.ALIEN),
  // Future game sounds will be added here:
  // fire: createFireGenerator(),
  // fuel: createFuelGenerator(),
  // bunker: createBunkerGenerator(),
  // crack: createCrackGenerator(),
  // fizz: createFizzGenerator(),
  // echo: createEchoGenerator(),
}) as const

export type GameSoundType = keyof ReturnType<typeof createGameSounds>