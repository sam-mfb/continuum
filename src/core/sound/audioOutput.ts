/**
 * Audio Output Module
 *
 * Connects the buffer manager to Web Audio API for browser playback.
 * This is the only module that knows about Web Audio API.
 *
 * Based on Phase 6 of MIGRATION_PLAN.md
 */

import type { BufferManager } from './bufferManager'
import { convertBufferInPlace } from './formatConverter'

export type AudioOutput = {
  /**
   * Start audio playback
   */
  start(): void

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
   * Get the gain node for volume control
   */
  getGainNode(): GainNode | null

  /**
   * Set the master volume
   * @param volume - Volume level between 0.0 (muted) and 1.0 (full volume)
   */
  setVolume(volume: number): void

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
 * Creates an audio output instance that connects buffer manager to Web Audio
 */
export const createAudioOutput = (
  bufferManager: BufferManager
): AudioOutput => {
  let audioContext: AudioContext | null = null
  let scriptProcessor: ScriptProcessorNode | null = null
  let gainNode: GainNode | null = null
  let isPlaying = false

  // Performance tracking
  let underruns = 0
  let totalCallbacks = 0
  let latencySum = 0

  // Constants
  const SAMPLE_RATE = 22200 // Original Mac sample rate
  const BUFFER_SIZE = 512 // Common Web Audio buffer size

  /**
   * Audio processing callback
   * Called by Web Audio when it needs more samples
   */
  const processAudio = (event: AudioProcessingEvent): void => {
    const outputBuffer = event.outputBuffer
    const outputChannel = outputBuffer.getChannelData(0)

    totalCallbacks++
    const callbackStart = performance.now()

    try {
      // Request samples from buffer manager
      const samples = bufferManager.requestSamples(outputChannel.length)

      // Convert 8-bit unsigned to float32 directly into output buffer
      convertBufferInPlace(samples, outputChannel)

      // Copy to other channels if stereo
      for (
        let channel = 1;
        channel < outputBuffer.numberOfChannels;
        channel++
      ) {
        const otherChannel = outputBuffer.getChannelData(channel)
        otherChannel.set(outputChannel)
      }

      // Track latency
      const callbackTime = performance.now() - callbackStart
      latencySum += callbackTime

      // Count as underrun only if callback took too long (> 10ms is risky for real-time)
      // This would indicate actual performance issues, not normal buffer operation
      if (callbackTime > 10 && totalCallbacks > 5) {
        underruns++
        if (underruns <= 3) {
          console.warn(
            `Audio callback took too long: ${callbackTime.toFixed(2)}ms`
          )
        }
      }
    } catch (error) {
      console.error('Audio processing error:', error)
      // Output silence on error
      outputChannel.fill(0)
    }
  }

  /**
   * Start audio playback
   */
  const start = (): void => {
    if (isPlaying) return

    try {
      // Create audio context if needed
      if (!audioContext) {
        audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      }

      // Resume if suspended (required by some browsers)
      // This will be handled by user interaction in the service
      if (audioContext.state === 'suspended') {
        console.log(
          'AudioContext is suspended, will resume on user interaction'
        )
      }

      // Pre-fill the buffer to avoid initial underruns
      // Generate at least 2 buffers worth of samples
      const prefillSamples = BUFFER_SIZE * 2
      bufferManager.requestSamples(prefillSamples)

      // Create script processor for audio generation
      scriptProcessor = audioContext.createScriptProcessor(
        BUFFER_SIZE,
        0, // no input channels
        audioContext.destination.channelCount // match output channels
      )

      // Create gain node for volume control
      gainNode = audioContext.createGain()
      gainNode.gain.value = 1.0 // Default to full volume

      // Connect audio processing callback
      scriptProcessor.onaudioprocess = processAudio

      // Connect chain: ScriptProcessor -> GainNode -> Destination
      scriptProcessor.connect(gainNode)
      gainNode.connect(audioContext.destination)

      isPlaying = true

      console.log('Audio started:', {
        sampleRate: audioContext.sampleRate,
        bufferSize: BUFFER_SIZE,
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
    if (scriptProcessor) {
      scriptProcessor.disconnect()
      scriptProcessor.onaudioprocess = null
      scriptProcessor = null
    }

    if (gainNode) {
      gainNode.disconnect()
      gainNode = null
    }

    isPlaying = false

    // Reset stats for next session
    underruns = 0
    totalCallbacks = 0
    latencySum = 0
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
   * Get the gain node for volume control
   */
  const getGainNode = (): GainNode | null => {
    return gainNode
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

    if (gainNode) {
      // Clamp volume between 0 and 1 (still clamp in case of out-of-range values)
      const clampedVolume = Math.max(0, Math.min(1, volume))
      gainNode.gain.value = clampedVolume
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
      averageLatency: totalCallbacks > 0 ? latencySum / totalCallbacks : 0
    }
  }

  // Return public interface
  return {
    start,
    stop,
    isPlaying: getIsPlaying,
    getContext,
    getGainNode,
    setVolume,
    resumeContext,
    getStats
  }
}
