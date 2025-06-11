/**
 * Decodes PackBits compressed data
 */
const decodePackBits = (data: Uint8Array): Uint8Array => {
  const result: number[] = []
  let i = 0

  while (i < data.length) {
    const flag = data[i]
    i++

    if (flag === undefined) break

    if (flag === 0x80) {
      // No-op
      continue
    } else if (flag > 0x80) {
      // Run length: repeat next byte (257 - flag) times
      const repeatCount = 257 - flag
      if (i < data.length) {
        const byte = data[i]
        if (byte !== undefined) {
          for (let j = 0; j < repeatCount; j++) {
            result.push(byte)
          }
        }
        i++
      }
    } else {
      // Literal: copy next (flag + 1) bytes
      const copyCount = flag + 1
      for (let j = 0; j < copyCount && i < data.length; j++) {
        const byte = data[i]
        if (byte !== undefined) {
          result.push(byte)
        }
        i++
      }
    }
  }

  return new Uint8Array(result)
}

/**
 * The file Continuum Title Page in the original source is either corrupted or an incredibly
 * unusual format. This function is a partially successful attempt to decode it, that is fairly
 * hacky and ultimately resorts to brute forcing places where we think their should probably be
 * bits. Even with this, and even with knowing what the picture should look like, there are still
 * a few missing lines. I suspect the file is corrupted.
 *
 * In any event, i was able to extract the resource used in the game itself from the games resource
 * fork and that decodes just fine.
 */
