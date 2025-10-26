/**
 * @fileoverview Browser-specific gzip implementation using CompressionStream API
 */

import type { GzipInterface } from './gzip'

/**
 * Compress data using gzip (browser implementation)
 */
export const compress: GzipInterface['compress'] = async (
  data: ArrayBuffer
): Promise<ArrayBuffer> => {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  const compressed = await new Response(stream).arrayBuffer()
  return compressed
}

/**
 * Decompress gzip data (browser implementation)
 */
export const decompress: GzipInterface['decompress'] = async (
  data: ArrayBuffer
): Promise<ArrayBuffer> => {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  const decompressed = await new Response(stream).arrayBuffer()
  return decompressed
}
