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
  selectedGameIndex: number
}

// Load persisted settings
const persistedSettings = loadUISettings()

const initialState: UIState = {
  currentView: persistedSettings.currentView ?? 'sound',
  isGamePaused: false,
  showDebugInfo: persistedSettings.showDebugInfo ?? false,
  showGameStats: persistedSettings.showGameStats ?? false,
  selectedGameIndex: persistedSettings.selectedGameIndex ?? 6 // Default to Ship Move (Bitmap)
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
    },
    setSelectedGameIndex: (state, action: PayloadAction<number>) => {
      state.selectedGameIndex = action.payload
    }
  }
})

export const uiReducer = uiSlice.reducer
export const {
  setCurrentView,
  toggleGamePause,
  toggleDebugInfo,
  toggleGameStats,
  setSelectedGameIndex
} = uiSlice.actions
