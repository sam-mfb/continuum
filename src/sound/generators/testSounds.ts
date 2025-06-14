/**
 * Test Sound Generators
 * 
 * This module provides simple test sound generators for debugging and testing
 * the audio system. These are not from the original game.
 */

import { 
  buildSilenceGenerator,
  buildSineWaveGenerator,
  buildWhiteNoiseGenerator,
  buildMusicalIntervalGenerator
} from '../sampleGenerator'

/**
 * Factory function to create test sound generators
 */
export const createTestSounds = () => ({
  silence: buildSilenceGenerator(),
  sine440: buildSineWaveGenerator(440), // A4
  sine880: buildSineWaveGenerator(880), // A5
  sine220: buildSineWaveGenerator(220), // A3
  whiteNoise: buildWhiteNoiseGenerator(),
  majorChord: buildMusicalIntervalGenerator([261.63, 329.63, 392.0], 0.5), // C4, E4, G4
  octaves: buildMusicalIntervalGenerator([220, 440, 880], 0.25) // A3, A4, A5
}) as const

export type TestSoundType = keyof ReturnType<typeof createTestSounds>