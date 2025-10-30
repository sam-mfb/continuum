/**
 * @fileoverview Gzip compression interface for recording codec
 *
 * Defines the interface for gzip compression/decompression functions.
 * Platform-specific implementations are in gzip.browser.ts and gzip.node.ts
 */

/**
 * Gzip compression interface
 */
export type GzipInterface = {
  /**
   * Compress data using gzip
   */
  compress: (data: ArrayBuffer) => Promise<ArrayBuffer>

  /**
   * Decompress gzip data
   */
  decompress: (data: ArrayBuffer) => Promise<ArrayBuffer>
}
