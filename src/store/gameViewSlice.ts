import { createSlice } from '@reduxjs/toolkit'

export type GameViewState = {
  initialized: boolean
}

const initialState: GameViewState = {
  initialized: false
}

export const gameViewSlice = createSlice({
  name: 'gameView',
  initialState,
  reducers: {
    setInitialized: state => {
      state.initialized = true
    },
    resetInitialized: state => {
      state.initialized = false
    }
  }
})

export const gameViewActions = gameViewSlice.actions
export default gameViewSlice.reducer