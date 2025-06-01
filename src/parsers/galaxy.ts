// See `do_open` and `read_header` at Main.c:391

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

// Represents the raw galaxy file split into header and planet data sections
type Galaxy = {
  header: ArrayBuffer   // First 160 bytes containing file metadata
  planets: ArrayBuffer  // Remaining bytes containing all planet data (1540 bytes each)
}

export function parseGalaxyFile(galaxyBuffer: ArrayBuffer): Galaxy {
  const galaxyHeaderBytes = 160
  const headerBuffer = galaxyBuffer.slice(0, galaxyHeaderBytes)
  const planetsBuffer = galaxyBuffer.slice(galaxyHeaderBytes)
  return {
    header: headerBuffer,
    planets: planetsBuffer
  }
}

// Parsed galaxy header information (corresponds to original C variables in Main.c)
type GalaxyHeader = {
  planets: number     // Total number of planets in galaxy (original: int planets)
  cartplanet: number  // Planet number for demo/intro sequence (original: int cartplanet)
  indexes: Uint8Array // Planet index array for file positioning (original: char indexes[150])
}

export function parseGalaxyHeader(galaxyBuffer: ArrayBuffer): GalaxyHeader {
  const galaxyFileIdentifier = -17 // Magic number used by original Mac code for validation
  const planetIndexByteOffset = 10  // Index array starts at byte 10 (after header fields)
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
