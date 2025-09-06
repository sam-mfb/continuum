/**
 * Tests for the sound manager
 * Phase 1: Tests for Redux bridge functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { store } from '@dev/store/store'
import { SoundType } from '../constants'
import { setVolume, toggleSound } from '../soundSlice'

// Mock the sound engine
vi.mock('../soundEngine', () => ({
  createSoundEngine: vi.fn(() => ({
    audioContext: {},
    masterGain: {},
    setVolume: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }))
}))

// Import after mocking
import { createSoundManager } from '../soundManager'

describe('createSoundManager', () => {
  let soundManager: ReturnType<typeof createSoundManager>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Redux state
    store.dispatch(toggleSound())
    store.dispatch(toggleSound())
    store.dispatch(setVolume(0.5))
    // Create new instance for each test
    soundManager = createSoundManager()
  })

  afterEach(() => {
    soundManager.cleanup()
  })

  it('initializes sound engine on first use', () => {
    // Reset mocks before test
    vi.clearAllMocks()

    // Create a new manager instance to ensure clean state
    const newManager = createSoundManager()

    // The engine should be initialized on first sound play
    newManager.startSound(SoundType.THRU_SOUND)

    // Verify the initialization happened
    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND)
  })

  it('updates Redux state when starting sound', () => {
    soundManager.initialize()

    soundManager.startSound(SoundType.THRU_SOUND)
    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND)

    soundManager.startSound(SoundType.FIRE_SOUND)
    expect(store.getState().sound.currentSound).toBe(SoundType.FIRE_SOUND)
  })

  it('updates Redux state when stopping sound', () => {
    soundManager.initialize()
    soundManager.startSound(SoundType.THRU_SOUND)

    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND)

    soundManager.stopSound()

    expect(store.getState().sound.currentSound).toBe(SoundType.NO_SOUND)
  })

  it('updates volume when Redux state changes', async () => {
    soundManager.initialize()

    // Change volume in Redux
    store.dispatch(setVolume(0.8))

    // Allow store subscription to process
    await new Promise(resolve => setTimeout(resolve, 10))

    // The volume should be set on the engine
    expect(store.getState().sound.volume).toBe(0.8)
  })

  it('cleans up properly', () => {
    soundManager.initialize()
    soundManager.startSound(SoundType.THRU_SOUND)

    soundManager.cleanup()

    expect(store.getState().sound.currentSound).toBe(SoundType.NO_SOUND)
  })
})
