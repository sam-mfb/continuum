/**
 * Core sound engine using Web Audio API
 * Recreates the original Continuum sound generation system
 */

import { SNDBUFLEN } from './constants';
import type { SoundEngine, PlayableSound } from './types';
import { generateThruRands } from './waveformGenerators';

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
  
  /**
   * Factory for thrust sound based on do_thru_sound() from Sound.c:179-206
   * Recreates the low-frequency noise pattern of the original
   */
  const createThrustSound = (): PlayableSound => {
    // The original uses SNDBUFLEN (370 bytes) with every other byte
    // We'll create a longer buffer for smoother looping
    const samplesPerBuffer = SNDBUFLEN;
    const sampleRate = audioContext.sampleRate;
    
    // Create a buffer that will loop seamlessly
    // Use a low sample rate to match the original's low-fi sound
    const effectiveSampleRate = 11025; // Classic Mac sample rate
    const bufferDuration = samplesPerBuffer / effectiveSampleRate;
    const bufferSize = Math.floor(bufferDuration * sampleRate);
    
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Implement original thrust pattern from Sound.c:184-202
    // The assembly code shows:
    // - Picks random starting point in thru_rands using Random() & 63
    // - Shifts right by 1 (divides by 2)
    // - Repeats each value 37 times for low frequency
    
    const persIndex = Math.floor(Math.random() * 64); // Random() & 63
    let dataPos = 0;
    
    // Original uses SNDBUFLEN/37 iterations (Sound.c:187)
    const iterations = Math.floor(SNDBUFLEN / 37);
    
    for (let count = 0; count < iterations && dataPos < bufferSize; count++) {
      const randIndex = (persIndex + count) % 128;
      let value = thruRands[randIndex] ?? 0;
      
      // Original: lsr.w #1, D0 (shift right 1 = divide by 2)
      value = value >> 1;
      
      // Convert to normalized audio range (-1 to 1)
      // Original uses unsigned bytes with 128 as center
      const normalizedValue = (value - 64) / 64;
      
      // Original repeats value 37 times (Sound.c:195-201)
      // Scale repetitions based on our sample rate
      const repetitions = Math.floor(37 * sampleRate / effectiveSampleRate);
      
      for (let repeat = 0; repeat < repetitions && dataPos < bufferSize; repeat++) {
        data[dataPos++] = normalizedValue;
      }
    }
    
    // Fill any remaining buffer space
    while (dataPos < bufferSize) {
      data[dataPos] = data[dataPos % samplesPerBuffer] ?? 0;
      dataPos++;
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
  
  return {
    audioContext,
    masterGain,
    createThrustSound,
  };
};