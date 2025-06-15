/**
 * Hiss Random Data
 *
 * Shared pseudo-random data used by noise-based sound effects
 * (crack, fizz, and echo sounds).
 *
 * In the original Continuum game, this was a 256-byte array
 * called hiss_rands[] that contained pre-generated random values.
 *
 * Each value is random between 4 and 43 (rint(40) + 4).
 * These values control the duration of amplitude periods in
 * the noise generation, creating pseudo-random patterns.
 */

// Generate hiss_rands array like the original
const generateHissRands = (): Uint8Array => {
  const rands = new Uint8Array(256)

  // Use a seeded random number generator for consistency
  let seed = 0x1234
  const random = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  for (let i = 0; i < 256; i++) {
    // Original: rint(40) + 4, which gives 4-43
    rands[i] = Math.floor(random() * 40) + 4
  }

  return rands
}

// Export the pre-generated array
export const HISS_RANDS = generateHissRands()
