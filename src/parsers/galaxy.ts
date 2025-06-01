// Galaxy file parsing implementation based on original Continuum Mac source code
// Primary references: `do_open()` and `read_header()` functions at Main.c:391-404
// File positioning: `get_planet()` function at Main.c:732-748
// Constants from: GW.h (FILEHEAD=160, PLANSIZE=1540)
// Original variables: Main.c global vars (int planets, int cartplanet, char indexes[150])

import type { GalaxyBuffer, GalaxyHeader } from './types'

// Continuum was written for the original Macintosh which ran
// on a Motorola 68000 processor which was big-endian.
// This function pulls a big-endian 2-byte integer from
// offset i in DataView dv.
const getInt16BE = (dv: DataView, i: number): number => dv.getInt16(i, false)

// The Continuum galaxy file format (160-byte header + planet data):
// Bytes 0-1: File identifier (-17, magic number for validation)
// Bytes 2-3: Number of planets in galaxy
// Bytes 4-5: Cartoon/demo planet number (for intro sequence)
// Bytes 6-9: Unused/padding
// Bytes 10+: Index array (1 byte per planet, up to 150 entries)
// Byte 160+: Planet data (1540 bytes per planet)
//
// Index array explanation: Each byte contains a planet index number (0-255).
// To find a planet's file location: 160 + (index_value * 1540)
// This indirection allows planets to be reordered without moving data blocks.
//
// Example of how planet indexing works:
// File layout:     [Header 160b][Planet0 1540b][Planet1 1540b][Planet2 1540b]
// Index array:     [2, 0, 1]  (3 planets)
//
// When user selects "Planet 1" (first in list):
//   index_array[0] = 2 → file position = 160 + (2 * 1540) = 3240
//   Reads Planet2's data from file position 3240
//
// When user selects "Planet 2" (second in list):
//   index_array[1] = 0 → file position = 160 + (0 * 1540) = 160
//   Reads Planet0's data from file position 160
//
// This means the user sees planets in order: Planet2, Planet0, Planet1
// without any actual data movement in the file. The editor can reorder
// planets by simply changing the index array values.

export function splitGalaxyBuffer(galaxyBuffer: ArrayBuffer): GalaxyBuffer {
  const galaxyHeaderBytes = 160
  const headerBuffer = galaxyBuffer.slice(0, galaxyHeaderBytes)
  const planetsBuffer = galaxyBuffer.slice(galaxyHeaderBytes)
  return {
    header: headerBuffer,
    planets: planetsBuffer
  }
}

export function parseGalaxyHeader(galaxyBuffer: ArrayBuffer): GalaxyHeader {
  const galaxyFileIdentifier = -17 // Magic number used by original Mac code for validation
  const planetIndexByteOffset = 10 // Index array starts at byte 10 (after header fields)
  const galaxyDV = new DataView(galaxyBuffer)

  // Validate file format using magic number (matches original getw(wfile) != -17 check)
  if (getInt16BE(galaxyDV, 0) !== galaxyFileIdentifier) {
    throw new Error('Not a valid galaxy file')
  }

  const numPlanets = getInt16BE(galaxyDV, 2)
  const cartoonPlanet = getInt16BE(galaxyDV, 4)
  const indexByteEnd = planetIndexByteOffset + numPlanets // 1 byte per planet entry
  const planetsIndex = new Uint8Array(
    // 1 byte per entry so endianness doesn't matter (matches original char indexes[150])
    galaxyBuffer.slice(planetIndexByteOffset, indexByteEnd)
  )
  return {
    planets: numPlanets,
    cartplanet: cartoonPlanet,
    indexes: planetsIndex
  }
}
