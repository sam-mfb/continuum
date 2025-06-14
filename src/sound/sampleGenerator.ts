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
 * Type for sample generator builder functions
 */
export type SampleGeneratorBuilder = () => SampleGenerator;

/**
 * Builder for silence generator - outputs all samples at center value (128)
 */
export const buildSilenceGenerator: SampleGeneratorBuilder = () => {
  return {
    generateChunk(): Uint8Array {
      const chunk = new Uint8Array(CHUNK_SIZE);
      chunk.fill(CENTER_VALUE);
      return chunk;
    },
    
    reset(): void {
      // No state to reset
    }
  };
};

/**
 * Builder for sine wave generator - produces a pure tone at specified frequency
 */
export const buildSineWaveGenerator = (frequency: number): SampleGenerator => {
  let phase = 0;
  const phaseIncrement = (2 * Math.PI * frequency) / SAMPLE_RATE;
  
  return {
    generateChunk(): Uint8Array {
      const chunk = new Uint8Array(CHUNK_SIZE);
      
      for (let i = 0; i < CHUNK_SIZE; i++) {
        // Generate sine wave sample (-1.0 to 1.0)
        const sample = Math.sin(phase);
        
        // Convert to 8-bit unsigned (0-255)
        // -1.0 -> 0, 0.0 -> 128, 1.0 -> 255
        chunk[i] = Math.round(sample * 127 + CENTER_VALUE);
        
        // Advance phase
        phase += phaseIncrement;
        
        // Wrap phase to prevent numerical drift
        if (phase > 2 * Math.PI) {
          phase -= 2 * Math.PI;
        }
      }
      
      return chunk;
    },
    
    reset(): void {
      phase = 0;
    }
  };
};

/**
 * Builder for white noise generator - produces random samples
 */
export const buildWhiteNoiseGenerator: SampleGeneratorBuilder = () => {
  return {
    generateChunk(): Uint8Array {
      const chunk = new Uint8Array(CHUNK_SIZE);
      
      for (let i = 0; i < CHUNK_SIZE; i++) {
        // Generate random value 0-255
        chunk[i] = Math.floor(Math.random() * 256);
      }
      
      return chunk;
    },
    
    reset(): void {
      // No state to reset (each chunk is independent)
    }
  };
};

/**
 * Builder for musical interval generator - produces alternating tones
 * Useful for testing pitch accuracy and audio quality
 */
export const buildMusicalIntervalGenerator = (frequencies: number[], noteDuration: number = 0.5): SampleGenerator => {
  const generators = frequencies.map(freq => buildSineWaveGenerator(freq));
  let currentIndex = 0;
  let samplesGenerated = 0;
  const samplesPerNote = Math.floor(SAMPLE_RATE * noteDuration);
  
  return {
    generateChunk(): Uint8Array {
      const chunk = new Uint8Array(CHUNK_SIZE);
      let chunkIndex = 0;
      
      while (chunkIndex < CHUNK_SIZE) {
        // Get current generator
        const generator = generators[currentIndex]!;
        
        // Generate a temporary chunk from current generator
        const tempChunk = generator.generateChunk();
        
        // Calculate how many samples to copy
        const samplesRemaining = samplesPerNote - samplesGenerated;
        const samplesToUse = Math.min(
          CHUNK_SIZE - chunkIndex,
          samplesRemaining,
          tempChunk.length
        );
        
        // Copy samples
        for (let i = 0; i < samplesToUse; i++) {
          chunk[chunkIndex++] = tempChunk[i]!;
        }
        
        samplesGenerated += samplesToUse;
        
        // Check if we need to switch to next note
        if (samplesGenerated >= samplesPerNote) {
          currentIndex = (currentIndex + 1) % generators.length;
          samplesGenerated = 0;
          generators[currentIndex]!.reset();
        }
      }
      
      return chunk;
    },
    
    reset(): void {
      currentIndex = 0;
      samplesGenerated = 0;
      generators.forEach(gen => gen.reset());
    }
  };
};

/**
 * Factory function to create common test generators
 */
export const createTestGenerators = (): Record<string, SampleGenerator> => ({
  silence: buildSilenceGenerator(),
  sine440: buildSineWaveGenerator(440),    // A4
  sine880: buildSineWaveGenerator(880),    // A5
  sine220: buildSineWaveGenerator(220),    // A3
  whiteNoise: buildWhiteNoiseGenerator(),
  majorChord: buildMusicalIntervalGenerator([261.63, 329.63, 392.00], 0.5), // C4, E4, G4
  octaves: buildMusicalIntervalGenerator([220, 440, 880], 0.25) // A3, A4, A5
});