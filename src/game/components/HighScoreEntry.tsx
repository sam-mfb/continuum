import React, { useState, useEffect, useRef } from 'react'
import { getStoreServices } from '../store'
import { createRecordingStorage } from '../recording/RecordingStorage'

type HighScoreEntryProps = {
  scale: number
  score: number
  planet: number
  fuel: number
  onSubmit: (name: string) => void
}

const HighScoreEntry: React.FC<HighScoreEntryProps> = ({
  scale,
  score,
  planet,
  fuel,
  onSubmit
}) => {
  const [name, setName] = useState('')
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if there's a recording available to export
    const recordingService = getStoreServices().recordingService
    const recording = recordingService.stopRecording()

    if (recording) {
      // Save to storage and get ID
      const storage = createRecordingStorage()
      const id = storage.save(recording)
      setRecordingId(id)
      setHasRecording(true)
      console.log('Recording saved with ID:', id)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    // Only allow alphanumeric and basic characters
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const handleExport = (): void => {
    if (recordingId) {
      const storage = createRecordingStorage()
      storage.exportToFile(recordingId)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${512 * scale}px`,
        height: `${342 * scale}px`,
        backgroundColor: 'black',
        fontFamily: 'monospace',
        color: 'white'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${12 * scale}px`,
          backgroundColor: 'black',
          border: '1px solid white',
          padding: `${15 * scale}px`
        }}
      >
        <h1
          style={{
            fontSize: `${14 * scale}px`,
            margin: 0,
            color: 'white',
            letterSpacing: `${1 * scale}px`,
            textAlign: 'center'
          }}
        >
          NEW HIGH SCORE!
        </h1>

        <div
          style={{
            fontSize: `${9 * scale}px`,
            textAlign: 'center',
            lineHeight: '1.5',
            color: 'white'
          }}
        >
          <div>Score: {score.toLocaleString()}</div>
          <div>Planet: {planet}</div>
          <div>Fuel: {fuel}</div>
        </div>

        {hasRecording && (
          <button
            onClick={handleExport}
            style={{
              fontSize: `${8 * scale}px`,
              padding: `${5 * scale}px ${12 * scale}px`,
              backgroundColor: '#228822',
              color: 'white',
              border: '1px solid white',
              cursor: 'pointer',
              fontFamily: 'monospace',
              letterSpacing: `${0.5 * scale}px`
            }}
          >
            EXPORT RECORDING
          </button>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${10 * scale}px`
          }}
        >
          <label
            style={{
              fontSize: `${8 * scale}px`,
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            Enter Your Name:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={10}
            style={{
              fontSize: `${9 * scale}px`,
              padding: `${4 * scale}px`,
              width: `${100 * scale}px`,
              textAlign: 'center',
              fontFamily: 'monospace',
              border: '1px solid white',
              backgroundColor: 'black',
              color: 'white'
            }}
            placeholder="Enter name"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              fontSize: `${8 * scale}px`,
              padding: `${4 * scale}px ${12 * scale}px`,
              backgroundColor: name.trim() ? 'white' : 'black',
              color: name.trim() ? 'black' : 'white',
              border: '1px solid white',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              letterSpacing: `${0.5 * scale}px`,
              opacity: name.trim() ? 1 : 0.5
            }}
          >
            SUBMIT
          </button>
        </form>
      </div>
    </div>
  )
}

export default HighScoreEntry
