import type { ControlMatrix } from '@/core/controls'
import type { RootState } from '@/game/store'
import type {
  GameRecording,
  RecordingMetadata,
  InputFrame,
  LevelSeed,
  StateSnapshot,
  FullStateSnapshot
} from './types'

const SNAPSHOT_INTERVAL = 100 // Capture every 100 frames

type RecordingMode = 'idle' | 'recording' | 'replaying'

type RecordingService = {
  // Control recording
  startRecording: (
    metadata: RecordingMetadata,
    enableFullSnapshots?: boolean
  ) => void
  stopRecording: () => GameRecording | null
  isRecording: () => boolean

  // Capture level seeds, inputs, and state snapshots
  recordLevelSeed: (level: number, seed: number) => void
  recordFrame: (
    frameCount: number,
    controls: ControlMatrix,
    state: RootState
  ) => void

  // Control replay
  startReplay: (recording: GameRecording) => void
  stopReplay: () => void
  getReplayControls: (frameCount: number) => ControlMatrix | null
  getLevelSeed: (level: number) => number | null

  // Current mode
  getMode: () => RecordingMode
}

const controlsEqual = (a: ControlMatrix, b: ControlMatrix): boolean => {
  return (
    a.thrust === b.thrust &&
    a.left === b.left &&
    a.right === b.right &&
    a.fire === b.fire &&
    a.shield === b.shield &&
    a.selfDestruct === b.selfDestruct &&
    a.pause === b.pause &&
    a.quit === b.quit &&
    a.nextLevel === b.nextLevel &&
    a.extraLife === b.extraLife &&
    a.map === b.map
  )
}

const hashState = (state: RootState): string => {
  // Hash relevant game state slices (exclude UI state)
  const relevantState = {
    ship: state.ship,
    shots: state.shots,
    planet: state.planet,
    screen: state.screen,
    status: state.status,
    explosions: state.explosions,
    walls: state.walls,
    transition: state.transition
  }

  // Simple hash function
  const stateString = JSON.stringify(relevantState)
  let hash = 0
  for (let i = 0; i < stateString.length; i++) {
    const char = stateString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

const createRecordingService = (): RecordingService => {
  let mode: RecordingMode = 'idle'
  let currentRecording: Partial<GameRecording> | null = null
  let lastControls: ControlMatrix | null = null
  let inputFrames: InputFrame[] = []
  let levelSeeds: LevelSeed[] = []
  let snapshots: StateSnapshot[] = []
  let fullSnapshots: FullStateSnapshot[] = []
  let fullSnapshotsEnabled = false

  // Replay state
  let replayInputs: InputFrame[] = []
  let replayRecording: GameRecording | null = null

  return {
    startRecording: (metadata, enableFullSnapshots = false): void => {
      if (mode !== 'idle') {
        throw new Error(
          `Cannot start recording: currently in ${mode} mode. Call stop first.`
        )
      }
      mode = 'recording'
      currentRecording = { ...metadata, levelSeeds: [], inputs: [] }
      inputFrames = []
      levelSeeds = []
      snapshots = []
      fullSnapshots = []
      fullSnapshotsEnabled = enableFullSnapshots
      lastControls = null
    },

    recordLevelSeed: (level, seed): void => {
      if (mode !== 'recording') return
      levelSeeds.push({ level, seed })
    },

    recordFrame: (frameCount, controls, state): void => {
      if (mode !== 'recording') return

      // Sparse storage: only record when controls change
      if (!lastControls || !controlsEqual(lastControls, controls)) {
        inputFrames.push({ frame: frameCount, controls: { ...controls } })
        lastControls = { ...controls }
      }

      // Capture state snapshot at intervals
      if (frameCount % SNAPSHOT_INTERVAL === 0) {
        // Always capture hash-based snapshot
        snapshots.push({
          frame: frameCount,
          hash: hashState(state)
        })

        // Optionally capture full state snapshot (DEBUG mode)
        if (fullSnapshotsEnabled) {
          fullSnapshots.push({
            frame: frameCount,
            state: {
              ship: state.ship,
              shots: state.shots,
              planet: state.planet,
              screen: state.screen,
              status: state.status,
              explosions: state.explosions,
              walls: state.walls,
              transition: state.transition
            }
          })
        }
      }
    },

    stopRecording: (): GameRecording | null => {
      if (mode !== 'recording') return null
      const recording = {
        ...currentRecording,
        levelSeeds,
        inputs: inputFrames,
        snapshots,
        fullSnapshots: fullSnapshots.length > 0 ? fullSnapshots : undefined
      } as GameRecording
      mode = 'idle'
      currentRecording = null
      inputFrames = []
      levelSeeds = []
      snapshots = []
      fullSnapshots = []
      fullSnapshotsEnabled = false
      lastControls = null
      return recording
    },

    isRecording: (): boolean => mode === 'recording',

    startReplay: (recording): void => {
      if (mode !== 'idle') {
        throw new Error(
          `Cannot start replay: currently in ${mode} mode. Call stop first.`
        )
      }
      mode = 'replaying'
      replayInputs = recording.inputs
      replayRecording = recording
    },

    stopReplay: (): void => {
      if (mode !== 'replaying') return
      mode = 'idle'
      replayInputs = []
      replayRecording = null
    },

    getReplayControls: (frameCount): ControlMatrix | null => {
      if (mode !== 'replaying') return null

      // Find the most recent input frame at or before this frameCount
      // Since inputs are sparse (only stored when controls change),
      // we need to find the last input that's <= frameCount
      let controls: ControlMatrix | null = null

      for (let i = 0; i < replayInputs.length; i++) {
        const input = replayInputs[i]
        if (!input) continue
        if (input.frame > frameCount) break
        controls = input.controls
      }

      return controls
    },

    getLevelSeed: (level): number | null => {
      if (!replayRecording) return null
      const levelSeed = replayRecording.levelSeeds.find(
        ls => ls.level === level
      )
      return levelSeed ? levelSeed.seed : null
    },

    getMode: (): RecordingMode => mode
  }
}

export { createRecordingService, type RecordingService, type RecordingMode }
