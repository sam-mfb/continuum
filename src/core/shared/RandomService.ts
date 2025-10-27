/**
 * Random number service providing deterministic PRNG
 *
 * Uses Mulberry32 algorithm - simple, fast, deterministic
 * See: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 *
 * This service is instantiated once and passed as a dependency to the game.
 * Call setSeed() at the start of each game to reset the RNG state.
 */

export type RandomService = {
  getSeed: () => number
  setSeed: (seed: number) => void
  rnumber: (n: number) => number
}

export const createRandomService = (): RandomService => {
  let seed = 0
  let state = 0

  // Mulberry32 PRNG - simple, fast, deterministic
  // Period: 2^32
  // Quality: Passes PractRand, decent statistical properties
  const mulberry32 = (): number => {
    let t = (state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    getSeed: () => seed,
    setSeed: (newSeed: number): void => {
      seed = newSeed
      state = newSeed
    },
    rnumber: (n: number) => Math.floor(mulberry32() * n)
  }
}
