import type { GameRecording } from './types'
import { encodeRecordingGzip, decodeRecordingAuto } from './binaryCodec'

const STORAGE_PREFIX = 'continuum_recording_'
const STORAGE_INDEX_KEY = 'continuum_recording_index'
const CURRENT_VERSION = '1.0'

/**
 * Convert ArrayBuffer to base64 string for localStorage
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Convert base64 string back to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

type RecordingIndex = {
  id: string
  timestamp: number
  galaxyId: string
  startLevel: number
}[]

type RecordingStorage = {
  save: (recording: GameRecording) => Promise<string>
  load: (id: string) => Promise<GameRecording | null>
  list: () => RecordingIndex
  delete: (id: string) => void
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
    save: async (recording): Promise<string> => {
      const id = generateId()
      const recordingWithVersion = {
        ...recording,
        version: CURRENT_VERSION
      }

      // Encode to binary with gzip and convert to base64 for storage
      const binaryData = await encodeRecordingGzip(recordingWithVersion)
      const base64Data = arrayBufferToBase64(binaryData)

      localStorage.setItem(STORAGE_PREFIX + id, base64Data)

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

    load: async (id): Promise<GameRecording | null> => {
      const data = localStorage.getItem(STORAGE_PREFIX + id)
      if (!data) return null

      try {
        // Auto-detect format (gzipped binary, binary, or JSON)
        const binaryData = base64ToArrayBuffer(data)
        return await decodeRecordingAuto(binaryData)
      } catch (e) {
        // Fallback: try to parse as legacy JSON format
        try {
          return JSON.parse(data) as GameRecording
        } catch {
          console.error('Failed to parse recording:', e)
          return null
        }
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
    }
  }
}

export { createRecordingStorage, type RecordingStorage }
