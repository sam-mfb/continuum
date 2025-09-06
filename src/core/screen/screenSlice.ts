import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ScreenState } from './types'

const initialState: ScreenState = {
  screenx: 0,
  screeny: 0
}

export const screenSlice = createSlice({
  name: 'screen',
  initialState,
  reducers: {
    setPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.screenx = action.payload.x
      state.screeny = action.payload.y
    },
    updatePosition: (
      state,
      action: PayloadAction<{ x: number; y: number }>
    ) => {
      state.screenx = action.payload.x
      state.screeny = action.payload.y
    },
    resetScreen: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.screenx = action.payload.x
      state.screeny = action.payload.y
    }
  }
})

export default screenSlice.reducer
