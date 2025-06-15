/**
 * Game Sound Generators
 *
 * This module exports the actual sound generators from the original Continuum game.
 * These are faithful recreations of the original 68K Mac assembly implementations.
 */

import { createThrusterGenerator } from './thrusterGenerator'
import { createShieldGenerator } from './shieldGenerator'
import { createExplosionGenerator, ExplosionType } from './explosionGenerator'
import { createFuelGenerator } from './fuelGenerator'
import { createFireGenerator } from './fireGenerator'
import { createCrackGenerator } from './crackGenerator'
import { createFizzGenerator } from './fizzGenerator'
import { createBunkerGenerator, BunkerSoundType } from './bunkerGenerator'
import { createEchoGenerator } from './echoGenerator'

/**
 * Factory function to create all game sound generators
 */
export const createGameSounds = () =>
  ({
    thruster: createThrusterGenerator(),
    shield: createShieldGenerator(),
    explosionBunker: createExplosionGenerator(ExplosionType.BUNKER),
    explosionShip: createExplosionGenerator(ExplosionType.SHIP),
    explosionAlien: createExplosionGenerator(ExplosionType.ALIEN),
    fuel: createFuelGenerator(),
    fire: createFireGenerator(),
    bunkerNormal: createBunkerGenerator(BunkerSoundType.NORMAL),
    bunkerSoft: createBunkerGenerator(BunkerSoundType.SOFT),
    crack: createCrackGenerator(),
    fizz: createFizzGenerator(),
    echo: createEchoGenerator()
  }) as const

export type GameSoundType = keyof ReturnType<typeof createGameSounds>
