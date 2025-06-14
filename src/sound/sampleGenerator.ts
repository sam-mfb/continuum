/**
 * Sample Generator for the new 370-byte chunk-based sound system
 * 
 * This module provides the interface and implementations for generating
 * exactly 370 bytes of 8-bit unsigned audio data at 22.2kHz.
 * 
 * The 370-byte chunk size matches the original Mac game's audio buffer
 * architecture while adapting to modern browser audio APIs.
 */

/**
 * Sample rate of the original Mac game audio
 */
export const SAMPLE_RATE = 22200; // 22.2kHz

/**
 * Number of bytes per chunk - must match original Mac buffer size
 */
export const CHUNK_SIZE = 370;

/**
 * Center value for 8-bit unsigned audio (silence)
 */
export const CENTER_VALUE = 128; // 0x80

/**
 * Interface for sample generators
 * Each generator must produce exactly 370 bytes of 8-bit unsigned audio
 */
export type SampleGenerator = {
  /**
   * Generate the next chunk of audio samples
   * @returns Uint8Array of exactly 370 bytes (8-bit unsigned, 0-255 range)
   */
  generateChunk(): Uint8Array;
  
  /**
   * Reset the generator to its initial state
   */
  reset(): void;
}

/**
 * Silence generator - outputs all samples at center value (128)
 */
export class SilenceGenerator implements SampleGenerator {
  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(CHUNK_SIZE);
    chunk.fill(CENTER_VALUE);
    return chunk;
  }
  
  reset(): void {
    // No state to reset
  }
}

/**
 * Sine wave generator - produces a pure tone at specified frequency
 */
export class SineWaveGenerator implements SampleGenerator {
  private phase: number = 0;
  private readonly phaseIncrement: number;
  
  constructor(frequency: number) {
    // Calculate phase increment per sample
    this.phaseIncrement = (2 * Math.PI * frequency) / SAMPLE_RATE;
  }
  
  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(CHUNK_SIZE);
    
    for (let i = 0; i < CHUNK_SIZE; i++) {
      // Generate sine wave sample (-1.0 to 1.0)
      const sample = Math.sin(this.phase);
      
      // Convert to 8-bit unsigned (0-255)
      // -1.0 -> 0, 0.0 -> 128, 1.0 -> 255
      chunk[i] = Math.round(sample * 127 + CENTER_VALUE);
      
      // Advance phase
      this.phase += this.phaseIncrement;
      
      // Wrap phase to prevent numerical drift
      if (this.phase > 2 * Math.PI) {
        this.phase -= 2 * Math.PI;
      }
    }
    
    return chunk;
  }
  
  reset(): void {
    this.phase = 0;
  }
}

/**
 * White noise generator - produces random samples
 */
export class WhiteNoiseGenerator implements SampleGenerator {
  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(CHUNK_SIZE);
    
    for (let i = 0; i < CHUNK_SIZE; i++) {
      // Generate random value 0-255
      chunk[i] = Math.floor(Math.random() * 256);
    }
    
    return chunk;
  }
  
  reset(): void {
    // No state to reset (each chunk is independent)
  }
}

/**
 * Musical interval generator - produces alternating tones
 * Useful for testing pitch accuracy and audio quality
 */
export class MusicalIntervalGenerator implements SampleGenerator {
  private generators: SineWaveGenerator[];
  private currentIndex: number = 0;
  private samplesGenerated: number = 0;
  private readonly samplesPerNote: number;
  
  constructor(frequencies: number[], noteDuration: number = 0.5) {
    this.generators = frequencies.map(freq => new SineWaveGenerator(freq));
    this.samplesPerNote = Math.floor(SAMPLE_RATE * noteDuration);
  }
  
  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(CHUNK_SIZE);
    let chunkIndex = 0;
    
    while (chunkIndex < CHUNK_SIZE) {
      // Get current generator
      const generator = this.generators[this.currentIndex]!;
      
      // Generate a temporary chunk from current generator
      const tempChunk = generator.generateChunk();
      
      // Calculate how many samples to copy
      const samplesRemaining = this.samplesPerNote - this.samplesGenerated;
      const samplesToUse = Math.min(
        CHUNK_SIZE - chunkIndex,
        samplesRemaining,
        tempChunk.length
      );
      
      // Copy samples
      for (let i = 0; i < samplesToUse; i++) {
        chunk[chunkIndex++] = tempChunk[i]!;
      }
      
      this.samplesGenerated += samplesToUse;
      
      // Check if we need to switch to next note
      if (this.samplesGenerated >= this.samplesPerNote) {
        this.currentIndex = (this.currentIndex + 1) % this.generators.length;
        this.samplesGenerated = 0;
        this.generators[this.currentIndex]!.reset();
      }
    }
    
    return chunk;
  }
  
  reset(): void {
    this.currentIndex = 0;
    this.samplesGenerated = 0;
    this.generators.forEach(gen => gen.reset());
  }
}

/**
 * Factory function to create common test generators
 */
export const createTestGenerators = (): Record<string, SampleGenerator> => ({
  silence: new SilenceGenerator(),
  sine440: new SineWaveGenerator(440),    // A4
  sine880: new SineWaveGenerator(880),    // A5
  sine220: new SineWaveGenerator(220),    // A3
  whiteNoise: new WhiteNoiseGenerator(),
  majorChord: new MusicalIntervalGenerator([261.63, 329.63, 392.00], 0.5), // C4, E4, G4
  octaves: new MusicalIntervalGenerator([220, 440, 880], 0.25) // A3, A4, A5
});