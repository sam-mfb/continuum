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

  return (
    <div
      style={{
        width: `${512 * scale}px`,
        height: `${342 * scale}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        color: 'white',
        fontFamily: 'monospace',
        gap: `${15 * scale}px`
      }}
    >
      <h2
        style={{
          fontSize: `${16 * scale}px`,
          margin: 0,
          letterSpacing: `${1 * scale}px`
        }}
      >
        GAME REPLAYS
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${12 * scale}px`,
          alignItems: 'center'
        }}
      >
        <input
          type="file"
          accept=".json"
          onChange={handleFileLoad}
          style={{
            fontSize: `${7 * scale}px`,
            padding: `${4 * scale}px ${8 * scale}px`,
            cursor: 'pointer',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            fontFamily: 'monospace'
          }}
        />

        {fileError && (
          <div
            style={{
              color: '#ff4444',
              fontSize: `${7 * scale}px`,
              maxWidth: `${400 * scale}px`,
              textAlign: 'center',
              lineHeight: 1.4
            }}
          >
            {fileError}
          </div>
        )}

        {warnings.length > 0 && (
          <div
            style={{
              color: '#ffaa00',
              fontSize: `${7 * scale}px`,
              maxWidth: `${400 * scale}px`,
              textAlign: 'center',
              lineHeight: 1.4
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
              fontSize: `${7 * scale}px`,
              textAlign: 'left',
              border: '1px solid white',
              padding: `${10 * scale}px`,
              backgroundColor: 'black',
              color: 'white',
              lineHeight: 1.6
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
            gap: `${10 * scale}px`
          }}
        >
          <button
            onClick={handleStartReplay}
            disabled={!loadedRecording || !!fileError}
            style={{
              fontSize: `${8 * scale}px`,
              padding: `${4 * scale}px ${10 * scale}px`,
              cursor: loadedRecording && !fileError ? 'pointer' : 'not-allowed',
              opacity: loadedRecording && !fileError ? 1 : 0.5,
              backgroundColor: 'white',
              color: 'black',
              border: '1px solid white',
              fontFamily: 'monospace',
              letterSpacing: `${1 * scale}px`
            }}
          >
            WATCH REPLAY
          </button>

          <button
            onClick={handleBack}
            style={{
              fontSize: `${8 * scale}px`,
              padding: `${4 * scale}px ${10 * scale}px`,
              cursor: 'pointer',
              backgroundColor: 'white',
              color: 'black',
              border: '1px solid white',
              fontFamily: 'monospace',
              letterSpacing: `${1 * scale}px`
            }}
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReplaySelectionScreen
