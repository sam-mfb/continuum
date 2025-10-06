/**
 * @fileoverview Application state management slice
 * Handles UI state, display settings, and sound settings
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlignmentMode } from '@/core/shared'

export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver'

export type CollisionMode = 'modern' | 'original'

export type ScaleMode = 'auto' | 1 | 2 | 3

export type MostRecentScore = {
  score: number
  planet: number
  fuel: number
}

export type AppState = {
  // Collision methodology
  collisionMode: CollisionMode

  // Display settings
  alignmentMode: AlignmentMode
  showInGameControls: boolean
  scaleMode: ScaleMode

  // Sound settings
  volume: number
  soundOn: boolean

  // Touch controls
  touchControlsEnabled: boolean
  touchControlsOverride: boolean | null // null = auto-detect

  // Game flow
  mode: GameMode
  mostRecentScore: MostRecentScore | null

  // UI state
  showSettings: boolean
  isFullscreen: boolean

  // Current galaxy
  currentGalaxyId: string
  totalLevels: number
}

const initialState: AppState = {
  collisionMode: 'modern',
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  showInGameControls: true,
  scaleMode: 'auto', // Default to responsive auto-scaling
  volume: 0,
  soundOn: true,
  touchControlsEnabled: false, // Will be set based on device detection
  touchControlsOverride: null, // null = auto-detect based on device
  mode: 'start',
  mostRecentScore: null,
  showSettings: false,
  isFullscreen: false,
  currentGalaxyId: 'release', // Will be overridden by galaxy config
  totalLevels: 0 // Will be set when galaxy is loaded
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Collision settings
    setCollisionMode: (state, action: PayloadAction<CollisionMode>) => {
      state.collisionMode = action.payload
    },
    toggleCollisionMode: state => {
      state.collisionMode =
        state.collisionMode === 'modern' ? 'original' : 'modern'
    },
    // Display settings
    setAlignmentMode: (state, action: PayloadAction<AlignmentMode>) => {
      state.alignmentMode = action.payload
    },

    toggleAlignmentMode: state => {
      state.alignmentMode =
        state.alignmentMode === 'world-fixed' ? 'screen-fixed' : 'world-fixed'
    },

    toggleInGameControls: state => {
      state.showInGameControls = !state.showInGameControls
    },

    setScaleMode: (state, action: PayloadAction<ScaleMode>) => {
      state.scaleMode = action.payload
    },

    // Sound settings
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload
    },
    enableSound: state => {
      state.soundOn = true
    },
    disableSound: state => {
      state.soundOn = false
    },

    // Game flow management
    setMode: (state, action: PayloadAction<GameMode>) => {
      state.mode = action.payload
    },

    startGame: state => {
      state.mode = 'playing'
    },

    setMostRecentScore: (state, action: PayloadAction<MostRecentScore>) => {
      state.mostRecentScore = action.payload
    },

    // UI state actions
    openSettings: state => {
      state.showSettings = true
    },

    closeSettings: state => {
      state.showSettings = false
    },

    toggleSettings: state => {
      state.showSettings = !state.showSettings
    },

    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload
    },

    // Galaxy management
    setCurrentGalaxy: (state, action: PayloadAction<string>) => {
      state.currentGalaxyId = action.payload
    },

    setTotalLevels: (state, action: PayloadAction<number>) => {
      state.totalLevels = action.payload
    },

    // Touch controls management
    enableTouchControls: state => {
      state.touchControlsEnabled = true
    },

    disableTouchControls: state => {
      state.touchControlsEnabled = false
    },

    setTouchControlsOverride: (
      state,
      action: PayloadAction<boolean | null>
    ) => {
      state.touchControlsOverride = action.payload
    }
  }
})

export const {
  setCollisionMode,
  toggleCollisionMode,
  setAlignmentMode,
  toggleAlignmentMode,
  toggleInGameControls,
  setScaleMode,
  setVolume,
  enableSound,
  disableSound,
  setMode,
  startGame,
  setMostRecentScore,
  openSettings,
  closeSettings,
  toggleSettings,
  setFullscreen,
  setCurrentGalaxy,
  setTotalLevels,
  enableTouchControls,
  disableTouchControls,
  setTouchControlsOverride
} = appSlice.actions
