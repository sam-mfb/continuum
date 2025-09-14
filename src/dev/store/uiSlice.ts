import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type UIState = {
  currentView:
    | 'menu'
    | 'game'
    | 'settings'
    | 'galaxy'
    | 'graphics'
    | 'sound'
    | 'sprites'
  isGamePaused: boolean
  showDebugInfo: boolean
}

const initialState: UIState = {
  currentView: 'sound',
  isGamePaused: false,
  showDebugInfo: false
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<UIState['currentView']>) => {
      state.currentView = action.payload
    },
    toggleGamePause: state => {
      state.isGamePaused = !state.isGamePaused
    },
    toggleDebugInfo: state => {
      state.showDebugInfo = !state.showDebugInfo
    }
  }
})

export const uiReducer = uiSlice.reducer
export const { setCurrentView, toggleGamePause, toggleDebugInfo } =
  uiSlice.actions
