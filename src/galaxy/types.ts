export type GalaxyBuffer = ArrayBuffer & {
  _galaxyBufferBrand: string
}

export type GalaxyHeaderBuffer = ArrayBuffer & {
  _galaxyHeaderBufferBrand: string
}

export type PlanetsBuffer = ArrayBuffer & {
  _planetsBufferBrand: string
}

/**
 * Represents the raw galaxy file split into header and planet data sections
 */
export type GalaxyComponents = {
  /** First 160 bytes containing file metadata */
  headerBuffer: GalaxyHeaderBuffer
  /** Remaining bytes containing all planet data (1540 bytes each) */
  planetsBuffer: PlanetsBuffer
}

/**
 * Parsed galaxy header information
 * (corresponds to original C variables in Main.c:read_header())
 */
export type GalaxyHeader = {
  /** Total number of planets in galaxy (original: int planets) */
  planets: number
  /** Planet number for demo/intro sequence (original: int cartplanet) */
  cartplanet: number
  /** Planet index array for file positioning (original: char indexes[150]) */
  indexes: number[]
}
