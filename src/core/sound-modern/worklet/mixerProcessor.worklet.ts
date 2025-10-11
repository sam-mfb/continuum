/**
 * Mixer Audio Worklet Processor
 *
 * Multi-channel mixer for simultaneous sound playback.
 * Runs in the audio rendering thread for better performance and lower latency.
 *
 * Architecture:
 * - 8 independent audio channels (all for SFX in Phase 2)
 * - Each channel has own ring buffer + generator
 * - Main thread sends messages to control channel playback
 * - Worklet mixes all active channels and posts messages back when sounds end
 *
 * Traced from: orig/Sources/Sound.c (adapted for multi-channel)
 */

/// <reference path="./worklet.d.ts" />

import type { SampleGenerator, RingBuffer } from '@/core/sound-shared'
import {
  SoundType,
  createRingBuffer,
  createSilenceGenerator,
  createFireGenerator,
  createExplosionGenerator,
  ExplosionType,
  createThrusterGenerator,
  createShieldGenerator,
  createBunkerGenerator,
  createSoftGenerator,
  createFuelGenerator,
  createCrackGenerator,
  createFizzGenerator,
  createEchoGenerator
} from '@/core/sound-shared'
import type {
  WorkletMessage,
  WorkletEvent,
  PlayMessage,
  StopMessage,
  SetVolumeMessage
} from '../types'
import { WorkletMessageType, WorkletEventType, MAX_CHANNELS } from '../types'

// Constants
const CHUNK_SIZE = 370
const BUFFER_SIZE = 8192 // Must be power of 2

/**
 * Represents the state of a single channel
 */
type ChannelData = {
  buffer: RingBuffer
  generator: SampleGenerator | null
  soundType: SoundType
  active: boolean
  hasReportedEnded: boolean
}

/**
 * Mixer audio processor with 8 simultaneous channels
 */
class MixerAudioProcessor extends AudioWorkletProcessor {
  // 8 audio channels
  private channels: ChannelData[]

  // Global volume (0-1, controlled by main thread)
  private volume: number

  // Performance tracking
  private totalCallbacks: number

  constructor() {
    super()

    // Initialize 8 channels
    this.channels = Array.from({ length: MAX_CHANNELS }, () => ({
      buffer: createRingBuffer(BUFFER_SIZE),
      generator: null,
      soundType: SoundType.NO_SOUND,
      active: false,
      hasReportedEnded: false
    }))

    // Fill all buffers with silence to prevent underruns on first callback
    for (const channel of this.channels) {
      channel.buffer.fillWithSilence(BUFFER_SIZE)
    }

    this.volume = 1.0
    this.totalCallbacks = 0

    // Listen for messages from main thread
    this.port.onmessage = (event: MessageEvent<WorkletMessage>): void => {
      this.handleMessage(event.data)
    }
  }

  /**
   * Handle messages from main thread
   */
  private handleMessage(message: WorkletMessage): void {
    switch (message.type) {
      case WorkletMessageType.PLAY:
        this.handlePlay(message)
        break

      case WorkletMessageType.STOP:
        this.handleStop(message)
        break

      case WorkletMessageType.CLEAR:
        this.handleClear()
        break

      case WorkletMessageType.SET_VOLUME:
        this.handleSetVolume(message)
        break

      default:
        console.warn('[MixerWorklet] Unknown message type:', message)
    }
  }

  /**
   * Handle PLAY message - start playing a sound on a channel
   */
  private handlePlay(message: PlayMessage): void {
    const { channelId, soundType } = message

    if (channelId < 0 || channelId >= MAX_CHANNELS) {
      console.warn(`[MixerWorklet] Invalid channel ID: ${channelId}`)
      return
    }

    const channel = this.channels[channelId]!

    // Create the generator
    const generator = this.createGenerator(soundType)
    if (!generator) {
      console.warn(`[MixerWorklet] Failed to create generator for ${soundType}`)
      return
    }

    // Start the generator
    if ('start' in generator && typeof generator.start === 'function') {
      generator.start()
    } else if ('reset' in generator && typeof generator.reset === 'function') {
      generator.reset()
    }

    // Set up the channel
    channel.generator = generator
    channel.soundType = soundType
    channel.active = true
    channel.hasReportedEnded = false

    // Clear buffer (synchronize positions without filling with silence)
    // Then immediately generate new samples to eliminate latency
    // This prevents artifacts from old samples while maintaining zero latency
    channel.buffer.clear()
    this.generateChunk(channelId)
  }

  /**
   * Handle STOP message - stop a continuous sound if it's playing
   */
  private handleStop(message: StopMessage): void {
    const { soundType } = message

    // Find the channel playing this sound and stop it
    for (let i = 0; i < MAX_CHANNELS; i++) {
      const channel = this.channels[i]!
      if (channel.active && channel.soundType === soundType) {
        channel.active = false
        channel.generator = null
        channel.soundType = SoundType.NO_SOUND
        channel.hasReportedEnded = false
        channel.buffer.reset()
      }
    }
  }

  /**
   * Handle CLEAR message - clear all channels
   */
  private handleClear(): void {
    for (const channel of this.channels) {
      channel.active = false
      channel.generator = null
      channel.soundType = SoundType.NO_SOUND
      channel.hasReportedEnded = false
      channel.buffer.reset()
    }
  }

