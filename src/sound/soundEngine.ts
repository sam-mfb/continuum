/**
 * Core sound engine using Web Audio API
 * Recreates the original Continuum sound generation system
 */

import { SNDBUFLEN } from './constants'
import type { SoundEngine, PlayableSound, ExplosionParams } from './types'
import { generateThruRands, generateExplRands } from './waveformGenerators'

/**
 * Factory function for creating the sound engine
 * Replaces the original's VBL interrupt-based system with Web Audio API
 */
export const createSoundEngine = (): SoundEngine => {
  const audioContext = new (window.AudioContext ||
    (window as unknown as typeof AudioContext))()
  const masterGain = audioContext.createGain()
  masterGain.connect(audioContext.destination)

  // Pre-generate lookup tables (like init_sound() in Main.c)
  const thruRands = generateThruRands()
  const explRands = generateExplRands()

  /**
   * Create thrust sound generator
   * Based on do_thru_sound in Sound.c:179-206
   */
  const createThrustSound = (): PlayableSound => {
    // Original implementation:
    // - Fills SNDBUFLEN (370) bytes per VBL tick
    // - Uses chunks of 37 bytes, each filled with same value
    // - Value comes from thru_rands table, shifted right 1, then left 8

    // Create one second buffer
    const bufferDuration = 1.0
    const sampleRate = audioContext.sampleRate
    const bufferSize = Math.floor(bufferDuration * sampleRate)

    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate)
    const channelData = buffer.getChannelData(0)

    // Start at random position in lookup table (Sound.c:184)
    const startOffset = Math.floor(Math.random() * 64) // Random() & 63

    // Original fills SNDBUFLEN/37 chunks (10 chunks of 37 bytes each)
    const chunksPerBuffer = Math.floor(SNDBUFLEN / 37)
    const bytesPerChunk = 37

    // Calculate how many samples we need
    let bufferPos = 0
    let tablePos = startOffset

    while (bufferPos < bufferSize) {
      // Process chunks like the original
      for (let chunk = 0; chunk < chunksPerBuffer && bufferPos < bufferSize; chunk++) {
        // Get value from lookup table (Sound.c:189)
        const value = thruRands[tablePos & 127] ?? 0
        tablePos++

        // Original: lsr.w #1, D0 (shift right 1)
        // Then: lsl.w #8, D0 (shift left 8 to high byte)
        // This puts the value in range 32-95 in the high byte of a 16-bit word
        const shiftedValue = (value >>> 1) << 8 // Results in 8192-24320

        // Convert to normalized audio range
        // Original uses 16-bit signed, so -32768 to 32767
        const normalized = (shiftedValue - 16384) / 32768

        // Fill this chunk with the same value
        // Calculate samples for 37 bytes at original playback rate
        // Original plays at ~11kHz (370 bytes at 60Hz)
        const originalRate = (SNDBUFLEN * 60) / 2 // Approx 11.1kHz
        const samplesPerChunk = Math.floor((bytesPerChunk * sampleRate) / originalRate)

        for (let i = 0; i < samplesPerChunk && bufferPos < bufferSize; i++) {
          channelData[bufferPos++] = normalized
        }
      }
    }

    return {
      play: (): AudioBufferSourceNode => {
        const source = audioContext.createBufferSource()
        source.buffer = buffer
        source.loop = true // Thrust sound loops
        source.connect(masterGain)
        source.start()
        return source
      }
    }
  }

  /**
   * Factory for explosion sounds based on do_expl_sound() from Sound.c:153-177
   * Creates noise bursts with decaying amplitude
   */
  const createExplosionSound = (params: ExplosionParams): PlayableSound => {
    // Calculate total duration based on amplitude decay
    // Sound plays until amp > 127 (Sound.c:175)
    const totalFrames = Math.ceil((127 - params.initialAmp) / params.ampChange)
    const frameDuration = 1 / 60 // 60Hz VBL
    const totalDuration = totalFrames * frameDuration

    // Create buffer for the entire explosion
    const sampleRate = audioContext.sampleRate
    const bufferSize = Math.ceil(totalDuration * sampleRate)
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)

    // Implement explosion pattern from Sound.c:157-172
    let dataPos = 0
    let currentAmp = params.initialAmp

    // Process each VBL frame
    for (let frame = 0; frame < totalFrames && dataPos < bufferSize; frame++) {
      // Pick random starting position (Sound.c:157)
      const persIndex = Math.floor(Math.random() * 64) // Random() & 63

      // Samples per frame at our sample rate
      const samplesPerFrame = Math.floor(sampleRate / 60)
      let frameSampleCount = 0

      // Process SNDBUFLEN/2 iterations per frame (Sound.c:160)
      const iterations = Math.floor(SNDBUFLEN / 2)
      let iterPos = 0

      // Current amplitude value (alternates positive/negative)
      let amplitudeValue = currentAmp
      let isPositive = true

      while (
        iterPos < iterations &&
        frameSampleCount < samplesPerFrame &&
        dataPos < bufferSize
      ) {
        // Get random run length from table (Sound.c:165-166)
        const randIndex = (persIndex + Math.floor(iterPos / 8)) & 127
        const runLength = (explRands[randIndex] ?? 128) >> 1 // asr.w #1, D2

        // Toggle amplitude sign (Sound.c:163)
        isPositive = !isPositive
        const normalizedAmp =
          (isPositive ? amplitudeValue : -amplitudeValue) / 128

        // Fill samples for this run length
        const samplesToFill = Math.min(
          (runLength * sampleRate) / 11100, // Scale for sample rate
          samplesPerFrame - frameSampleCount,
          bufferSize - dataPos
        )

        for (let i = 0; i < samplesToFill; i++) {
          data[dataPos++] = normalizedAmp
          frameSampleCount++
        }

        iterPos += runLength
      }

      // Update amplitude for next frame (Sound.c:175)
      currentAmp += params.ampChange
    }

    return {
      play: (): AudioBufferSourceNode => {
        const source = audioContext.createBufferSource()
        source.buffer = buffer
        source.connect(masterGain)
        source.start()
        return source
      }
    }
  }

  /**
   * Set the master volume
   * @param volume - Volume level from 0 to 1
   */
  const setVolume = (volume: number): void => {
    masterGain.gain.value = Math.max(0, Math.min(1, volume))
  }

  return {
    audioContext,
    masterGain,
    createThrustSound,
    createExplosionSound,
    setVolume
  }
}

