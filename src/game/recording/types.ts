import type { ControlMatrix } from '@/core/controls'
import type { ShipState } from '@/core/ship'
import type { ShotsState } from '@/core/shots'
import type { PlanetState } from '@/core/planet'
import type { ScreenState } from '@/core/screen'
import type { StatusState } from '@/core/status/statusSlice'
import type { ExplosionsState } from '@/core/explosions'
import type { WallsState } from '@/core/walls'
import type { TransitionState } from '@/core/transition'

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
  state: {
    ship: ShipState
    shots: ShotsState
    planet: PlanetState
    screen: ScreenState
    status: StatusState
    explosions: ExplosionsState
    walls: WallsState
    transition: TransitionState
  }
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
