/**
 * @fileoverview Node.js-specific gzip implementation using zlib
 */

import { promisify } from 'util'
import { gzip as zlibGzip, gunzip as zlibGunzip } from 'zlib'

const gzipAsync = promisify(zlibGzip)
const gunzipAsync = promisify(zlibGunzip)

/**
 * Compress data using gzip (Node.js implementation)
 */
export const compress = async (data: ArrayBuffer): Promise<ArrayBuffer> => {
  const buffer = Buffer.from(data)
  const compressed = await gzipAsync(buffer)
  // Return a properly-sized ArrayBuffer (not a pooled buffer view)
  return compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength
  )
}

/**
 * Decompress gzip data (Node.js implementation)
 */
export const decompress = async (data: ArrayBuffer): Promise<ArrayBuffer> => {
  const buffer = Buffer.from(data)
  const decompressed = await gunzipAsync(buffer)
  // Return a properly-sized ArrayBuffer (not a pooled buffer view)
  return decompressed.buffer.slice(
    decompressed.byteOffset,
    decompressed.byteOffset + decompressed.byteLength
  )
}
