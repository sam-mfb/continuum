import type { GameRecording } from './types'

/**
 * Export a recording to a downloadable JSON file
 * Browser-only function that creates a download link
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
