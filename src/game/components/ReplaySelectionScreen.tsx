import React, { type ChangeEvent, useState } from 'react'
import { useAppDispatch, useAppSelector, getStoreServices } from '../store'
import { loadRecording, startReplay } from '../replaySlice'
import { setMode } from '../appSlice'
import { shipSlice } from '@/core/ship'
import { markCheatUsed } from '@core/game'
import { clearExplosions } from '@/core/explosions'
import { loadLevel } from '@core/game'
import { GAME_ENGINE_VERSION } from '../version'
import type { ValidationReport } from '@core/validation'
import { validateRecording } from '../validateRecording'
import { importRecording } from '../exportRecording'

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
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleFileLoad = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileError(null)
    setWarnings([])
    setValidationReport(null)
    setIsValidating(false)

    try {
      // Use importRecording to handle both binary and JSON formats
      const recording = await importRecording(file)

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

      // Validate recording automatically
      setIsValidating(true)
      setTimeout(() => {
        try {
          const services = getStoreServices()
          const report = validateRecording(recording, services)

          setValidationReport(report)

          // Log validation results to console
          if (report.success) {
            console.log('✅ Recording validation PASSED')
            console.log(
              `  Frames validated: ${report.framesValidated}, Snapshots checked: ${report.snapshotsChecked}`
            )
            if (recording.finalState) {
              console.log(`  Final score: ${recording.finalState.score}`)
            }
          } else {
            console.error('❌ Recording validation FAILED')
            console.error(`  Errors found: ${report.errors.length}`)
            if (report.divergenceFrame !== null) {
              console.error(
                `  First divergence at frame: ${report.divergenceFrame}`
              )
            }
            if (!report.finalStateMatch && report.finalStateErrors) {
              console.error('  Final state errors:', report.finalStateErrors)
            }
            // Log all errors
            report.errors.forEach(error => {
              console.error(`  Frame ${error.frame}:`, error)
            })
          }
        } catch (error) {
          console.error('Failed to validate recording:', error)
          setValidationReport({
            success: false,
            framesValidated: 0,
            snapshotsChecked: 0,
            divergenceFrame: null,
            finalStateMatch: false,
            errors: []
          })
        } finally {
          setIsValidating(false)
        }
      }, 100) // Small delay to allow UI to update
    } catch (error) {
      console.error('Failed to load recording:', error)
      setFileError(
        error instanceof Error ? error.message : 'Failed to load recording file'
      )
    }
  }

  const handleStartReplay = (): void => {
    if (!loadedRecording) return

    const recordingService = getStoreServices().recordingService

    // 1. Mark cheat used (replays don't count for high scores)
    dispatch(markCheatUsed())

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
          accept=".json,.bin"
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
            <div
              style={{
                marginTop: `${5 * scale}px`,
                paddingTop: `${5 * scale}px`,
                borderTop: '1px solid #666'
              }}
            >
              Validation Status:{' '}
              {isValidating ? (
                <span style={{ color: '#ffaa00' }}>Validating...</span>
              ) : validationReport ? (
                <span
                  style={{
                    color: validationReport.success ? '#00ff00' : '#ff4444'
                  }}
                >
                  {validationReport.success ? '✓ PASSED' : '✗ FAILED'}
                </span>
              ) : (
                <span style={{ color: '#888' }}>Not validated</span>
              )}
            </div>
            {validationReport &&
              validationReport.success &&
              loadedRecording.finalState && (
                <div>Validated Score: {loadedRecording.finalState.score}</div>
              )}
            {validationReport && !validationReport.success && (
              <div style={{ color: '#ff4444' }}>
                Errors: {validationReport.errors.length} (see console)
              </div>
            )}
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
