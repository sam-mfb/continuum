import type { GameRecording } from './types'

const STORAGE_PREFIX = 'continuum_recording_'
const STORAGE_INDEX_KEY = 'continuum_recording_index'
const CURRENT_VERSION = '1.0'

type RecordingIndex = {
  id: string
  timestamp: number
  galaxyId: string
  startLevel: number
}[]

type RecordingStorage = {
  save: (recording: GameRecording) => string
  load: (id: string) => GameRecording | null
  list: () => RecordingIndex
  delete: (id: string) => void
  exportToFile: (id: string) => void
}

const createRecordingStorage = (): RecordingStorage => {
  const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const getIndex = (): RecordingIndex => {
    const indexJson = localStorage.getItem(STORAGE_INDEX_KEY)
    return indexJson ? JSON.parse(indexJson) : []
  }

  const saveIndex = (index: RecordingIndex): void => {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index))
  }

  return {
    save: (recording): string => {
      const id = generateId()
      const recordingWithVersion = {
        ...recording,
        version: CURRENT_VERSION
      }

      // Save recording data
      localStorage.setItem(
        STORAGE_PREFIX + id,
        JSON.stringify(recordingWithVersion)
      )

      // Update index
      const index = getIndex()
      index.push({
        id,
        timestamp: recording.timestamp,
        galaxyId: recording.galaxyId,
        startLevel: recording.startLevel
      })
      saveIndex(index)

      return id
    },

    load: (id): GameRecording | null => {
      const json = localStorage.getItem(STORAGE_PREFIX + id)
      if (!json) return null

      try {
        return JSON.parse(json) as GameRecording
      } catch (e) {
        console.error('Failed to parse recording:', e)
        return null
      }
    },

    list: (): RecordingIndex => {
      return getIndex()
    },

    delete: (id): void => {
      localStorage.removeItem(STORAGE_PREFIX + id)

      const index = getIndex()
      const filtered = index.filter(item => item.id !== id)
      saveIndex(filtered)
    },

    exportToFile: (id): void => {
      const recording = localStorage.getItem(STORAGE_PREFIX + id)
      if (!recording) return

      const blob = new Blob([recording], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `continuum_recording_${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}

export { createRecordingStorage, type RecordingStorage }
