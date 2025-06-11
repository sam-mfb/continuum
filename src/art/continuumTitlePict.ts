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
  packedScanlines: Array<[Uint8Array, Uint8Array]>
  badLines: Array<[number, [Uint8Array, Uint8Array]]>
} {
  const data = new Uint8Array(rawData)

  // Image dimensions
  const width = 504
  const height = 311
  const rowbytes = 63 // (504 + 7) / 8

  // Start of image data after header
  let offset = 0x230
  const scanlines: Uint8Array[] = []
  const packedScanlines: Array<[Uint8Array, Uint8Array]> = []
  let skippedBytes: number[] = []

  while (offset < data.length && scanlines.length < height) {
    if (offset >= data.length) break

    // Read single-byte length
    const firstByte = data[offset]
    if (firstByte === undefined) break

    offset += 1

    // for some reason skipping bytes with a value of greater than 71 eliminates problematic bytes
    if (firstByte > 71) {
      console.log('skipping byte')
      skippedBytes.push(firstByte)
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
      
      // Create prefix bytes array including any skipped bytes and the length byte
      let prefixBytes: Uint8Array
      if (skippedBytes.length > 0) {
        // Combine skipped bytes + firstByte
        prefixBytes = new Uint8Array(skippedBytes.length + 1)
        prefixBytes.set(new Uint8Array(skippedBytes), 0)
        prefixBytes[skippedBytes.length] = firstByte
        skippedBytes = [] // Reset skipped bytes after using them
      } else {
        // Just the firstByte length prefix
        prefixBytes = new Uint8Array([firstByte])
      }
      
      packedScanlines.push([prefixBytes, packedLine])
      console.log(`Pushed line ${scanlines.length}`)

      offset += firstByte
    } else if (firstByte === 0) {
      // Skip zero-length lines but keep it as a skipped byte
      skippedBytes.push(firstByte)
      continue
    }
  }

  // Post-process to fix known problematic lines
  console.log(`Scanlines before fixes: ${scanlines.length}`)

  // Ensure packedScanlines array is same length as scanlines
  while (packedScanlines.length < scanlines.length) {
    packedScanlines.push([new Uint8Array(0), new Uint8Array(0)])
  }

  // Fix lines 49-50
  if (scanlines.length > 50) {
    console.log('Fixing lines 49-50...')

    // First scanline: length byte at 0x07f8, then 38 bytes compressed at 0x07f9
    const firstPrefixBytes = data.slice(0x07f8, 0x07f9)  // Just the length byte
    const firstCompressedBytes = data.slice(0x07f9, 0x07f9 + 38)  // The compressed data
    const firstDecoded = decodePackBits(firstCompressedBytes)
    const firstScanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < firstDecoded.length; i++) {
      const byte = firstDecoded[i]
      if (byte !== undefined) {
        firstScanline[i] = byte
      }
    }

    // Second scanline: length byte at 0x0820, then 38 bytes compressed at 0x0821
    const secondPrefixBytes = data.slice(0x0820, 0x0821)  // Just the length byte
    const secondCompressedBytes = data.slice(0x0821, 0x0821 + 38)  // The compressed data
    const secondDecoded = decodePackBits(secondCompressedBytes)
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
    packedScanlines[49] = [firstPrefixBytes, firstCompressedBytes]
    packedScanlines[50] = [secondPrefixBytes, secondCompressedBytes]

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

    // Line 98: length byte at 0x11f1, then 56 bytes compressed at 0x11f2
    const line98PrefixBytes = data.slice(0x11f1, 0x11f2)  // Just the length byte
    const line98CompressedBytes = data.slice(0x11f2, 0x11f2 + 56)  // The compressed data
    const line98Decoded = decodePackBits(line98CompressedBytes)
    const line98Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line98Decoded.length; i++) {
      const byte = line98Decoded[i]
      if (byte !== undefined) {
        line98Scanline[i] = byte
      }
    }
    scanlines[98] = line98Scanline
    packedScanlines[98] = [line98PrefixBytes, line98CompressedBytes]

    // Line 99: length byte at 0x122b, then 56 bytes compressed at 0x122c
    const line99PrefixBytes = data.slice(0x122b, 0x122c)  // Just the length byte
    const line99CompressedBytes = data.slice(0x122c, 0x122c + 56)  // The compressed data
    const line99Decoded = decodePackBits(line99CompressedBytes)
    const line99Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line99Decoded.length; i++) {
      const byte = line99Decoded[i]
      if (byte !== undefined) {
        line99Scanline[i] = byte
      }
    }
    scanlines[99] = line99Scanline
    packedScanlines[99] = [line99PrefixBytes, line99CompressedBytes]

    // Line 100: length byte at 0x1265, then 56 bytes compressed at 0x1266
    const line100PrefixBytes = data.slice(0x1265, 0x1266)  // Just the length byte
    const line100CompressedBytes = data.slice(0x1266, 0x1266 + 56)  // The compressed data
    const line100Decoded = decodePackBits(line100CompressedBytes)
    const line100Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line100Decoded.length; i++) {
      const byte = line100Decoded[i]
      if (byte !== undefined) {
        line100Scanline[i] = byte
      }
    }
    scanlines[100] = line100Scanline
    packedScanlines[100] = [line100PrefixBytes, line100CompressedBytes]

    console.log('Lines 98-100 replaced with white border scanlines')
  }

  // Fix lines 149-151 which have corruption
  if (scanlines.length > 151) {
    console.log('Fixing lines 149-151...')

    // Line 149: length byte at 0x18a9, then 54 bytes compressed at 0x18aa
    const line149PrefixBytes = data.slice(0x18a9, 0x18aa)  // Just the length byte
    const line149CompressedBytes = data.slice(0x18aa, 0x18aa + 54)  // The compressed data
    const line149Decoded = decodePackBits(line149CompressedBytes)
    const line149Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line149Decoded.length; i++) {
      const byte = line149Decoded[i]
      if (byte !== undefined) {
        line149Scanline[i] = byte
      }
    }
    scanlines[149] = line149Scanline
    packedScanlines[149] = [line149PrefixBytes, line149CompressedBytes]

    // Line 150: length byte at 0x18e1, then 54 bytes compressed at 0x18e2
    const line150PrefixBytes = data.slice(0x18e1, 0x18e2)  // Just the length byte
    const line150CompressedBytes = data.slice(0x18e2, 0x18e2 + 54)  // The compressed data
    const line150Decoded = decodePackBits(line150CompressedBytes)
    const line150Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line150Decoded.length; i++) {
      const byte = line150Decoded[i]
      if (byte !== undefined) {
        line150Scanline[i] = byte
      }
    }
    scanlines[150] = line150Scanline
    packedScanlines[150] = [line150PrefixBytes, line150CompressedBytes]

    // Line 151: length byte at 0x1919, then 53 bytes compressed at 0x191a
    const line151PrefixBytes = data.slice(0x1919, 0x191a)  // Just the length byte
    const line151CompressedBytes = data.slice(0x191a, 0x191a + 53)  // The compressed data
    const line151Decoded = decodePackBits(line151CompressedBytes)
    const line151Scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < line151Decoded.length; i++) {
      const byte = line151Decoded[i]
      if (byte !== undefined) {
        line151Scanline[i] = byte
      }
    }
    scanlines[151] = line151Scanline
    packedScanlines[151] = [line151PrefixBytes, line151CompressedBytes]

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
  const linesWithoutBorder: Array<[number, Uint8Array]> = []
  for (let row = 0; row < height; row++) {
    // Check pixel 500 (column 500)
    const col = 500
    const byteIndex = row * rowbytes + Math.floor(col / 8)
    const bitIndex = 7 - (col % 8)
    const byte = bitmapData[byteIndex]
    const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

    if (bit === 0) {
      // White pixel at position 500
      const packedData = packedScanlines[row]
      if (packedData) {
        linesWithoutBorder.push([row, packedData])
      }
    }
  }

  console.log(
    `Found ${linesWithoutBorder.length} lines without black border at pixel 500`
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
    packedScanlines,
    badLines: linesWithoutBorder
  }
}
