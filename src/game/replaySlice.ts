import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GameRecording } from './recording/types'

export type ReplayState = {
  replayPaused: boolean
  currentReplayFrame: number
  totalReplayFrames: number
  loadedRecording: GameRecording | null
}

const initialState: ReplayState = {
  replayPaused: false,
  currentReplayFrame: 0,
  totalReplayFrames: 0,
  loadedRecording: null
}

export const replaySlice = createSlice({
  name: 'replay',
  initialState,
  reducers: {
    loadRecording: (state, action: PayloadAction<GameRecording>) => {
      state.loadedRecording = action.payload
      state.currentReplayFrame = 0
      state.totalReplayFrames =
        action.payload.inputs[action.payload.inputs.length - 1]?.frame ?? 0
      state.replayPaused = false
    },
    startReplay: state => {
      state.currentReplayFrame = 0
      state.replayPaused = false
    },
    pauseReplay: state => {
      state.replayPaused = true
    },
    resumeReplay: state => {
      state.replayPaused = false
    },
    stopReplay: state => {
      state.loadedRecording = null
      state.currentReplayFrame = 0
      state.totalReplayFrames = 0
      state.replayPaused = false
    },
    setReplayFrame: (state, action: PayloadAction<number>) => {
      state.currentReplayFrame = action.payload
    }
  }
})

export const {
  loadRecording,
  startReplay,
  pauseReplay,
  resumeReplay,
  stopReplay,
  setReplayFrame
} = replaySlice.actions
