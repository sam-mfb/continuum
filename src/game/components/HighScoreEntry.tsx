import React, { useState, useEffect, useRef } from 'react'
import { useAppSelector } from '../store'
import { createRecordingStorage } from '@core/recording'
import { exportRecording } from '../exportRecording'

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
  const inputRef = useRef<HTMLInputElement>(null)
  // Get recording ID from app state (set by game loop on game over)
  const recordingId = useAppSelector(state => state.app.lastRecordingId)

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
      const recording = storage.load(recordingId)
      if (recording) {
        exportRecording(recording, `continuum_recording_${recordingId}.json`)
      }
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

        {recordingId && (
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
