import type { GameRecording } from '@core/recording'
import { encodeRecording, decodeRecording } from '@core/recording/binaryCodec'

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
 * Export a recording to a downloadable binary file
 * Much smaller than JSON format (~85% reduction)
 */
export const exportRecordingBinary = (
  recording: GameRecording,
  filename: string
): void => {
  const binaryData = encodeRecording(recording)
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
 * Automatically detects format (binary or JSON) and decodes appropriately
 */
export const importRecording = async (file: File): Promise<GameRecording> => {
  const arrayBuffer = await file.arrayBuffer()

  // Check if it's binary format by looking for magic number
  const bytes = new Uint8Array(arrayBuffer)
  const magic = new TextDecoder().decode(bytes.slice(0, 5))

  if (magic === 'CNREC') {
    // Binary format
    return decodeRecording(arrayBuffer)
  } else {
    // JSON format
    const text = new TextDecoder().decode(arrayBuffer)
    return JSON.parse(text) as GameRecording
  }
}
