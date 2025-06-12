type ScanlineData = {
  lineNumber: number
  prefixBytes: Uint8Array
  compressedBytes: Uint8Array
  missingBorder: boolean
}

const ADDITIONAL_OFFSET = 8

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
 * Parses raw byte data to extract scanline information
 */
export const parseScanlineData = (
  data: Uint8Array,
  startOffset: number,
  height: number
): Array<ScanlineData> => {
  const packedScanlines: Array<ScanlineData> = []
  let offset = startOffset
  let skippedBytes: number[] = []
  let lineNumber = 0

  while (offset < data.length && lineNumber < height) {
    if (offset >= data.length) break

    // Read single-byte length
    const firstByte = data[offset]
    if (firstByte === undefined) break

    offset += 1

    // for some reason skipping bytes with a value of greater than 71 eliminates problematic bytes
    if (firstByte > 127) {
      skippedBytes.push(firstByte)
      continue
    }

    // Process scanline
    if (firstByte > 0 && offset + firstByte <= data.length) {
      const packedLine = data.slice(offset, offset + firstByte)

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
        lineNumber,
        prefixBytes,
        compressedBytes: packedLine,
        missingBorder: false // Will be determined later
      })

      lineNumber++
      offset += firstByte
    } else if (firstByte === 0) {
      // Skip zero-length lines but keep it as a skipped byte
      skippedBytes.push(firstByte)
      continue
    }
  }

  return packedScanlines
}

/**
 * Unpacks compressed scanline data into bitmap format
 */
export const unpackScanlinesToBitmap = (
  packedScanlines: Array<ScanlineData>,
  width: number,
  height: number
): Uint8Array => {
  const rowbytes = Math.ceil(width / 8)
  const bitmapData = new Uint8Array(height * rowbytes)

  for (const scanlineData of packedScanlines) {
    const unpacked = decodePackBits(scanlineData.compressedBytes)

    // Always take exactly rowbytes bytes
    const scanline = new Uint8Array(rowbytes)
    for (let i = 0; i < rowbytes && i < unpacked.length; i++) {
      const byte = unpacked[i]
      if (byte !== undefined) {
        scanline[i] = byte
      }
    }

    // Place scanline in bitmap data
    bitmapData.set(scanline, scanlineData.lineNumber * rowbytes)
  }

  return bitmapData
}

/**
 * Checks for missing borders in scanlines and returns updated scanline data
 */
export const checkMissingBorders = (
  packedScanlines: Array<ScanlineData>,
  bitmapData: Uint8Array,
  width: number,
  checkColumn: number
): Array<ScanlineData> => {
  const rowbytes = Math.ceil(width / 8)
  let linesWithoutBorderCount = 0

  // Create new array with updated missingBorder flags
  const updatedScanlines = packedScanlines.map(scanlineData => {
    // Check pixel at checkColumn
    const row = scanlineData.lineNumber
    const col = checkColumn
    const byteIndex = row * rowbytes + Math.floor(col / 8)
    const bitIndex = 7 - (col % 8)
    const byte = bitmapData[byteIndex]
    const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

    const hasMissingBorder = bit === 0
    if (hasMissingBorder) {
      linesWithoutBorderCount++
    }

    // Return new object with updated missingBorder flag
    return {
      ...scanlineData,
      missingBorder: hasMissingBorder
    }
  })

  console.log(
    `Found ${linesWithoutBorderCount} lines without black border at pixel ${checkColumn}`
  )

  return updatedScanlines
}

/**
 * Converts bitmap data to RGBA image data
 */
const bitmapToImageData = (
  bitmapData: Uint8Array,
  width: number,
  height: number
): ImageData => {
  const rowbytes = Math.ceil(width / 8)
  const imageDataArray = new Uint8ClampedArray(width * height * 4)

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

  return new ImageData(imageDataArray, width, height)
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
  const startOffset = 0x230

  // Parse scanline data from raw bytes
  const packedScanlines = parseScanlineData(data, startOffset, height)

  // Unpack scanlines into bitmap format
  const bitmapData = unpackScanlinesToBitmap(packedScanlines, width, height)

  // Check for missing borders and get updated scanlines
  const scanlinesWithBorderInfo = checkMissingBorders(
    packedScanlines,
    bitmapData,
    width,
    500
  )

  const repaired = scanlinesWithBorderInfo.map(s => {
    if (!s.missingBorder) {
      return s
    }
    return { ...s, compressedBytes: s.compressedBytes.slice(ADDITIONAL_OFFSET) }
  })

  const newBitmap = unpackScanlinesToBitmap(repaired, width, height)

  // Convert bitmap to RGBA image data
  const image = bitmapToImageData(newBitmap, width, height)

  checkMissingBorders(packedScanlines, newBitmap, width, 500)

  return {
    image,
    packedScanlines: scanlinesWithBorderInfo
  }
}
