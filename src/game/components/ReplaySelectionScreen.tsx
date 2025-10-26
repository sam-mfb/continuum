import React, { type ChangeEvent, useState } from 'react'
import { useAppDispatch, useAppSelector, getStoreServices } from '../store'
import { loadRecording, startReplay } from '../replaySlice'
import { setMode } from '../appSlice'
import { shipSlice } from '@/core/ship'
import { invalidateHighScore } from '../gameSlice'
import { clearExplosions } from '@/core/explosions'
import { loadLevel } from '../levelThunks'
import { GAME_ENGINE_VERSION } from '../version'
import type { GameRecording } from '../recording/types'

type ReplaySelectionScreenProps = {
  scale: number
}

const ReplaySelectionScreen: React.FC<ReplaySelectionScreenProps> = ({
  scale
}) => {
  const dispatch = useAppDispatch()
  const currentGalaxyId = useAppSelector(state => state.app.currentGalaxyId)
  const loadedRecording = useAppSelector(state => state.replay.loadedRecording)

  const [fileError, setFileError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const handleFileLoad = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileError(null)
    setWarnings([])

    const reader = new FileReader()
    reader.onload = (e): void => {
      try {
        const json = e.target?.result as string
        const recording = JSON.parse(json) as GameRecording

        // Validate required fields
        if (
          !recording.version ||
          !recording.engineVersion ||
          !recording.levelSeeds ||
          !recording.inputs
        ) {
          throw new Error('Invalid recording format - missing required fields')
        }

        // Check for galaxy mismatch - BLOCK playback
        if (recording.galaxyId !== currentGalaxyId) {
          setFileError(
            `Galaxy mismatch: Recording is for galaxy "${recording.galaxyId}" but current galaxy is "${currentGalaxyId}". Please load the correct galaxy before replaying.`
          )
          return
        }

        // Store in Redux
        dispatch(loadRecording(recording))

        // Show warnings if needed
        const newWarnings: string[] = []
        if (recording.engineVersion !== GAME_ENGINE_VERSION) {
          newWarnings.push(
            `Engine version mismatch (recording: ${recording.engineVersion}, current: ${GAME_ENGINE_VERSION}) - replay may diverge from original`
          )
        }
        setWarnings(newWarnings)
      } catch (error) {
        console.error('Failed to load recording:', error)
        setFileError(
          error instanceof Error
            ? error.message
            : 'Failed to load recording file'
        )
      }
    }
    reader.readAsText(file)
  }

  const handleStartReplay = (): void => {
    if (!loadedRecording) return

    const recordingService = getStoreServices().recordingService

    // 1. Invalidate high score eligibility
    dispatch(invalidateHighScore())

    // 2. Reset ship state
    dispatch(shipSlice.actions.resetShip())

    // 3. Set initial lives from recording
    dispatch(
      shipSlice.actions.setLives(loadedRecording.initialState.lives ?? 3)
    )

    // 4. Clear explosions
    dispatch(clearExplosions())

    // 5. Initialize RecordingService in replay mode
    recordingService.startReplay(loadedRecording)

    // 6. Load first level with recorded seed
    const firstLevelSeed = loadedRecording.levelSeeds[0]
    if (!firstLevelSeed) {
      console.error('No level seeds in recording')
      return
    }

    dispatch(loadLevel(firstLevelSeed.level, firstLevelSeed.seed))

    // 7. Set replay state and enter replay mode
    dispatch(startReplay())
    dispatch(setMode('replay'))
  }

  const handleBack = (): void => {
    dispatch(setMode('start'))
  }

  const fontSize = Math.floor(14 * scale)
  const buttonFontSize = Math.floor(16 * scale)
  const padding = Math.floor(20 * scale)
  const buttonPadding = Math.floor(10 * scale)

  return (
    <div
      style={{
        width: `${512 * scale}px`,
        height: `${342 * scale}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'monospace',
        gap: `${padding}px`
      }}
    >
      <h2
        style={{
          fontSize: `${Math.floor(24 * scale)}px`,
          margin: 0
        }}
      >
        Watch Replay
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${padding}px`,
          alignItems: 'center'
        }}
      >
        <input
          type="file"
          accept=".json"
          onChange={handleFileLoad}
          style={{
            fontSize: `${fontSize}px`,
            padding: `${buttonPadding}px`,
            cursor: 'pointer'
          }}
        />

        {fileError && (
          <div
            style={{
              color: '#ff4444',
              fontSize: `${fontSize}px`,
              maxWidth: `${400 * scale}px`,
              textAlign: 'center'
            }}
          >
            {fileError}
          </div>
        )}

        {warnings.length > 0 && (
          <div
            style={{
              color: '#ffaa00',
              fontSize: `${fontSize}px`,
              maxWidth: `${400 * scale}px`,
              textAlign: 'center'
            }}
          >
            {warnings.map((warning, i) => (
              <div key={i}>{warning}</div>
            ))}
          </div>
        )}

        {loadedRecording && !fileError && (
          <div
            style={{
              fontSize: `${fontSize}px`,
              textAlign: 'left',
              border: '1px solid #666',
              padding: `${padding}px`,
              backgroundColor: '#111'
            }}
          >
            <div>
              Start Level: {loadedRecording.levelSeeds[0]?.level ?? 'N/A'}
            </div>
            <div>
              Date:{' '}
              {loadedRecording.timestamp
                ? new Date(loadedRecording.timestamp).toLocaleString()
                : 'N/A'}
            </div>
            <div>Engine Version: {loadedRecording.engineVersion}</div>
            <div>Galaxy ID: {loadedRecording.galaxyId}</div>
            <div>
              Duration:{' '}
              {loadedRecording.inputs.length > 0
                ? `${Math.floor((loadedRecording.inputs[loadedRecording.inputs.length - 1]?.frame ?? 0) / 20)}s`
                : 'N/A'}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: `${padding}px`
          }}
        >
          <button
            onClick={handleStartReplay}
            disabled={!loadedRecording || !!fileError}
            style={{
              fontSize: `${buttonFontSize}px`,
              padding: `${buttonPadding}px ${buttonPadding * 2}px`,
              cursor: loadedRecording && !fileError ? 'pointer' : 'not-allowed',
              opacity: loadedRecording && !fileError ? 1 : 0.5,
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #666',
              borderRadius: `${4 * scale}px`
            }}
          >
            Start Replay
          </button>

          <button
            onClick={handleBack}
            style={{
              fontSize: `${buttonFontSize}px`,
              padding: `${buttonPadding}px ${buttonPadding * 2}px`,
              cursor: 'pointer',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #666',
              borderRadius: `${4 * scale}px`
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReplaySelectionScreen
