// Bit manipulation utilities for sprite rotation

// Get a bit from packed bitmap data
export function getBit(
  x: number,
  y: number,
  data: Uint8Array,
  rowBytes: number
): boolean {
  if (x < 0 || y < 0) return false

  const byteOffset = y * rowBytes + Math.floor(x / 8)
  const bitOffset = 7 - (x % 8) // MSB first

  if (byteOffset >= data.length) return false

  return ((data[byteOffset] ?? 0) & (1 << bitOffset)) !== 0
}

// Set a bit in packed bitmap data
export function setBit(
  x: number,
  y: number,
  value: boolean,
  data: Uint8Array,
  rowBytes: number
): void {
  if (x < 0 || y < 0) return

  const byteOffset = y * rowBytes + Math.floor(x / 8)
  const bitOffset = 7 - (x % 8) // MSB first

  if (byteOffset >= data.length) return

  if (data[byteOffset] !== undefined) {
    if (value) {
      data[byteOffset] |= 1 << bitOffset
    } else {
      data[byteOffset] &= ~(1 << bitOffset)
    }
  }
}

// 90-degree counter-clockwise rotation for square sprites (used for ships)
export function rotate90CCW(
  src: Uint8Array,
  size: number,
  rowBytes: number
): Uint8Array {
  const dest = new Uint8Array(src.length)

  // Based on C code: get_bit(SIZE-y, SIZE-x) -> put_bit(x, y)
  // This means: dest(x,y) = src(size-y, size-x)
  for (let x = 0; x <= size; x++) {
    for (let y = 0; y <= size; y++) {
      const srcBit = getBit(size - y, size - x, src, rowBytes)
      if (srcBit) {
        setBit(x, y, true, dest, rowBytes)
      }
    }
  }

  return dest
}

// Mirror horizontally (used for ship positions 24-31)
export function mirrorHorizontal(
  src: Uint8Array,
  size: number,
  rowBytes: number
): Uint8Array {
  const dest = new Uint8Array(src.length)

  // Based on C code: get_bit(SIZE-x, y) -> put_bit(x, y)
  // This means: dest(x,y) = src(size-x, y)
  for (let x = 0; x <= size; x++) {
    for (let y = 0; y <= size; y++) {
      const srcBit = getBit(size - x, y, src, rowBytes)
      if (srcBit) {
        setBit(x, y, true, dest, rowBytes)
      }
    }
  }

  return dest
}

// Mirror vertically (used for ship positions 9-23)
export function mirrorVertical(
  src: Uint8Array,
  width: number,
  height: number,
  rowBytes: number
): Uint8Array {
  const dest = new Uint8Array(src.length)

  // Mirror vertically: (x,y) -> (x, height-1-y)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const srcBit = getBit(x, y, src, rowBytes)
      if (srcBit) {
        setBit(x, height - 1 - y, true, dest, rowBytes)
      }
    }
  }

  return dest
}

// Special rotation for bunkers - 90° CW rotation
// Based on the assembly code in rotate_bunker()
export function rotateBunker90CW(src: Uint8Array): Uint8Array {
  const BUNKHT = 48
  const BUNKWD = 48
  const dest = new Uint8Array(6 * BUNKHT)

  // 90° CW rotation: Transform (x,y) -> (47-y, x)
  for (let y = 0; y < BUNKHT; y++) {
    for (let x = 0; x < BUNKWD; x++) {
      if (getBit(x, y, src, 6)) {
        // 90° CW: new position is (47-y, x)
        setBit(BUNKWD - 1 - y, x, true, dest, 6)
      }
    }
  }

  return dest
}

// Generate intermediate ship rotations using interpolation
// This approximates the angles between the 8 base rotations
export function interpolateShipRotation(
  ship1: Uint8Array,
  ship2: Uint8Array,
  weight: number, // 0.0 = all ship1, 1.0 = all ship2
  size: number,
  rowBytes: number
): Uint8Array {
  const dest = new Uint8Array(ship1.length)

  // For each pixel, use probability based on weight to choose between ship1 and ship2
  for (let y = 0; y <= size; y++) {
    for (let x = 0; x <= size; x++) {
      const bit1 = getBit(x, y, ship1, rowBytes)
      const bit2 = getBit(x, y, ship2, rowBytes)

      // If both have the bit set, always set it
      // If neither has it, never set it
      // If only one has it, use weight as probability
      if (bit1 && bit2) {
        setBit(x, y, true, dest, rowBytes)
      } else if (bit1 && !bit2) {
        // Use a deterministic "random" based on position
        const threshold = ((x * 7 + y * 13) % 100) / 100
        if (threshold > weight) {
          setBit(x, y, true, dest, rowBytes)
        }
      } else if (!bit1 && bit2) {
        const threshold = ((x * 7 + y * 13) % 100) / 100
        if (threshold < weight) {
          setBit(x, y, true, dest, rowBytes)
        }
      }
    }
  }

  return dest
}

// Apply background pattern to sprite using mask
export function applyBackground(
  def: Uint8Array,
  mask: Uint8Array,
  background: number, // 0xAAAAAAAA or 0x55555555
  height: number,
  rowBytes: number
): Uint8Array {
  const result = new Uint8Array(def.length)

  // Process 4 bytes at a time (32-bit words)
  const wordsPerRow = rowBytes / 4

  for (let row = 0; row < height; row++) {
    for (let word = 0; word < wordsPerRow; word++) {
      const offset = row * rowBytes + word * 4

      // Get background pattern for this row
      const bgPattern = row % 2 === 0 ? background : ~background

      // Apply: (background & mask) ^ def
      for (let byte = 0; byte < 4; byte++) {
        const idx = offset + byte
        if (idx < def.length) {
          const bgByte = (bgPattern >> ((3 - byte) * 8)) & 0xff
          const maskByte = mask[idx] ?? 0
          const defByte = def[idx] ?? 0
          result[idx] = (bgByte & maskByte) ^ defByte
        }
      }
    }
  }

  return result
}

// Helper to clear a sprite array
export function clearSprite(data: Uint8Array): void {
  data.fill(0)
}
