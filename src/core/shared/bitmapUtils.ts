/**
 * @fileoverview Bitmap utilities for processing compressed and uncompressed bitmap data
 * Originally from src/dev/art/utils.ts
 */

const blackPixel = (bArray: number[]): number[] => {
  bArray.push(0)
  bArray.push(0)
  bArray.push(0)
  bArray.push(255)
  return bArray
}

const whitePixel = (bArray: number[]): number[] => {
  bArray.push(255)
  bArray.push(255)
  bArray.push(255)
  bArray.push(255)
  return bArray
}

const byteToPixels = (byte: number, bArray: number[]): number[] => {
  for (let x = 7; x >= 0; x--) {
    let bit = byte >>> x
    bit &= 1
    bArray = bit === 1 ? blackPixel(bArray) : whitePixel(bArray)
  }
  return bArray
}

export const bytesToImageData = (
  bytes: Uint8Array<ArrayBuffer>
): Uint8ClampedArray<ArrayBuffer> => {
  let bArray: number[] = []
  for (let byte of bytes) {
    bArray = byteToPixels(byte, bArray)
  }
  return new Uint8ClampedArray(bArray)
}

const unpackBytes = (
  intArray: Uint8Array<ArrayBuffer>,
  bytePtr: number,
  length: number
): { bytePtr: number; unpackedArray: Uint8Array<ArrayBuffer> } => {
  let unpackedBytes: number[] = []

  // Process compressed data until we have enough bytes or run out of input
  while (unpackedBytes.length < length && bytePtr < intArray.length) {
    let code = intArray[bytePtr]
    bytePtr++

    if (code !== undefined && code < 128) {
      // Literal run: copy next (code + 1) bytes
      let numBytes = code + 1
      let endPtr = Math.min(bytePtr + numBytes, intArray.length)

      // Copy available bytes
      for (let i = bytePtr; i < endPtr; i++) {
        const byte = intArray[i]
        if (byte !== undefined) {
          unpackedBytes.push(byte)
        }
      }

      bytePtr += numBytes
    } else if (code !== undefined && code > 128) {
      // Repeat run: repeat next byte (257 - code) times
      let repeatCount = 257 - code

      if (bytePtr < intArray.length) {
        const byteToCopy = intArray[bytePtr]
        if (byteToCopy !== undefined) {
          for (let i = 0; i < repeatCount; i++) {
            unpackedBytes.push(byteToCopy)
          }
        }
        bytePtr++
      } else {
        // No byte to repeat, break out
        break
      }
    }
    // code === 128 is a no-op, bytePtr already incremented
  }

  // Pad with zeros (white pixels) if we didn't get enough data
  while (unpackedBytes.length < length) {
    unpackedBytes.push(0)
  }

  return {
    bytePtr: bytePtr,
    unpackedArray: new Uint8Array(unpackedBytes)
  }
}

const handleMacPaint = (arraybuffer: ArrayBuffer): Uint8Array<ArrayBuffer> => {
  const lines = 720
  const packedBytes = new Uint8Array(arraybuffer.slice(512))
  const unpackedBytes = new Uint8Array(lines * 72)
  let bytePtr = 0

  for (let line = 0; line < lines; line++) {
    let unpackedObj = unpackBytes(packedBytes, bytePtr, 72)
    bytePtr = unpackedObj.bytePtr
    unpackedBytes.set(unpackedObj.unpackedArray, line * 72)

    // Check if we've run out of data
    if (bytePtr >= packedBytes.length && line < lines - 1) {
      console.warn(`MacPaint data ended early at line ${line + 1} of ${lines}`)
      break
    }
  }

  return unpackedBytes
}

export function macPaintToImageData(
  macPaint: ArrayBuffer
): Uint8ClampedArray<ArrayBuffer> {
  return bytesToImageData(handleMacPaint(macPaint))
}

/**
 * Decompresses compressed bitmap resource data from Continuum's MISC resources
 * Based on expandtitlepage() from orig/Sources/Main.c lines 1063-1086
 *
 * The original function unpacks 72 bytes per line but only uses the first 64 bytes
 * to create a 512-pixel-wide bitmap. The height varies by resource:
 * - RSRC 261 (M_TITLEPAGE): 342 lines (SCRHT)
 * - RSRC 260 (M_FIGS): 684 lines (SCRHT * 2)
 *
 * @param compressedData - The compressed bitmap data from the resource
 * @param height - Number of scanlines to decompress (default: 342)
 * @returns Decompressed bitmap data (1 bit per pixel, 64 bytes per line)
 */
export function expandTitlePage(
  compressedData: ArrayBuffer,
  height: number = 342 // Default to SCRHT from GW.h
): Uint8Array {
  const lines = height
  const packedBytes = new Uint8Array(compressedData)
  const unpackedBytes = new Uint8Array(lines * 64) // 64 bytes per line (512 pixels / 8)
  let dataPtr = 0

  for (let i = 0; i < lines; i++) {
    // Unpack 72 bytes into destbuf, then take first 64
    const unpackedLine = unpackBytes(packedBytes, dataPtr, 72)
    dataPtr = unpackedLine.bytePtr

    // Copy first 64 bytes to destination (ignore last 8 bytes)
    const lineStart = i * 64
    for (let j = 0; j < 64; j++) {
      const byte = unpackedLine.unpackedArray[j]
      if (byte !== undefined) {
        unpackedBytes[lineStart + j] = byte
      }
    }

    // Check if we've run out of data
    if (dataPtr >= packedBytes.length && i < lines - 1) {
      console.warn(`Data ended early at line ${i + 1} of ${lines}`)
      break
    }
  }

  return unpackedBytes
}

/**
 * Decompresses compressed bitmap resource data and converts to RGBA ImageData
 * This is a convenience wrapper around expandTitlePage() that converts the
 * 1-bit-per-pixel data to RGBA format suitable for HTML Canvas ImageData
 *
 * @param compressedData - The compressed bitmap data from the resource
 * @param height - Number of scanlines to decompress (default: 342)
 * @returns RGBA image data ready for ImageData constructor
 */
export function expandTitlePageToImageData(
  compressedData: ArrayBuffer,
  height: number = 342 // Default to SCRHT from GW.h
): Uint8ClampedArray<ArrayBuffer> {
  return bytesToImageData(expandTitlePage(compressedData, height))
}

/**
 * Converts raw bitmap data (uncompressed 1-bit-per-pixel) to ImageData
 * For 512x342 screen: 64 bytes per line × 342 lines = 21,888 bytes
 */
export function rawBitmapToImageData(
  rawData: ArrayBuffer
): Uint8ClampedArray<ArrayBuffer> {
  return bytesToImageData(new Uint8Array(rawData))
}
