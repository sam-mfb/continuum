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
  let unpackedBytes = []
  
  // Process compressed data until we have enough bytes or run out of input
  while (unpackedBytes.length < length && bytePtr < intArray.length) {
    let code = intArray[bytePtr]
    bytePtr++
    
    if (code < 128) {
      // Literal run: copy next (code + 1) bytes
      let numBytes = code + 1
      let endPtr = Math.min(bytePtr + numBytes, intArray.length)
      
      // Copy available bytes
      for (let i = bytePtr; i < endPtr; i++) {
        unpackedBytes.push(intArray[i])
      }
      
      bytePtr += numBytes
    } else if (code > 128) {
      // Repeat run: repeat next byte (257 - code) times
      let repeatCount = 257 - code
      
      if (bytePtr < intArray.length) {
        const byteToCopy = intArray[bytePtr]
        for (let i = 0; i < repeatCount; i++) {
          unpackedBytes.push(byteToCopy)
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
