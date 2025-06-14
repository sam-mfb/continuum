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
    <div className="sound-view">
      <h2>SOUND TEST</h2>
      
      {/* Master Controls */}
      <div className="mac-window-content">
        <div className="mac-group-box">
          <div className="mac-group-title">MASTER CONTROLS</div>
          <div className="mac-checkbox">
            <input
              type="checkbox"
              id="sound-enabled"
              checked={enabled}
              onChange={handleToggleSound}
            />
            <label htmlFor="sound-enabled">Sound Enabled</label>
          </div>
          
          <div className="mac-control-group" style={{ marginTop: '10px' }}>
            <div>Volume: {Math.round(volume * 100)}%</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="mac-slider"
              style={{ width: '200px', marginTop: '5px' }}
            />
          </div>
          
          <div className="mac-info-line" style={{ marginTop: '10px' }}>
            Current: {getSoundName(currentSound)} (Priority: {priority})
          </div>
          
          <button 
            onClick={handleStopSound} 
            className="mac-button"
            style={{ marginTop: '10px' }}
          >
            STOP ALL SOUNDS
          </button>
        </div>
      </div>
      
      {/* Sound Buttons */}
      <div className="mac-window-content" style={{ marginTop: '20px' }}>
        <h3>AVAILABLE SOUNDS</h3>
        <div className="sound-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {/* Currently implemented sounds */}
          <div className="mac-group-box">
            <div className="mac-group-title">IMPLEMENTED</div>
            <div className="sound-button-group">
              <button
                onClick={() => handlePlaySound(SoundType.THRU_SOUND)}
                className={`mac-button ${currentSound === SoundType.THRU_SOUND ? 'active' : ''}`}
                style={{ width: '100%' }}
                disabled={!enabled}
              >
                THRUST (35)
              </button>
            </div>
          </div>
          
          {/* Not yet implemented sounds */}
          <div className="mac-group-box">
            <div className="mac-group-title">NOT YET IMPLEMENTED</div>
            <div className="sound-button-group">
              {[
                SoundType.FIRE_SOUND,
                SoundType.EXP1_SOUND,
                SoundType.EXP2_SOUND,
                SoundType.EXP3_SOUND,
                SoundType.BUNK_SOUND,
                SoundType.SOFT_SOUND,
                SoundType.SHLD_SOUND,
                SoundType.FUEL_SOUND,
                SoundType.CRACK_SOUND,
                SoundType.FIZZ_SOUND,
                SoundType.ECHO_SOUND
              ].map(soundType => (
                <button
                  key={soundType}
                  className="mac-button disabled"
                  style={{ width: '100%', marginBottom: '5px', opacity: 0.5 }}
                  disabled={true}
                  title="This sound has not been implemented yet"
                >
                  {getSoundName(soundType).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mac-window-content" style={{ marginTop: '20px' }}>
        <div className="mac-group-box">
          <div className="mac-group-title">INSTRUCTIONS</div>
          <div className="mac-text" style={{ padding: '10px' }}>
            • Click on a sound button to play it<br />
            • Higher priority sounds will interrupt lower priority ones<br />
            • Use the volume slider to adjust the master volume<br />
            • Uncheck "Sound Enabled" to disable all sounds<br />
            • Numbers in parentheses indicate sound priority
          </div>
        </div>
      </div>
    </div>
  );
};