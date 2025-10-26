import type { ControlMatrix } from '@/core/controls'
import type { GameRootState } from '@core/game'

export type RecordingMetadata = {
  engineVersion: number
  galaxyId: string
  startLevel: number
  timestamp: number
  initialState: RecordingInitialState
}

export type RecordingInitialState = {
  lives: number
}

export type InputFrame = {
  frame: number
  controls: ControlMatrix
}

export type StateSnapshot = {
  frame: number
  hash: string // Hash of relevant game state slices
}

export type FullStateSnapshot = {
  frame: number
  state: GameRootState
}

export type LevelSeed = {
  level: number
  seed: number
}

export type FinalGameState = {
  score: number
  fuel: number
  level: number
}

export type GameRecording = {
  version: string // Recording format version
  engineVersion: number // Game engine version (physics/logic)
  levelSeeds: LevelSeed[] // Seeds for each level played
  galaxyId: string // Hash of galaxy file
  startLevel: number
  timestamp: number
  initialState: RecordingInitialState
  inputs: InputFrame[]
  snapshots: StateSnapshot[] // Hash-based snapshots for validation
  fullSnapshots?: FullStateSnapshot[] // Optional full state snapshots for debugging
  finalState?: FinalGameState // Final game state captured at recording end
}
