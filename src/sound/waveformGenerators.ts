/**
 * Waveform and lookup table generators
 * Recreates the original sound data tables from Main.c init_sound()
 */

import { THRU_LO_AMP, THRU_ADD_AMP } from './constants';

/**
 * Generate thrust random table matching original algorithm
 * From Main.c:1097-1098 in init_sound()
 * Creates the same random amplitude values used for thrust sound
 */
export const generateThruRands = (): Uint8Array => {
  const thruRands = new Uint8Array(128);
  for (let i = 0; i < 128; i++) {
    // Original: thru_rands[i] = (char) THRU_LO_AMP + rint(THRU_ADD_AMP);
    // This generates values from 64 to 191 (64 + 0..127)
    thruRands[i] = THRU_LO_AMP + Math.floor(Math.random() * THRU_ADD_AMP);
  }
  return thruRands;
};