export function continuumTitleToImageData(rawData: ArrayBuffer): {
  image: ImageData
  badLines: number[]
} {
  const data = new Uint8Array(rawData)

  // Image dimensions
  const width = 504
  const height = 311
  const rowbytes = 63 // (504 + 7) / 8

  // Start of image data after header
  let offset = 0x230
  const scanlines: Uint8Array[] = []

  while (offset < data.length && scanlines.length < height) {
    if (offset >= data.length) break

    // Read single-byte length
    const firstByte = data[offset]
    if (firstByte === undefined) break

    offset += 1

    // for some reason skipping bytes with a value of greater than 71 eliminates problematic bytes
    if (firstByte > 71) {
      console.log('skipping byte')
      continue
    }

    // Decode scanline
    if (firstByte > 0 && offset + firstByte <= data.length) {
      const packedLine = data.slice(offset, offset + firstByte)
      const unpacked = decodePackBits(packedLine)

      // Validate unpacked length
      if (unpacked.length > rowbytes * 2) {
        // Something went wrong with decoding
        offset += firstByte
        continue
      }

      // Always take exactly rowbytes (63) bytes
      const scanline = new Uint8Array(rowbytes)
      for (let i = 0; i < rowbytes && i < unpacked.length; i++) {
        const byte = unpacked[i]
        if (byte !== undefined) {
          scanline[i] = byte
        }
      }
      scanlines.push(scanline)
      console.log(`Pushed line ${scanlines.length}`)

      offset += firstByte
    } else if (firstByte === 0) {
      // Skip zero-length lines
      continue
    }
  }

  // Post-process to fix known problematic lines
  console.log(`Scanlines before fixes: ${scanlines.length}`)

  // Fix lines 49-50
  if (scanlines.length > 50) {
    console.log('Fixing lines 49-50...')

    // First scanline: 38 bytes compressed at 0x07f9
    const firstCompressed = data.slice(0x07f9, 0x07f9 + 38)
    const firstDecoded = decodePackBits(firstCompressed)
    const firstScanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < firstDecoded.length; i++) {
      const byte = firstDecoded[i]
      if (byte !== undefined) {
        firstScanline[i] = byte
      }
    }

    // Second scanline: 38 bytes compressed at 0x0821
    const secondCompressed = data.slice(0x0821, 0x0821 + 38)
    const secondDecoded = decodePackBits(secondCompressed)
    const secondScanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < secondDecoded.length; i++) {
      const byte = secondDecoded[i]
      if (byte !== undefined) {
        secondScanline[i] = byte
      }
    }

    // Replace the problematic scanlines
    scanlines[49] = firstScanline
    scanlines[50] = secondScanline

    console.log(`Line 49 replaced: ${firstDecoded.length} bytes decoded`)
    console.log(`Line 50 replaced: ${secondDecoded.length} bytes decoded`)

    // Debug: Check pixel 500 and ending bits for both lines
    const byte62_line49 = firstScanline[62]
    if (byte62_line49 !== undefined) {
      const pixel500_line49 = (byte62_line49 >> 3) & 1
      const last3bits_line49 = byte62_line49 & 0x07
      console.log(
        `Line 49 byte 62: 0x${byte62_line49.toString(16)}, pixel 500: ${pixel500_line49 ? 'black' : 'white'}, last 3 bits: ${last3bits_line49.toString(2).padStart(3, '0')}`
      )
    }

    const byte62_line50 = secondScanline[62]
    if (byte62_line50 !== undefined) {
      const pixel500_line50 = (byte62_line50 >> 3) & 1
      const last3bits_line50 = byte62_line50 & 0x07
      console.log(
        `Line 50 byte 62: 0x${byte62_line50.toString(16)}, pixel 500: ${pixel500_line50 ? 'black' : 'white'}, last 3 bits: ${last3bits_line50.toString(2).padStart(3, '0')}`
      )
    }
  }

  // Fix lines 98-100 which have white border pattern
  // The 0x0098 opcode at 0x11d4 disrupts the normal decoding
  if (scanlines.length > 100) {
    console.log('Fixing lines 98-100...')

    // Lines 98-100 should have massive white sections (not black like 49-50)
    // The scanlines we found are correct:

    // Line 98: 56 bytes compressed at 0x11f2
    const line98Compressed = data.slice(0x11f2, 0x11f2 + 56)
    const line98Decoded = decodePackBits(line98Compressed)
    const line98Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line98Decoded.length; i++) {
      const byte = line98Decoded[i]
      if (byte !== undefined) {
        line98Scanline[i] = byte
      }
    }
    scanlines[98] = line98Scanline

    // Line 99: 56 bytes compressed at 0x122c
    const line99Compressed = data.slice(0x122c, 0x122c + 56)
    const line99Decoded = decodePackBits(line99Compressed)
    const line99Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line99Decoded.length; i++) {
      const byte = line99Decoded[i]
      if (byte !== undefined) {
        line99Scanline[i] = byte
      }
    }
    scanlines[99] = line99Scanline

    // Line 100: 56 bytes compressed at 0x1266
    const line100Compressed = data.slice(0x1266, 0x1266 + 56)
    const line100Decoded = decodePackBits(line100Compressed)
    const line100Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line100Decoded.length; i++) {
      const byte = line100Decoded[i]
      if (byte !== undefined) {
        line100Scanline[i] = byte
      }
    }
    scanlines[100] = line100Scanline

    console.log('Lines 98-100 replaced with white border scanlines')
  }

  // Fix lines 149-151 which have corruption
  if (scanlines.length > 151) {
    console.log('Fixing lines 149-151...')

    // Line 149: 54 bytes compressed at 0x18aa
    const line149Compressed = data.slice(0x18aa, 0x18aa + 54)
    const line149Decoded = decodePackBits(line149Compressed)
    const line149Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line149Decoded.length; i++) {
      const byte = line149Decoded[i]
      if (byte !== undefined) {
        line149Scanline[i] = byte
      }
    }
    scanlines[149] = line149Scanline

    // Line 150: 54 bytes compressed at 0x18e2
    const line150Compressed = data.slice(0x18e2, 0x18e2 + 54)
    const line150Decoded = decodePackBits(line150Compressed)
    const line150Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line150Decoded.length; i++) {
      const byte = line150Decoded[i]
      if (byte !== undefined) {
        line150Scanline[i] = byte
      }
    }
    scanlines[150] = line150Scanline

    // Line 151: 53 bytes compressed at 0x191a
    const line151Compressed = data.slice(0x191a, 0x191a + 53)
    const line151Decoded = decodePackBits(line151Compressed)
    const line151Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line151Decoded.length; i++) {
      const byte = line151Decoded[i]
      if (byte !== undefined) {
        line151Scanline[i] = byte
      }
    }
    scanlines[151] = line151Scanline

    console.log('Lines 149-151 replaced')
  }

  // Create full bitmap data
  const bitmapData = new Uint8Array(height * rowbytes)
  for (let i = 0; i < scanlines.length; i++) {
    const scanline = scanlines[i]
    if (scanline) {
      bitmapData.set(scanline, i * rowbytes)
    }
  }

  // Convert to RGBA image data
  const imageDataArray = new Uint8ClampedArray(width * height * 4)

  // First pass: identify all lines without black border at pixel 500
  const linesWithoutBorder: number[] = []
  for (let row = 0; row < height; row++) {
    // Check pixel 500 (column 500)
    const col = 500
    const byteIndex = row * rowbytes + Math.floor(col / 8)
    const bitIndex = 7 - (col % 8)
    const byte = bitmapData[byteIndex]
    const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

    if (bit === 0) {
      // White pixel at position 500
      linesWithoutBorder.push(row)
    }
  }

  console.log(
    `Found ${linesWithoutBorder.length} lines without black border at pixel 500:`,
    linesWithoutBorder
  )

  // Second pass: render normally (black and white)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const byteIndex = row * rowbytes + Math.floor(col / 8)
      const bitIndex = 7 - (col % 8)
      const byte = bitmapData[byteIndex]
      const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

      const pixelIndex = (row * width + col) * 4
      const value = bit ? 0 : 255 // 1 = black, 0 = white
      imageDataArray[pixelIndex] = value // R
      imageDataArray[pixelIndex + 1] = value // G
      imageDataArray[pixelIndex + 2] = value // B
      imageDataArray[pixelIndex + 3] = 255 // A
    }
  }

  return {
    image: new ImageData(imageDataArray, width, height),
    badLines: linesWithoutBorder
  }
}