  /**
   * Handle SET_VOLUME message
   */
  private handleSetVolume(message: SetVolumeMessage): void {
    this.volume = Math.max(0, Math.min(1, message.volume))
  }

  /**
   * Create a generator for a given sound type
   */
  private createGenerator(soundType: SoundType): SampleGenerator | null {
    switch (soundType) {
      case SoundType.NO_SOUND:
        return createSilenceGenerator()
      case SoundType.FIRE_SOUND:
        return createFireGenerator()
      case SoundType.THRU_SOUND:
        return createThrusterGenerator()
      case SoundType.SHLD_SOUND:
        return createShieldGenerator()
      case SoundType.EXP1_SOUND:
        return createExplosionGenerator(ExplosionType.BUNKER)
      case SoundType.EXP2_SOUND:
        return createExplosionGenerator(ExplosionType.SHIP)
      case SoundType.EXP3_SOUND:
        return createExplosionGenerator(ExplosionType.ALIEN)
      case SoundType.BUNK_SOUND:
        return createBunkerGenerator()
      case SoundType.SOFT_SOUND:
        return createSoftGenerator()
      case SoundType.FUEL_SOUND:
        return createFuelGenerator()
      case SoundType.CRACK_SOUND:
        return createCrackGenerator()
      case SoundType.FIZZ_SOUND:
        return createFizzGenerator()
      case SoundType.ECHO_SOUND:
        return createEchoGenerator()
      default:
        console.warn(`[MixerWorklet] Unknown sound type: ${soundType}`)
        return createSilenceGenerator()
    }
  }

  /**
   * Generate a chunk for a specific channel
   */
  private generateChunk(channelId: number): void {
    if (channelId < 0 || channelId >= MAX_CHANNELS) return

    const channel = this.channels[channelId]!

    // If channel inactive or no generator, fill with silence
    if (!channel.active || !channel.generator) {
      channel.buffer.fillWithSilence(CHUNK_SIZE)
      return
    }

    // Generate chunk from generator
    const chunk = channel.generator.generateChunk()

    // Check if sound has ended
    if (!channel.hasReportedEnded && channel.generator.hasEnded()) {
      channel.hasReportedEnded = true
      channel.active = false

      // Notify main thread
      this.port.postMessage({
        type: WorkletEventType.SOUND_ENDED,
        channelId,
        soundType: channel.soundType
      } as WorkletEvent)

      // Clear channel
      channel.generator = null
      channel.soundType = SoundType.NO_SOUND
    }

    // Add chunk to ring buffer
    const written = channel.buffer.writeSamples(chunk)

    // Track underruns if we couldn't write the full chunk
    if (written < chunk.length) {
      this.port.postMessage({
        type: WorkletEventType.UNDERRUN,
        channelId,
        available: channel.buffer.getAvailableSamples(),
        needed: chunk.length
      } as WorkletEvent)
    }
  }

  /**
   * Ensure enough samples are available in a channel
   */
  private ensureAvailable(channelId: number, sampleCount: number): void {
    if (channelId < 0 || channelId >= MAX_CHANNELS) return

    const channel = this.channels[channelId]!
    while (channel.buffer.getAvailableSamples() < sampleCount) {
      this.generateChunk(channelId)
    }
  }

  /**
   * Process audio (called by Web Audio for each render quantum)
   *
   * This is where the mixing happens:
   * 1. Read samples from all active channels
   * 2. Sum them together
   * 3. Apply global volume
   * 4. Clip to prevent distortion
   */
  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0]
    if (!output || output.length === 0) {
      return true
    }

    this.totalCallbacks++

    const outputChannel = output[0]!
    const sampleCount = outputChannel.length

    try {
      // Clear output buffer
      outputChannel.fill(0)

      // Temporary buffer for reading from each channel
      const channelSamples = new Float32Array(sampleCount)

      // Mix all active channels
      for (let i = 0; i < MAX_CHANNELS; i++) {
        const channel = this.channels[i]!

        if (!channel.active) {
          continue
        }

        // Ensure enough samples available
        this.ensureAvailable(i, sampleCount)

        // Read samples from this channel
        channel.buffer.readSamples(channelSamples, sampleCount)

        // Add to output (simple mixing by summation)
        for (let j = 0; j < sampleCount; j++) {
          outputChannel[j]! += channelSamples[j]!
        }
      }

      // Apply global volume and clip to [-1, 1]
      for (let i = 0; i < sampleCount; i++) {
        let sample = outputChannel[i]! * this.volume

        // Clip to prevent distortion
        if (sample > 1.0) sample = 1.0
        if (sample < -1.0) sample = -1.0

        outputChannel[i] = sample
      }

      // Copy to other channels if stereo
      for (let channel = 1; channel < output.length; channel++) {
        output[channel]!.set(outputChannel)
      }
    } catch (error) {
      // On error, output silence
      console.error('[MixerWorklet] Audio processing error:', error)
      for (let channel = 0; channel < output.length; channel++) {
        output[channel]!.fill(0)
      }
    }

    // Return true to keep processor alive
    return true
  }
}

// Register the processor
registerProcessor('mixer-audio-processor', MixerAudioProcessor)
