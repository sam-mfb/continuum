import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { loadUISettings } from './uiMiddleware'

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
  showGameStats: boolean
}

// Load persisted settings
const persistedSettings = loadUISettings()

const initialState: UIState = {
  currentView: persistedSettings.currentView ?? 'sound',
  isGamePaused: false,
  showDebugInfo: persistedSettings.showDebugInfo ?? false,
  showGameStats: persistedSettings.showGameStats ?? false
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
    },
    toggleGameStats: state => {
      state.showGameStats = !state.showGameStats
    }
  }
})

export const uiReducer = uiSlice.reducer
export const {
  setCurrentView,
  toggleGamePause,
  toggleDebugInfo,
  toggleGameStats
} = uiSlice.actions
