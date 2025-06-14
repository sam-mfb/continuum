/**
 * Sound test component for testing and debugging sound playback
 * Provides UI controls for playing sounds and adjusting volume
 */

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { SoundType } from '../../sound/constants';
import { soundManager } from '../../sound/soundManager';
import { setVolume, toggleSound } from '../../sound/soundSlice';

/**
 * Get human-readable name for sound type
 */
const getSoundName = (soundType: SoundType): string => {
  const names: Record<SoundType, string> = {
    [SoundType.NO_SOUND]: 'No Sound',
    [SoundType.FIRE_SOUND]: 'Fire',
    [SoundType.EXP1_SOUND]: 'Bunker Explosion',
    [SoundType.THRU_SOUND]: 'Thrust',
    [SoundType.BUNK_SOUND]: 'Bunker Fire',
    [SoundType.SOFT_SOUND]: 'Soft Bunker',
    [SoundType.SHLD_SOUND]: 'Shield',
    [SoundType.FUEL_SOUND]: 'Fuel Pickup',
    [SoundType.EXP2_SOUND]: 'Ship Explosion',
    [SoundType.EXP3_SOUND]: 'Alien Explosion',
    [SoundType.CRACK_SOUND]: 'Mission Complete',
    [SoundType.FIZZ_SOUND]: 'Planet Fizz',
    [SoundType.ECHO_SOUND]: 'Echo Away'
  };
  return names[soundType] || `Unknown (${soundType})`;
};

export const SoundTest: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentSound, priority, enabled, volume } = useAppSelector(state => state.sound);
  
  // Initialize sound system on mount
  React.useEffect(() => {
    soundManager.initialize();
    
    return (): void => {
      // Stop any playing sound when unmounting
      soundManager.stopSound();
    };
  }, []);
  
  const handlePlaySound = (soundType: SoundType): void => {
    soundManager.startSound(soundType);
  };
  
  const handleStopSound = (): void => {
    soundManager.stopSound();
  };
  
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = parseFloat(event.target.value);
    dispatch(setVolume(newVolume));
  };
  
  const handleToggleSound = (): void => {
    dispatch(toggleSound());
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Sound Test</h2>
      
      {/* Master Controls */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Master Controls</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleSound}
            />
            Sound Enabled
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Volume: 
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{ marginLeft: '10px' }}
            />
            <span style={{ marginLeft: '10px' }}>{Math.round(volume * 100)}%</span>
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          Current Sound: <strong>{getSoundName(currentSound)}</strong> (Priority: {priority})
        </div>
        <button onClick={handleStopSound} style={{ padding: '5px 10px' }}>
          Stop All Sounds
        </button>
      </div>
      
      {/* Sound Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Sounds</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '600px' }}>
          {/* Currently implemented sounds */}
          <div style={{ padding: '10px', border: '1px solid #0f0', backgroundColor: '#f0fff0' }}>
            <h4>Implemented</h4>
            <button
              onClick={() => handlePlaySound(SoundType.THRU_SOUND)}
              style={{
                padding: '10px',
                width: '100%',
                backgroundColor: currentSound === SoundType.THRU_SOUND ? '#0f0' : '#fff',
                cursor: 'pointer'
              }}
              disabled={!enabled}
            >
              Thrust (Priority: 35)
            </button>
          </div>
          
          {/* Not yet implemented sounds */}
          <div style={{ padding: '10px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
            <h4>Not Yet Implemented</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                SoundType.FIRE_SOUND,
                SoundType.EXP1_SOUND,
                SoundType.BUNK_SOUND,
                SoundType.SOFT_SOUND,
                SoundType.SHLD_SOUND,
                SoundType.FUEL_SOUND,
                SoundType.EXP2_SOUND,
                SoundType.EXP3_SOUND,
                SoundType.CRACK_SOUND,
                SoundType.FIZZ_SOUND,
                SoundType.ECHO_SOUND
              ].map(soundType => (
                <button
                  key={soundType}
                  onClick={() => handlePlaySound(soundType)}
                  style={{
                    padding: '5px',
                    backgroundColor: '#eee',
                    cursor: 'not-allowed',
                    opacity: 0.5
                  }}
                  disabled={true}
                  title="This sound has not been implemented yet"
                >
                  {getSoundName(soundType)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>Instructions</h3>
        <ul>
          <li>Click on a sound button to play it</li>
          <li>Higher priority sounds will interrupt lower priority ones</li>
          <li>Use the volume slider to adjust the master volume</li>
          <li>Uncheck "Sound Enabled" to disable all sounds</li>
          <li>The thrust sound should produce a low-frequency rumbling noise</li>
        </ul>
      </div>
    </div>
  );
};