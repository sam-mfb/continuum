/**
 * Waveform and lookup table generators
 * Recreates the original sound data tables from Main.c init_sound()
 */

import { THRU_LO_AMP, THRU_ADD_AMP, EXPL_LO_PER, EXPL_ADD_PER } from './constants';

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

/**
 * Generate explosion random table matching original algorithm
 * From Main.c:1095-1096 in init_sound()
 * Creates random period values used for explosion sounds
 */
export const generateExplRands = (): Uint8Array => {
  const explRands = new Uint8Array(128);
  for (let i = 0; i < 128; i++) {
    // Original: expl_rands[i] = (char) EXPL_LO_PER + rint(EXPL_ADD_PER);
    // This generates values from 50 to 255 (50 + 0..205)
    explRands[i] = EXPL_LO_PER + Math.floor(Math.random() * EXPL_ADD_PER);
  }
  return explRands;
};