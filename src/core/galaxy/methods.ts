import { createBigEnd } from '@lib/asm/bigEnd'
import type {
  GalaxyBuffer,
  GalaxyComponents,
  GalaxyHeader,
  GalaxyHeaderBuffer,
  PlanetsBuffer
} from './types'
import { GALAXY } from './constants'

function assertGalaxyBuffer(
  buffer: ArrayBuffer
): asserts buffer is GalaxyBuffer {
  const galaxyBigEnd = createBigEnd(buffer)

  // Validate file format using magic number (matches original getw(wfile) != -17 check)
  if (galaxyBigEnd.getWord(0) !== GALAXY.FILE_IDENTIFIER) {
    throw new Error('Not a valid galaxy file')
  }
}

function splitGalaxyBuffer(galaxyBuffer: ArrayBuffer): GalaxyComponents {
  assertGalaxyBuffer(galaxyBuffer)
  const headerBuffer = galaxyBuffer.slice(0, GALAXY.HEADER_BYTES)
  const planetsBuffer = galaxyBuffer.slice(GALAXY.HEADER_BYTES)
  return {
    headerBuffer: headerBuffer as GalaxyHeaderBuffer,
    planetsBuffer: planetsBuffer as PlanetsBuffer
  }
}

function parseGalaxyHeader(
  galaxyHeaderBuffer: GalaxyHeaderBuffer
): GalaxyHeader {
  const galaxyBigEnd = createBigEnd(galaxyHeaderBuffer)

  const numPlanets = galaxyBigEnd.getWord(2)
  const cartoonPlanet = galaxyBigEnd.getWord(4)
  const indexByteEnd = GALAXY.PLANET_INDEX_OFFSET + numPlanets // 1 byte per planet entry

  // Convert Uint8Array to regular number array for better JavaScript serialization
  const indexBytes = new Uint8Array(
    // 1 byte per entry so endianness doesn't matter (matches original char indexes[150])
    galaxyHeaderBuffer.slice(GALAXY.PLANET_INDEX_OFFSET, indexByteEnd)
  )
  const planetsIndex = Array.from(indexBytes)

  return {
    planets: numPlanets,
    cartplanet: cartoonPlanet,
    indexes: planetsIndex
  }
}
export const Galaxy = {
  splitBuffer: splitGalaxyBuffer,
  parseHeader: parseGalaxyHeader
}
