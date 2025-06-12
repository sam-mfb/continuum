type ScanlineData = {
  lineNumber: number
  prefixBytes: Uint8Array
  compressedBytes: Uint8Array
  missingBorder: boolean
}

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
  packedScanlines: Array<ScanlineData>
} {
  const data = new Uint8Array(rawData)

  // Image dimensions
  const width = 504
  const height = 311
  const rowbytes = 63 // (504 + 7) / 8

  // Start of image data after header
  let offset = 0x230
  const scanlines: Uint8Array[] = []
  const packedScanlines: Array<ScanlineData> = []
  let skippedBytes: number[] = []

  while (offset < data.length && scanlines.length < height) {
    if (offset >= data.length) break

    // Read single-byte length
    const firstByte = data[offset]
    if (firstByte === undefined) break

    offset += 1

    // for some reason skipping bytes with a value of greater than 71 eliminates problematic bytes
    if (firstByte > 71) {
      skippedBytes.push(firstByte)
      continue
    }

    // Decode scanline
    if (firstByte > 0 && offset + firstByte <= data.length) {
      const packedLine = data.slice(offset, offset + firstByte)
      const unpacked = decodePackBits(packedLine)

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

      packedScanlines.push({
        lineNumber: scanlines.length - 1, // 0-indexed
        prefixBytes,
        compressedBytes: packedLine,
        missingBorder: false // Will be determined later
      })
      console.log(`Pushed line ${scanlines.length}`)

      offset += firstByte
    } else if (firstByte === 0) {
      // Skip zero-length lines but keep it as a skipped byte
      skippedBytes.push(firstByte)
      continue
    }
  }

  // Create full bitmap data
  const bitmapData = new Uint8Array(height * rowbytes)
  for (let i = 0; i < scanlines.length; i++) {
    const scanline = scanlines[i]
    if (scanline) {
      bitmapData.set(scanline, i * rowbytes)
    }
  }

  // Check for missing borders and update the missingBorder flag
  let linesWithoutBorderCount = 0
  for (let row = 0; row < height; row++) {
    // Check pixel 500 (column 500)
    const col = 500
    const byteIndex = row * rowbytes + Math.floor(col / 8)
    const bitIndex = 7 - (col % 8)
    const byte = bitmapData[byteIndex]
    const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

    if (bit === 0) {
      // White pixel at position 500 - missing border
      const scanlineData = packedScanlines[row]
      if (scanlineData) {
        scanlineData.missingBorder = true
        linesWithoutBorderCount++
      }
    }
  }

  console.log(
    `Found ${linesWithoutBorderCount} lines without black border at pixel 500`
  )

  // Convert to RGBA image data
  const imageDataArray = new Uint8ClampedArray(width * height * 4)

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
    packedScanlines
  }
}
