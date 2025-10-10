/**
 * Basic Audio Worklet Processor
 *
 * Replaces the deprecated ScriptProcessorNode with modern AudioWorkletNode.
 * Runs in the audio rendering thread for better performance and lower latency.
 *
 * This processor maintains the exact same behavior as the original implementation:
 * - Single-sound, priority-based architecture
 * - Uses buffer manager logic to handle chunk generation
 * - Converts 8-bit unsigned samples to Float32
 *
 * Architecture:
 * - Main thread sends messages to control sound playback
 * - Worklet generates samples in audio thread
 * - Worklet posts messages back when sounds end
 */

/// <reference path="./worklet.d.ts" />

import type { SampleGenerator, RingBuffer } from '@/core/sound-shared'
import {
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

// Constants
const CHUNK_SIZE = 370
const BUFFER_SIZE = 8192 // Must be power of 2

/**
 * Message types from main thread to worklet
 */
type MainToWorkletMessage =
  | { type: 'setGenerator'; generatorType: string }
  | { type: 'clearSound' }

/**
 * Message types from worklet to main thread
 */
type WorkletToMainMessage =
  | { type: 'soundEnded' }
  | { type: 'stats'; underruns: number; totalCallbacks: number }

/**
 * Basic audio processor that maintains single-sound behavior
 */
class BasicAudioProcessor extends AudioWorkletProcessor {
  // Ring buffer for managing audio samples
  private ringBuffer: RingBuffer

  // Generator state
  private currentGenerator: SampleGenerator | null
  private hasReportedEnded: boolean

  // Performance tracking
  private underruns: number
  private totalCallbacks: number

  constructor() {
    super()

    this.ringBuffer = createRingBuffer(BUFFER_SIZE)
    // Fill buffer with silence to prevent underruns on first audio callback
    this.ringBuffer.fillWithSilence(BUFFER_SIZE)

    this.currentGenerator = null
    this.hasReportedEnded = false
    this.underruns = 0
    this.totalCallbacks = 0

    // Listen for messages from main thread
    this.port.onmessage = (event: MessageEvent<MainToWorkletMessage>): void => {
      this.handleMessage(event.data)
    }
  }

  /**
   * Handle messages from main thread
   */
  private handleMessage(message: MainToWorkletMessage): void {
    switch (message.type) {
      case 'setGenerator':
        this.setGenerator(message.generatorType)
        break

      case 'clearSound':
        this.currentGenerator = null
        this.hasReportedEnded = false
        this.ringBuffer.reset()
        break
    }
  }

  /**
   * Set the current generator based on type string
   */
  private setGenerator(generatorType: string): void {
    // Create the appropriate generator based on the sound type
    switch (generatorType) {
      case 'silence':
        this.currentGenerator = createSilenceGenerator()
        break
      case 'fire':
        this.currentGenerator = createFireGenerator()
        break
      case 'thruster':
        this.currentGenerator = createThrusterGenerator()
        break
      case 'shield':
        this.currentGenerator = createShieldGenerator()
        break
      case 'explosionBunker':
        this.currentGenerator = createExplosionGenerator(ExplosionType.BUNKER)
        break
      case 'explosionShip':
        this.currentGenerator = createExplosionGenerator(ExplosionType.SHIP)
        break
      case 'explosionAlien':
        this.currentGenerator = createExplosionGenerator(ExplosionType.ALIEN)
        break
      case 'bunker':
        this.currentGenerator = createBunkerGenerator()
        break
      case 'soft':
        this.currentGenerator = createSoftGenerator()
        break
      case 'fuel':
        this.currentGenerator = createFuelGenerator()
        break
      case 'crack':
        this.currentGenerator = createCrackGenerator()
        break
      case 'fizz':
        this.currentGenerator = createFizzGenerator()
        break
      case 'echo':
        this.currentGenerator = createEchoGenerator()
        break
      default:
        console.warn(`Unknown generator type: ${generatorType}`)
        this.currentGenerator = createSilenceGenerator()
    }

    // Reset/start the generator to activate it
    if (this.currentGenerator) {
      if (
        'start' in this.currentGenerator &&
        typeof this.currentGenerator.start === 'function'
      ) {
        this.currentGenerator.start()
      } else if (
        'reset' in this.currentGenerator &&
        typeof this.currentGenerator.reset === 'function'
      ) {
        this.currentGenerator.reset()
      }
    }

    this.hasReportedEnded = false
  }

  /**
   * Generate a chunk and add to buffer
   */
  private generateChunk(): void {
    if (!this.currentGenerator) {
      this.ringBuffer.fillWithSilence(CHUNK_SIZE)
      return
    }

    const chunk = this.currentGenerator.generateChunk()

    // Check if sound has ended
    if (!this.hasReportedEnded && this.currentGenerator.hasEnded()) {
      this.hasReportedEnded = true
      this.port.postMessage({ type: 'soundEnded' } as WorkletToMainMessage)
    }

    // Add chunk to ring buffer
    const written = this.ringBuffer.writeSamples(chunk)

    // Track underruns if we couldn't write the full chunk
    if (written < chunk.length) {
      this.underruns++
    }
  }

  /**
   * Ensure enough samples are available
   */
  private ensureAvailable(sampleCount: number): void {
    while (this.ringBuffer.getAvailableSamples() < sampleCount) {
      this.generateChunk()
    }
  }

  /**
   * Process audio (called by Web Audio for each render quantum)
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
      // Ensure enough samples are available
      this.ensureAvailable(sampleCount)

      // Read and convert samples from ring buffer
      this.ringBuffer.readSamples(outputChannel, sampleCount)

      // Copy to other channels if stereo
      for (let channel = 1; channel < output.length; channel++) {
        output[channel]!.set(outputChannel)
      }
    } catch (error) {
      // On error, output silence
      console.error('Audio processing error:', error)
      for (let channel = 0; channel < output.length; channel++) {
        output[channel]!.fill(0)
      }
    }

    // Periodically report stats
    if (this.totalCallbacks % 1000 === 0) {
      this.port.postMessage({
        type: 'stats',
        underruns: this.underruns,
        totalCallbacks: this.totalCallbacks
      } as WorkletToMainMessage)
    }

    // Return true to keep processor alive
    return true
  }
}

// Register the processor
registerProcessor('basic-audio-processor', BasicAudioProcessor)
