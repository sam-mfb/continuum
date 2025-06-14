/**
 * Tests for waveform generators
 * Verifies that generated lookup tables match the original specifications
 */

import { describe, it, expect } from 'vitest';
import { generateThruRands, generateExplRands } from '../waveformGenerators';
import { THRU_LO_AMP, THRU_ADD_AMP, EXPL_LO_PER, EXPL_ADD_PER } from '../constants';

describe('generateThruRands', () => {
  it('generates array of correct length', () => {
    const thruRands = generateThruRands();
    expect(thruRands.length).toBe(128);
  });

  it('generates values in correct range', () => {
    const thruRands = generateThruRands();
    
    for (let i = 0; i < thruRands.length; i++) {
      const value = thruRands[i];
      // Values should be between THRU_LO_AMP (64) and THRU_LO_AMP + THRU_ADD_AMP - 1 (191)
      expect(value).toBeGreaterThanOrEqual(THRU_LO_AMP);
      expect(value).toBeLessThanOrEqual(THRU_LO_AMP + THRU_ADD_AMP - 1);
    }
  });

  it('generates different sequences on each call', () => {
    const thruRands1 = generateThruRands();
    const thruRands2 = generateThruRands();
    
    // Arrays should be different (extremely unlikely to be identical)
    let isDifferent = false;
    for (let i = 0; i < 128; i++) {
      if (thruRands1[i] !== thruRands2[i]) {
        isDifferent = true;
        break;
      }
    }
    expect(isDifferent).toBe(true);
  });

  it('generates reasonable distribution of values', () => {
    const thruRands = generateThruRands();
    const sum = thruRands.reduce((acc, val) => acc + val, 0);
    const average = sum / thruRands.length;
    
    // Average should be close to the middle of the range
    const expectedAverage = THRU_LO_AMP + (THRU_ADD_AMP / 2);
    expect(average).toBeGreaterThan(expectedAverage - 20);
    expect(average).toBeLessThan(expectedAverage + 20);
  });
});

describe('generateExplRands', () => {
  it('generates array of correct length', () => {
    const explRands = generateExplRands();
    expect(explRands.length).toBe(128);
  });

  it('generates values in correct range', () => {
    const explRands = generateExplRands();
    
    for (let i = 0; i < explRands.length; i++) {
      const value = explRands[i];
      // Values should be between EXPL_LO_PER (50) and EXPL_LO_PER + EXPL_ADD_PER - 1 (254)
      expect(value).toBeGreaterThanOrEqual(EXPL_LO_PER);
      expect(value).toBeLessThanOrEqual(EXPL_LO_PER + EXPL_ADD_PER - 1);
    }
  });

  it('generates different sequences on each call', () => {
    const explRands1 = generateExplRands();
    const explRands2 = generateExplRands();
    
    // Arrays should be different
    let isDifferent = false;
    for (let i = 0; i < 128; i++) {
      if (explRands1[i] !== explRands2[i]) {
        isDifferent = true;
        break;
      }
    }
    expect(isDifferent).toBe(true);
  });
});