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
 * Decompresses the title page resource data from RSRC 261 (M_TITLEPAGE)
 * Based on expandtitlepage() from orig/Sources/Main.c lines 1063-1086
 * 
 * The original function unpacks 72 bytes per line but only uses the first 64 bytes
 * to create a 512x342 pixel bitmap (original Mac screen dimensions)
 */
export function expandTitlePageToImageData(
  compressedData: ArrayBuffer
): Uint8ClampedArray<ArrayBuffer> {
  const lines = 342 // SCRHT from GW.h
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
      console.warn(`Title page data ended early at line ${i + 1} of ${lines}`)
      break
    }
  }
  
  return bytesToImageData(unpackedBytes)
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
 * Decodes Continuum Title Page PICT format
 * This is a variant PICT with:
 * - Header through offset 0x22F
 * - 504x311 pixel bitmap
 * - Length-prefixed PackBits compressed scanlines
 * - Optional 0x0098 (PackBitsRect) opcodes
 */
export function continuumTitlePictToImageData(
  pictData: ArrayBuffer
): ImageData {
  const data = new Uint8Array(pictData)
  
  // Image dimensions from PICT header analysis
  const width = 504
  const height = 311
  const rowbytes = 63 // (504 + 7) / 8
  
  // Start of image data after header
  let offset = 0x230
  const scanlines: Uint8Array[] = []
  // let inRectMode = false  // Reserved for future use
  
  while (offset < data.length && scanlines.length < height) {
    if (offset >= data.length) break
    
    // Check for PackBitsRect opcode (0x0098)
    if (offset + 1 < data.length && data[offset] === 0x00 && data[offset + 1] === 0x98) {
      offset += 2
      // Skip rect bounds (8 bytes)
      offset += 8
      // inRectMode = true
      continue
    }
    
    // Read single-byte length
    const lineLength = data[offset]
    if (lineLength === undefined) break
    
    offset += 1
    
    // Validate line length - PackBits for a 63-byte line shouldn't exceed ~126 bytes
    if (lineLength > 126) {
      // This is probably not a valid scanline length
      // Try to find the next valid scanline
      offset -= 1  // Back up
      
      // Look for a reasonable length byte
      let found = false
      for (let i = 0; i < 10 && offset + i < data.length; i++) {
        const testLength = data[offset + i]
        if (testLength !== undefined && testLength > 0 && testLength <= 126) {
          // Check if this could produce a valid scanline
          if (offset + i + 1 + testLength <= data.length) {
            offset += i
            found = true
            break
          }
        }
      }
      
      if (!found) {
        offset += 1
        continue
      } else {
        continue  // Re-process from the new offset
      }
    }
    
    // Decode scanline
    if (lineLength > 0 && offset + lineLength <= data.length) {
      const packedLine = data.slice(offset, offset + lineLength)
      const unpacked = decodePackBits(packedLine)
      
      // Validate unpacked length
      if (unpacked.length > rowbytes * 2) {
        // Something went wrong with decoding
        offset += lineLength
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
      
      offset += lineLength
    } else if (lineLength === 0) {
      // Skip zero-length lines
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
  
  // Convert to RGBA image data
  const imageDataArray = new Uint8ClampedArray(width * height * 4)
  
  // First pass: identify all lines without black border at pixel 500
  const problematicLines: number[] = []
  for (let row = 0; row < height; row++) {
    // Check pixel 500 (column 500)
    const col = 500
    const byteIndex = row * rowbytes + Math.floor(col / 8)
    const bitIndex = 7 - (col % 8)
    const byte = bitmapData[byteIndex]
    const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0
    
    if (bit === 0) { // White pixel at position 500
      problematicLines.push(row)
    }
  }
  
  console.log(`Found ${problematicLines.length} lines without black border at pixel 500:`, problematicLines)
  
  // Second pass: render with colors
  for (let row = 0; row < height; row++) {
    const isProblematic = problematicLines.includes(row)
    const isTenthLine = row % 10 === 0
    
    for (let col = 0; col < width; col++) {
      const byteIndex = row * rowbytes + Math.floor(col / 8)
      const bitIndex = 7 - (col % 8)
      const byte = bitmapData[byteIndex]
      const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0
      
      const pixelIndex = (row * width + col) * 4
      
      if (isProblematic) {
        // Problematic lines: red for black pixels, cyan for white pixels
        if (bit) {
          imageDataArray[pixelIndex] = 255     // R
          imageDataArray[pixelIndex + 1] = 0   // G
          imageDataArray[pixelIndex + 2] = 0   // B
        } else {
          imageDataArray[pixelIndex] = 0       // R
          imageDataArray[pixelIndex + 1] = 255 // G
          imageDataArray[pixelIndex + 2] = 255 // B
        }
      } else if (isTenthLine && bit) {
        // Every 10th line: green for black pixels
        imageDataArray[pixelIndex] = 0       // R
        imageDataArray[pixelIndex + 1] = 255 // G
        imageDataArray[pixelIndex + 2] = 0   // B
      } else {
        // Normal rendering: black and white
        const value = bit ? 0 : 255 // 1 = black, 0 = white
        imageDataArray[pixelIndex] = value     // R
        imageDataArray[pixelIndex + 1] = value // G
        imageDataArray[pixelIndex + 2] = value // B
      }
      imageDataArray[pixelIndex + 3] = 255   // A
    }
  }
  
  return new ImageData(imageDataArray, width, height)
}
