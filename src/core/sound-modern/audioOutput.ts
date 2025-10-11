/**
 * Audio Output Module for Mixer (AudioWorklet version)
 *
 * Connects to Web Audio API using modern AudioWorkletNode with mixer processor.
 * Handles multi-channel audio output with 8 simultaneous sound channels.
 *
 * The mixer worklet handles all audio processing in the audio rendering thread:
 * - Multi-channel sample generation
 * - Buffer management per channel
 * - Mixing algorithm
 * - Format conversion
 *
 * This module handles control and setup from the main thread.
 */

import workletUrl from './worklet/mixerProcessor.worklet.ts?worker&url'
import type { PlayMessage, StopMessage, WorkletEvent } from './types'
import { WorkletMessageType, WorkletEventType } from './types'

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
   * Send PLAY message to worklet to start sound on a channel
   */
  playOnChannel(message: Omit<PlayMessage, 'type'>): void

  /**
   * Send STOP message to worklet to stop a continuous sound
   */
  stopSound(message: Omit<StopMessage, 'type'>): void

  /**
   * Send CLEAR message to worklet to clear all sounds
   */
  clearAllSounds(): void

  /**
   * Register callback for when a sound ends on a channel
   */
  onSoundEnded(callback: (channelId: number, soundType: number) => void): void

  /**
   * Register callback for underrun events (for debugging)
   */
  onUnderrun(
    callback: (channelId: number, available: number, needed: number) => void
  ): void
}

/**
 * Creates an audio output instance using AudioWorklet with mixer
 */
export const createAudioOutput = (): AudioOutput => {
  let audioContext: AudioContext | null = null
  let workletNode: AudioWorkletNode | null = null
  let gainNode: GainNode | null = null
  let isPlaying = false
  let workletLoaded = false

  // Event callbacks
  let soundEndedCallback:
    | ((channelId: number, soundType: number) => void)
    | null = null
  let underrunCallback:
    | ((channelId: number, available: number, needed: number) => void)
    | null = null

  // Constants
  const SAMPLE_RATE = 22200 // Original Mac sample rate
  const MASTER_GAIN_SCALE = 0.5 // Scale down overall volume (100% = 50% of max)

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
      console.log('[MixerAudioOutput] AudioWorklet module loaded successfully')
    } catch (error) {
      console.error(
        '[MixerAudioOutput] Failed to load AudioWorklet module:',
        error
      )
      throw error
    }
  }

  /**
   * Handle messages from worklet
   */
  const handleWorkletMessage = (event: MessageEvent<WorkletEvent>): void => {
    const message = event.data

    switch (message.type) {
      case WorkletEventType.SOUND_ENDED:
        if (soundEndedCallback) {
          soundEndedCallback(message.channelId, message.soundType)
        }
        break

      case WorkletEventType.UNDERRUN:
        if (underrunCallback) {
          underrunCallback(message.channelId, message.available, message.needed)
        }
        break

      default:
        console.warn('[MixerAudioOutput] Unknown worklet message:', message)
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
        console.log('[MixerAudioOutput] AudioContext is suspended, resuming...')
        try {
          await audioContext.resume()
          console.log('[MixerAudioOutput] AudioContext resumed successfully')
        } catch (error) {
          console.warn(
            '[MixerAudioOutput] Failed to resume AudioContext during start:',
            error
          )
        }
      }

      // Load worklet module
      await loadWorklet()

      // Create worklet node with mixer processor
      workletNode = new AudioWorkletNode(audioContext, 'mixer-audio-processor')

      // Listen for messages from worklet
      workletNode.port.onmessage = handleWorkletMessage

      // Create gain node for volume control
      gainNode = audioContext.createGain()
      gainNode.gain.value = 1.0 * MASTER_GAIN_SCALE // Default to scaled full volume

      // Connect audio chain: Worklet → GainNode → Destination
      workletNode.connect(gainNode)
      gainNode.connect(audioContext.destination)

      isPlaying = true

      console.log('[MixerAudioOutput] Audio started (AudioWorklet Mixer):', {
        sampleRate: audioContext.sampleRate,
        channels: audioContext.destination.channelCount,
        latency: audioContext.baseLatency || 'unknown'
      })
    } catch (error) {
      console.error('[MixerAudioOutput] Failed to start audio:', error)
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

    if (gainNode) {
      gainNode.disconnect()
      gainNode = null
    }

    isPlaying = false
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
        console.log('[MixerAudioOutput] AudioContext resumed successfully')
      } catch (error) {
        console.error(
          '[MixerAudioOutput] Failed to resume AudioContext:',
          error
        )
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
        `[MixerAudioOutput] Invalid volume value: ${volume}. Volume must be a number between 0.0 and 1.0`
      )
      return
    }

    if (volume < 0 || volume > 1) {
      console.error(
        `[MixerAudioOutput] Volume out of range: ${volume}. Volume must be between 0.0 and 1.0`
      )
    }

    const clampedVolume = Math.max(0, Math.min(1, volume))

    // Set gain node volume (with master gain scaling)
    if (gainNode) {
      gainNode.gain.value = clampedVolume * MASTER_GAIN_SCALE
    }

    // Also send to worklet (it might need it for internal processing)
    if (workletNode) {
      workletNode.port.postMessage({
        type: WorkletMessageType.SET_VOLUME,
        volume: clampedVolume
      })
    }
  }

  /**
   * Send PLAY message to worklet
   */
  const playOnChannel = (message: Omit<PlayMessage, 'type'>): void => {
    if (workletNode) {
      workletNode.port.postMessage({
        type: WorkletMessageType.PLAY,
        ...message
      })
    }
  }

  /**
   * Send STOP message to worklet
   */
  const stopSound = (message: Omit<StopMessage, 'type'>): void => {
    if (workletNode) {
      workletNode.port.postMessage({
        type: WorkletMessageType.STOP,
        ...message
      })
    }
  }

  /**
   * Send CLEAR message to worklet
   */
  const clearAllSounds = (): void => {
    if (workletNode) {
      workletNode.port.postMessage({
        type: WorkletMessageType.CLEAR
      })
    }
  }

  /**
   * Register callback for when a sound ends
   */
  const onSoundEnded = (
    callback: (channelId: number, soundType: number) => void
  ): void => {
    soundEndedCallback = callback
  }

  /**
   * Register callback for underrun events
   */
  const onUnderrun = (
    callback: (channelId: number, available: number, needed: number) => void
  ): void => {
    underrunCallback = callback
  }

  // Return public interface
  return {
    start,
    stop,
    isPlaying: getIsPlaying,
    getContext,
    setVolume,
    playOnChannel,
    stopSound,
    clearAllSounds,
    resumeContext,
    onSoundEnded,
    onUnderrun
  }
}
