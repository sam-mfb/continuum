import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getStoreServices, type RootState } from '../store'
import { createRecordingStorage } from '../recording/RecordingStorage'

type GameOverScreenProps = {
  scale: number
  onContinue: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  scale,
  onContinue
}): React.ReactElement => {
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const state = useSelector((state: RootState) => state)

  useEffect(() => {
    // Check if there's a recording available to export
    const recordingService = getStoreServices().recordingService
    const recording = recordingService.stopRecording(state)

    if (recording) {
      // Save to storage and get ID
      const storage = createRecordingStorage()
      const id = storage.save(recording)
      setRecordingId(id)
      setHasRecording(true)
      console.log('Recording saved with ID:', id)
    }
  }, [state])
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onContinue()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return (): void => window.removeEventListener('keydown', handleKeyPress)
  }, [onContinue])

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
          gap: `${20 * scale}px`
        }}
      >
        <h1
          style={{
            fontSize: `${24 * scale}px`,
            margin: 0,
            letterSpacing: `${2 * scale}px`,
            fontWeight: 'bold'
          }}
        >
          GAME OVER
        </h1>

        <div
          style={{
            fontSize: `${8 * scale}px`,
            color: 'white',
            marginTop: `${10 * scale}px`
          }}
        >
          Press SPACE or ENTER to continue
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
              letterSpacing: `${0.5 * scale}px`,
              marginTop: `${5 * scale}px`
            }}
          >
            EXPORT RECORDING
          </button>
        )}

        <button
          onClick={onContinue}
          style={{
            fontSize: `${8 * scale}px`,
            padding: `${5 * scale}px ${12 * scale}px`,
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: `${0.5 * scale}px`,
            marginTop: `${10 * scale}px`
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}

export default GameOverScreen
