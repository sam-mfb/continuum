/**
 * @fileoverview Store module - Redux store configuration and slices
 */

// Store configuration
import store from './store'
export default store
export { store }
export type { RootState, AppDispatch } from './store'
export { buildGameStore } from './gameStore'
export type { GameState } from './gameStore'

// Dev-specific slices
export { default as galaxySlice } from './galaxySlice'
export { gameViewSlice } from './gameViewSlice'
export type { GameViewState } from './gameViewSlice'
export { default as graphicsSlice } from './graphicsSlice'
export { uiSlice } from './uiSlice'

// Hooks
export { useAppDispatch, useAppSelector } from './store'
