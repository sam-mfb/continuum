/**
 * Represents the raw galaxy file split into header and planet data sections
 */
export type GalaxyBuffer = {
  /** First 160 bytes containing file metadata */
  header: ArrayBuffer
  /** Remaining bytes containing all planet data (1540 bytes each) */
  planets: ArrayBuffer
}

/**
 * Parsed galaxy header information (corresponds to original C variables in Main.c)
 */
export type GalaxyHeader = {
  /** Total number of planets in galaxy (original: int planets) */
  planets: number
  /** Planet number for demo/intro sequence (original: int cartplanet) */
  cartplanet: number
  /** Planet index array for file positioning (original: char indexes[150]) */
  indexes: Uint8Array
}
