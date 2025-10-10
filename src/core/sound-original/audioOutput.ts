/**
 * Audio Output Module (AudioWorklet version)
 *
 * Connects to Web Audio API using modern AudioWorkletNode.
 * This replaces the deprecated ScriptProcessorNode approach.
 *
 * The worklet handles all audio processing in the audio rendering thread:
 * - Sample generation
 * - Buffer management
 * - Format conversion
 *
 * This module just handles control and setup from the main thread.
 */

// Import worklet with ?worker&url to let Vite bundle it with dependencies
import workletUrl from './worklet/basicProcessor.worklet.ts?worker&url'

export type AudioOutput = {
  /**
   * Start audio playback
   */
  start(): Promise<void>

  /**
   * Stop audio playback
   */
  stop(): void

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean

  /**
   * Resume suspended audio context
   */
  resumeContext(): Promise<void>

  /**
   * Get the audio context (for debugging/monitoring)
   */
  getContext(): AudioContext | null

  /**
   * Set the master volume
   * @param volume - Volume level between 0.0 (muted) and 1.0 (full volume)
   */
  setVolume(volume: number): void

  /**
   * Send message to worklet to set generator
   */
  setGenerator(generatorType: string, priority: number): void

  /**
   * Send message to worklet to clear sound
   */
  clearSound(): void

  /**
   * Get performance statistics
   */
  getStats(): {
    underruns: number
    totalCallbacks: number
    averageLatency: number
  }
}

/**
 * Creates an audio output instance using AudioWorklet
 */
export const createAudioOutput = (): AudioOutput => {
  let audioContext: AudioContext | null = null
  let workletNode: AudioWorkletNode | null = null
  let isPlaying = false
  let workletLoaded = false

  // Performance tracking (received from worklet)
  let underruns = 0
  let totalCallbacks = 0

  // Constants
  const SAMPLE_RATE = 22200 // Original Mac sample rate

  /**
   * Load the audio worklet module
   */
  const loadWorklet = async (): Promise<void> => {
    if (!audioContext) {
      throw new Error('AudioContext not initialized')
    }

    if (workletLoaded) {
      return
    }

    try {
      await audioContext.audioWorklet.addModule(workletUrl)
      workletLoaded = true
      console.log('AudioWorklet module loaded successfully')
    } catch (error) {
      console.error('Failed to load AudioWorklet module:', error)
      throw error
    }
  }

  /**
   * Start audio playback
   */
  const start = async (): Promise<void> => {
    if (isPlaying) return

    try {
      // Create audio context if needed
      if (!audioContext) {
        audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      }

      // Resume if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        console.log(
          'AudioContext is suspended, will resume on user interaction'
        )
      }

      // Load worklet module
      await loadWorklet()

      // Create worklet node
      workletNode = new AudioWorkletNode(audioContext, 'basic-audio-processor')

      // Listen for messages from worklet
      workletNode.port.onmessage = (event: MessageEvent) => {
        const message = event.data
        switch (message.type) {
          case 'soundEnded':
            console.log('Sound ended (from worklet)')
            break
          case 'stats':
            underruns = message.underruns
            totalCallbacks = message.totalCallbacks
            break
        }
      }

      // Connect worklet directly to destination
      // Note: Volume is handled inside the worklet (matches MASTER_GAIN_SCALE behavior)
      workletNode.connect(audioContext.destination)

      isPlaying = true

      console.log('Audio started (AudioWorklet):', {
        sampleRate: audioContext.sampleRate,
        channels: audioContext.destination.channelCount,
        latency: audioContext.baseLatency || 'unknown'
      })
    } catch (error) {
      console.error('Failed to start audio:', error)
      stop()
      throw error
    }
  }

  /**
   * Stop audio playback
   */
  const stop = (): void => {
    if (workletNode) {
      workletNode.disconnect()
      workletNode.port.onmessage = null
      workletNode = null
    }

    isPlaying = false

    // Reset stats for next session
    underruns = 0
    totalCallbacks = 0
  }

  /**
   * Check if audio is currently playing
   */
  const getIsPlaying = (): boolean => {
    return isPlaying && audioContext?.state === 'running'
  }

  /**
   * Get the audio context
   */
  const getContext = (): AudioContext | null => {
    return audioContext
  }

  /**
   * Resume audio context if suspended (requires user gesture)
   */
  const resumeContext = async (): Promise<void> => {
    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
        console.log('AudioContext resumed successfully')
      } catch (error) {
        console.error('Failed to resume AudioContext:', error)
      }
    }
  }

  /**
   * Set the master volume
   * @param volume - Volume level between 0.0 (muted) and 1.0 (full volume)
   */
  const setVolume = (volume: number): void => {
    // Validate input
    if (typeof volume !== 'number' || isNaN(volume)) {
      console.error(
        `[AudioOutput] Invalid volume value: ${volume}. Volume must be a number between 0.0 and 1.0`
      )
      return
    }

    if (volume < 0 || volume > 1) {
      console.error(
        `[AudioOutput] Volume out of range: ${volume}. Volume must be between 0.0 and 1.0`
      )
    }

    // Send volume message to worklet
    if (workletNode) {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      workletNode.port.postMessage({
        type: 'setVolume',
        volume: clampedVolume
      })
    }
  }

  /**
   * Send message to worklet to set generator
   */
  const setGenerator = (generatorType: string, priority: number): void => {
    if (workletNode) {
      workletNode.port.postMessage({
        type: 'setGenerator',
        generatorType,
        priority
      })
    }
  }

  /**
   * Send message to worklet to clear sound
   */
  const clearSound = (): void => {
    if (workletNode) {
      workletNode.port.postMessage({
        type: 'clearSound'
      })
    }
  }

  /**
   * Get performance statistics
   */
  const getStats = (): {
    underruns: number
    totalCallbacks: number
    averageLatency: number
  } => {
    return {
      underruns,
      totalCallbacks,
      averageLatency: 0 // Latency tracking moved to worklet
    }
  }

  // Return public interface
  return {
    start,
    stop,
    isPlaying: getIsPlaying,
    getContext,
    setVolume,
    setGenerator,
    clearSound,
    resumeContext,
    getStats
  }
}
