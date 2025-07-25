import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type GameViewState = {
  viewport: {
    x: number
    y: number
  }
  initialized: boolean
}

const initialState: GameViewState = {
  viewport: {
    x: 0,
    y: 0
  },
  initialized: false
}

export const gameViewSlice = createSlice({
  name: 'gameView',
  initialState,
  reducers: {
    setViewport: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.viewport = action.payload
      state.initialized = true
    },
    moveViewport: (
      state,
      action: PayloadAction<{ dx: number; dy: number }>
    ) => {
      state.viewport.x += action.payload.dx
      state.viewport.y += action.payload.dy
    },
    resetViewport: state => {
      state.viewport = { x: 0, y: 0 }
      state.initialized = false
    }
  }
})

export const gameViewActions = gameViewSlice.actions
export default gameViewSlice.reducer
