/**
 * Core sound engine using Web Audio API
 * Recreates the original Continuum sound generation system
 */

import { SNDBUFLEN } from './constants';
import type { SoundEngine, PlayableSound, ExplosionParams } from './types';
import { generateThruRands, generateExplRands } from './waveformGenerators';

/**
 * Factory function for creating the sound engine
 * Replaces the original's VBL interrupt-based system with Web Audio API
 */
export const createSoundEngine = (): SoundEngine => {
  const audioContext = new (window.AudioContext || (window as unknown as typeof AudioContext))();
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  
  // Pre-generate lookup tables (like init_sound() in Main.c)
  const thruRands = generateThruRands();
  const explRands = generateExplRands();
  
  /**
   * Factory for thrust sound based on do_thru_sound() from Sound.c:179-206
   * Recreates the low-frequency noise pattern of the original
   */
  const createThrustSound = (): PlayableSound => {
    // Original fills SNDBUFLEN (370) bytes, but uses every other byte for audio
    // So we have 185 actual audio samples per buffer
    const originalSamples = Math.floor(SNDBUFLEN / 2);
    
    // The original runs at 60Hz (VBL), updating the buffer each frame
    // With 185 samples per frame, that's 185 * 60 = 11,100 Hz effective sample rate
    const originalSampleRate = 11100;
    
    // Create a buffer that matches one VBL frame of the original
    const bufferDuration = originalSamples / originalSampleRate;
    const bufferSize = Math.floor(bufferDuration * audioContext.sampleRate);
    
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Implement original thrust pattern from Sound.c:184-202
    // Assembly analysis:
    // - pers = thru_rands + (Random() & 63) - start at random position
    // - Process SNDBUFLEN/37 chunks (10 chunks of 37 bytes each)
    // - Each chunk: read one random value, shift right 1, repeat it 37 times
    
    const startOffset = Math.floor(Math.random() * 64); // Random() & 63
    let bufferPos = 0;
    
    // Original: SNDBUFLEN/37-1 iterations (Sound.c:187)
    const chunks = Math.floor(SNDBUFLEN / 37);
    
    for (let chunk = 0; chunk < chunks; chunk++) {
      // Get next value from lookup table
      const tableIndex = (startOffset + chunk) & 127; // Wrap at 128
      let value = thruRands[tableIndex] ?? 0;
      
      // Original: lsr.w #1, D0 (logical shift right 1 bit)
      value = value >>> 1;
      
      // Original: lsl.w #8, D0 (shift left 8 to high byte of 16-bit word)
      // This effectively multiplies by 256 for 16-bit audio
      // For our normalized audio, we convert differently
      
      // Convert to normalized audio range (-1 to 1)
      // Original uses unsigned bytes, so value is now 32-95 (half of 64-191)
      const normalizedValue = (value - 64) / 64;
      
      // Fill 37 samples with this value (accounting for sample rate difference)
      const samplesPerChunk = Math.floor(37 * audioContext.sampleRate / originalSampleRate);
      
      for (let i = 0; i < samplesPerChunk && bufferPos < bufferSize; i++) {
        data[bufferPos++] = normalizedValue;
      }
    }
    
    // Ensure buffer is completely filled
    while (bufferPos < bufferSize) {
      // Wrap around to beginning if needed
      data[bufferPos] = data[bufferPos % (chunks * 37)] ?? 0;
      bufferPos++;
    }
    
    return {
      play: (): AudioBufferSourceNode => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(masterGain);
        source.start();
        return source;
      }
    };
  };
  
  /**
   * Factory for explosion sounds based on do_expl_sound() from Sound.c:153-177
   * Creates noise bursts with decaying amplitude
   */
  const createExplosionSound = (params: ExplosionParams): PlayableSound => {
    // Calculate total duration based on amplitude decay
    // Sound plays until amp > 127 (Sound.c:175)
    const totalFrames = Math.ceil((127 - params.initialAmp) / params.ampChange);
    const frameDuration = 1 / 60; // 60Hz VBL
    const totalDuration = totalFrames * frameDuration;
    
    // Create buffer for the entire explosion
    const sampleRate = audioContext.sampleRate;
    const bufferSize = Math.ceil(totalDuration * sampleRate);
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Implement explosion pattern from Sound.c:157-172
    let dataPos = 0;
    let currentAmp = params.initialAmp;
    
    // Process each VBL frame
    for (let frame = 0; frame < totalFrames && dataPos < bufferSize; frame++) {
      // Pick random starting position (Sound.c:157)
      const persIndex = Math.floor(Math.random() * 64); // Random() & 63
      
      // Samples per frame at our sample rate
      const samplesPerFrame = Math.floor(sampleRate / 60);
      let frameSampleCount = 0;
      
      // Process SNDBUFLEN/2 iterations per frame (Sound.c:160)
      const iterations = Math.floor(SNDBUFLEN / 2);
      let iterPos = 0;
      
      // Current amplitude value (alternates positive/negative)
      let amplitudeValue = currentAmp;
      let isPositive = true;
      
      while (iterPos < iterations && frameSampleCount < samplesPerFrame && dataPos < bufferSize) {
        // Get random run length from table (Sound.c:165-166)
        const randIndex = (persIndex + Math.floor(iterPos / 8)) & 127;
        const runLength = (explRands[randIndex] ?? 128) >> 1; // asr.w #1, D2
        
        // Toggle amplitude sign (Sound.c:163)
        isPositive = !isPositive;
        const normalizedAmp = (isPositive ? amplitudeValue : -amplitudeValue) / 128;
        
        // Fill samples for this run length
        const samplesToFill = Math.min(
          runLength * sampleRate / 11100, // Scale for sample rate
          samplesPerFrame - frameSampleCount,
          bufferSize - dataPos
        );
        
        for (let i = 0; i < samplesToFill; i++) {
          data[dataPos++] = normalizedAmp;
          frameSampleCount++;
        }
        
        iterPos += runLength;
      }
      
      // Update amplitude for next frame (Sound.c:175)
      currentAmp += params.ampChange;
    }
    
    return {
      play: (): AudioBufferSourceNode => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(masterGain);
        source.start();
        return source;
      }
    };
  };
  
  /**
   * Set the master volume
   * @param volume - Volume level from 0 to 1
   */
  const setVolume = (volume: number): void => {
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
  };
  
  return {
    audioContext,
    masterGain,
    createThrustSound,
    createExplosionSound,
    setVolume,
  };
};