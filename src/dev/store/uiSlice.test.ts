import { describe, it, expect } from 'vitest'
import {
  uiReducer,
  setCurrentView,
  toggleGamePause,
  toggleDebugInfo
} from './uiSlice'

describe('uiSlice', () => {
  const initialState = {
    currentView: 'game' as const,
    isGamePaused: false,
    showDebugInfo: false,
    showGameStats: false,
    selectedGameIndex: 0
  }

  it('should handle setCurrentView', () => {
    const actual = uiReducer(initialState, setCurrentView('game'))
    expect(actual.currentView).toBe('game')
  })

  it('should handle toggleGamePause', () => {
    const actual = uiReducer(initialState, toggleGamePause())
    expect(actual.isGamePaused).toBe(true)

    const actualAgain = uiReducer(actual, toggleGamePause())
    expect(actualAgain.isGamePaused).toBe(false)
  })

  it('should handle toggleDebugInfo', () => {
    const actual = uiReducer(initialState, toggleDebugInfo())
    expect(actual.showDebugInfo).toBe(true)

    const actualAgain = uiReducer(actual, toggleDebugInfo())
    expect(actualAgain.showDebugInfo).toBe(false)
  })
})
