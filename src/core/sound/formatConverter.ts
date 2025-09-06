/**
 * Format Converter Module
 *
 * Converts 8-bit unsigned audio data (0-255) to float32 (-1.0 to 1.0) format
 * required by Web Audio API. This bridges the original Mac format (center=128)
 * to Web Audio format (center=0.0).
 *
 * This is a pure function module with no side effects.
 */

/**
 * Converts a single 8-bit unsigned sample to float32.
 *
 * @param sample - 8-bit unsigned value (0-255)
 * @returns float32 value (-1.0 to 1.0)
 */
export function convertSample(sample: number): number {
  // Original Mac format: 0x80 (128) is silence/center
  // Web Audio format: 0.0 is silence/center
  // Conversion: (sample - 128) / 128
  // But we need to handle the asymmetry of 8-bit signed values
  // -128 to 127, so we use 127 for positive scaling
  return (sample - 128) / 128
}

/**
 * Converts an array of 8-bit unsigned samples to float32 array.
 *
 * @param samples - Uint8Array of 8-bit unsigned samples
 * @returns Float32Array of converted samples (-1.0 to 1.0)
 */
export function convertBuffer(samples: Uint8Array): Float32Array {
  return Float32Array.from(samples, convertSample)
}

/**
 * Converts an array of 8-bit unsigned samples to float32 array in-place.
 * This is more efficient for scenarios where you already have a Float32Array
 * allocated and want to avoid creating a new one.
 *
 * @param samples - Uint8Array of 8-bit unsigned samples
 * @param output - Float32Array to write converted samples to
 * @param offset - Offset in output array to start writing at (default: 0)
 * @returns Number of samples converted
 */
export function convertBufferInPlace(
  samples: Uint8Array,
  output: Float32Array,
  offset: number = 0
): number {
  const samplesToConvert = Math.min(samples.length, output.length - offset)

  for (let i = 0; i < samplesToConvert; i++) {
    output[offset + i] = convertSample(samples[i]!)
  }

  return samplesToConvert
}

/**
 * Batch converts multiple 370-byte chunks efficiently.
 * Useful for converting multiple generator outputs at once.
 *
 * @param chunks - Array of Uint8Array chunks to convert
 * @returns Single Float32Array containing all converted samples
 */
export function convertChunks(chunks: Uint8Array[]): Float32Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    convertBufferInPlace(chunk, output, offset)
    offset += chunk.length
  }

  return output
}
