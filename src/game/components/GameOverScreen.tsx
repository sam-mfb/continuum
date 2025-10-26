import React, { useEffect } from 'react'
import { useAppSelector } from '../store'
import { createRecordingStorage } from '@core/recording'
import { exportRecordingBinary } from '../exportRecording'

type GameOverScreenProps = {
  scale: number
  onContinue: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  scale,
  onContinue
}): React.ReactElement => {
  // Get recording ID from app state (set by game loop on game over)
  const recordingId = useAppSelector(state => state.app.lastRecordingId)
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
      const recording = storage.load(recordingId)
      if (recording) {
        exportRecordingBinary(
          recording,
          `continuum_recording_${recordingId}.bin`
        )
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
