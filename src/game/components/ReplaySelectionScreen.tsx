import React, { type ChangeEvent, useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector, getStoreServices } from '../store'
import { loadRecording, startReplay } from '../replaySlice'
import { setMode } from '../appSlice'
import { shipSlice } from '@/core/ship'
import { markCheatUsed } from '@core/game'
import { clearExplosions } from '@/core/explosions'
import { loadLevel } from '@core/game'
import {
  createRecordingStorage,
  MAX_RECORDINGS,
  type RecordingIndexEntry
} from '@core/recording'
import type { ValidationReport } from '@core/validation'
import { validateRecording } from '../validateRecording'
import { importRecording, exportRecordingBinary } from '../exportRecording'
import { getGalaxyById } from '../galaxyConfig'
import { loadGalaxy } from '../galaxyThunks'

type ReplaySelectionScreenProps = {
  scale: number
}

type ValidationState = {
  [id: string]: ValidationReport | 'validating' | null
}

const ReplaySelectionScreen: React.FC<ReplaySelectionScreenProps> = ({
  scale
}) => {
  const dispatch = useAppDispatch()
  const currentGalaxyId = useAppSelector(state => state.app.currentGalaxyId)

  const [recordings, setRecordings] = useState<RecordingIndexEntry[]>([])
  const [validationStates, setValidationStates] = useState<ValidationState>({})
  const [importError, setImportError] = useState<string | null>(null)

  // Helper function to format duration in mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load recordings list on mount
  useEffect(() => {
    const storage = createRecordingStorage()
    const recordingsList = storage.list()
    // Sort by timestamp descending (newest first)
    const sorted = [...recordingsList].sort((a, b) => b.timestamp - a.timestamp)
    setRecordings(sorted)
  }, [])

  const refreshRecordingsList = (): void => {
    const storage = createRecordingStorage()
    const recordingsList = storage.list()
    const sorted = [...recordingsList].sort((a, b) => b.timestamp - a.timestamp)
    setRecordings(sorted)
  }

  const handleImport = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError(null)

    // Check if at limit
    if (recordings.length >= MAX_RECORDINGS) {
      setImportError(
        `Cannot import: ${MAX_RECORDINGS} recordings limit reached. Delete a recording first.`
      )
      return
    }

    try {
      // Import the recording file
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

      // Save to storage
      const storage = createRecordingStorage()
      await storage.save(recording)

      // Refresh list
      refreshRecordingsList()

      // Clear file input
      event.target.value = ''
    } catch (error) {
      console.error('Failed to import recording:', error)
      setImportError(
        error instanceof Error ? error.message : 'Failed to import recording'
      )
    }
  }

  const handlePlay = async (id: string): Promise<void> => {
    const storage = createRecordingStorage()
    const recording = await storage.load(id)
    if (!recording) {
      console.error('Failed to load recording')
      return
    }

    try {
      // Check if we need to load a different galaxy
      if (recording.galaxyId !== currentGalaxyId) {
        console.log(
          `Loading galaxy ${recording.galaxyId} for replay (current: ${currentGalaxyId})`
        )
        await dispatch(loadGalaxy(recording.galaxyId)).unwrap()
      }

      const recordingService = getStoreServices().recordingService

      // 1. Mark cheat used (replays don't count for high scores)
      dispatch(markCheatUsed())

      // 2. Reset ship state
      dispatch(shipSlice.actions.resetShip())

      // 3. Set initial lives from recording
      dispatch(shipSlice.actions.setLives(recording.initialState.lives ?? 3))

      // 4. Clear explosions
      dispatch(clearExplosions())

      // 5. Initialize RecordingService in replay mode
      recordingService.startReplay(recording)

      // 6. Load first level with recorded seed
      const firstLevelSeed = recording.levelSeeds[0]
      if (!firstLevelSeed) {
        console.error('No level seeds in recording')
        return
      }

      dispatch(loadLevel(firstLevelSeed.level, firstLevelSeed.seed))

      // 7. Store in Redux
      dispatch(loadRecording(recording))

      // 8. Set replay state and enter replay mode
      dispatch(startReplay())
      dispatch(setMode('replay'))
    } catch (error) {
      console.error('Failed to start replay:', error)
      alert(
        `Failed to load galaxy for replay: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleValidate = async (id: string): Promise<void> => {
    const storage = createRecordingStorage()
    const recording = await storage.load(id)
    if (!recording) {
      console.error('Failed to load recording')
      return
    }

    setValidationStates(prev => ({ ...prev, [id]: 'validating' }))

    // Run validation in next tick to allow UI to update
    setTimeout(() => {
      try {
        const services = getStoreServices()
        const report = validateRecording(recording, services)
        setValidationStates(prev => ({ ...prev, [id]: report }))

        // Log to console
        if (report.success) {
          console.log(`✅ Recording ${id} validation PASSED`)
        } else {
          console.error(`❌ Recording ${id} validation FAILED`)
          console.error(`  Errors: ${report.errors.length}`)
          report.errors.forEach(error => {
            console.error(`  Frame ${error.frame}:`, error)
          })
        }
      } catch (error) {
        console.error('Validation error:', error)
        setValidationStates(prev => ({
          ...prev,
          [id]: {
            success: false,
            framesValidated: 0,
            snapshotsChecked: 0,
            divergenceFrame: null,
            finalStateMatch: false,
            errors: []
          }
        }))
      }
    }, 10)
  }

  const handleExport = async (id: string): Promise<void> => {
    const storage = createRecordingStorage()
    const recording = await storage.load(id)
    if (recording) {
      await exportRecordingBinary(recording, `continuum_recording_${id}.bin`)
    }
  }

  const handleDelete = (id: string): void => {
    if (confirm('Delete this recording?')) {
      const storage = createRecordingStorage()
      storage.delete(id)
      refreshRecordingsList()
      // Clear validation state for deleted recording
      setValidationStates(prev => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })
    }
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
        backgroundColor: 'black',
        color: 'white',
        fontFamily: 'monospace',
        padding: `${10 * scale}px`,
        overflow: 'hidden'
      }}
    >
      <h2
        style={{
          fontSize: `${14 * scale}px`,
          margin: 0,
          marginBottom: `${10 * scale}px`,
          letterSpacing: `${1 * scale}px`,
          textAlign: 'center'
        }}
      >
        GAME REPLAYS
      </h2>

      {/* Import section */}
      <div
        style={{
          marginBottom: `${12 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${6 * scale}px`,
          borderBottom: '1px solid #666',
          paddingBottom: `${10 * scale}px`
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${8 * scale}px`,
            fontSize: `${7 * scale}px`
          }}
        >
          <input
            type="file"
            accept=".json,.bin"
            onChange={handleImport}
            disabled={recordings.length >= MAX_RECORDINGS}
            style={{
              fontSize: `${6 * scale}px`,
              padding: `${3 * scale}px ${6 * scale}px`,
              cursor:
                recordings.length >= MAX_RECORDINGS ? 'not-allowed' : 'pointer',
              opacity: recordings.length >= MAX_RECORDINGS ? 0.5 : 1,
              fontFamily: 'monospace'
            }}
          />
          <span>
            {recordings.length} / {MAX_RECORDINGS}
          </span>
        </div>

        {recordings.length >= MAX_RECORDINGS && (
          <div style={{ color: '#ffaa00', fontSize: `${6 * scale}px` }}>
            Storage full - delete a recording to import more
          </div>
        )}

        {importError && (
          <div style={{ color: '#ff4444', fontSize: `${6 * scale}px` }}>
            {importError}
          </div>
        )}
      </div>

      {/* Recordings list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: `${8 * scale}px`
        }}
      >
        {recordings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#888',
              fontSize: `${7 * scale}px`,
              marginTop: `${20 * scale}px`
            }}
          >
            No recordings saved. Play a game to create a recording.
          </div>
        ) : (
          recordings.map(recording => {
            const validationState = validationStates[recording.id]
            return (
              <div
                key={recording.id}
                style={{
                  border: '1px solid white',
                  padding: `${6 * scale}px`,
                  fontSize: `${6 * scale}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${4 * scale}px`
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>{new Date(recording.timestamp).toLocaleString()}</span>
                  {recording.durationSeconds !== undefined && (
                    <span>{formatDuration(recording.durationSeconds)}</span>
                  )}
                </div>
                <div style={{ color: '#aaa' }}>
                  {recording.finalLevel !== undefined
                    ? `Ended: Level ${recording.finalLevel}`
                    : `Started: Level ${recording.startLevel}`}
                </div>
                <div style={{ color: '#aaa' }}>
                  Galaxy:{' '}
                  {getGalaxyById(recording.galaxyId)?.name ??
                    recording.galaxyId}
                </div>
                {recording.finalScore !== undefined && (
                  <div style={{ color: '#aaa' }}>
                    Score: {recording.finalScore.toLocaleString()}
                  </div>
                )}

                {/* Validation status */}
                {validationState && (
                  <div
                    style={{
                      marginTop: `${2 * scale}px`,
                      paddingTop: `${4 * scale}px`,
                      borderTop: '1px solid #666'
                    }}
                  >
                    {validationState === 'validating' ? (
                      <span style={{ color: '#ffaa00' }}>Validating...</span>
                    ) : (
                      <span
                        style={{
                          color: validationState.success ? '#00ff00' : '#ff4444'
                        }}
                      >
                        {validationState.success
                          ? '✓ PASSED'
                          : `✗ FAILED (${validationState.errors.length} errors)`}
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: `${4 * scale}px`,
                    marginTop: `${4 * scale}px`
                  }}
                >
                  <button
                    onClick={() => handlePlay(recording.id)}
                    style={{
                      fontSize: `${6 * scale}px`,
                      padding: `${3 * scale}px ${6 * scale}px`,
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    PLAY
                  </button>
                  <button
                    onClick={() => handleValidate(recording.id)}
                    disabled={validationState === 'validating'}
                    style={{
                      fontSize: `${6 * scale}px`,
                      padding: `${3 * scale}px ${6 * scale}px`,
                      backgroundColor: '#4444ff',
                      color: 'white',
                      border: 'none',
                      cursor:
                        validationState === 'validating'
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: validationState === 'validating' ? 0.5 : 1,
                      fontFamily: 'monospace'
                    }}
                  >
                    VALIDATE
                  </button>
                  <button
                    onClick={() => handleExport(recording.id)}
                    style={{
                      fontSize: `${6 * scale}px`,
                      padding: `${3 * scale}px ${6 * scale}px`,
                      backgroundColor: '#228822',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    EXPORT
                  </button>
                  <button
                    onClick={() => handleDelete(recording.id)}
                    style={{
                      fontSize: `${6 * scale}px`,
                      padding: `${3 * scale}px ${6 * scale}px`,
                      backgroundColor: '#cc0000',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Back button */}
      <div
        style={{
          marginTop: `${12 * scale}px`,
          textAlign: 'center'
        }}
      >
        <button
          onClick={handleBack}
          style={{
            fontSize: `${8 * scale}px`,
            padding: `${4 * scale}px ${12 * scale}px`,
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: `${1 * scale}px`
          }}
        >
          BACK
        </button>
      </div>
    </div>
  )
}

export default ReplaySelectionScreen
