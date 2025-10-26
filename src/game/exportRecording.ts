import type { GameRecording } from '@core/recording'
import {
  encodeRecordingGzip,
  decodeRecordingAuto
} from '@core/recording/binaryCodec'
import { compress, decompress } from '@core/recording/gzip.browser'

/**
 * Export a recording to a downloadable JSON file
 * Browser-only function that creates a download link
 * Useful for debugging and human-readable exports
 */
export const exportRecording = (
  recording: GameRecording,
  filename: string
): void => {
  const json = JSON.stringify(recording, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export a recording to a downloadable binary file with gzip compression
 * Much smaller than JSON format (~96% reduction with gzip)
 */
export const exportRecordingBinary = async (
  recording: GameRecording,
  filename: string
): Promise<void> => {
  const binaryData = await encodeRecordingGzip(recording, compress)
  const blob = new Blob([binaryData], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import a recording from a file
 * Automatically detects format (gzipped binary, binary, or JSON) and decodes appropriately
 */
export const importRecording = async (file: File): Promise<GameRecording> => {
  const arrayBuffer = await file.arrayBuffer()
  return await decodeRecordingAuto(arrayBuffer, decompress)
}
