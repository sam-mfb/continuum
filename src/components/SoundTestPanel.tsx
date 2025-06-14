/**
 * Sound Test Panel Component
 * 
 * Provides UI for testing the new sound system with various test sounds
 * Part of Phase 6: Browser Integration & Manual Testing
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setVolume, toggleSound } from '../sound/soundSlice';
import { soundManager } from '../sound';

// Extended sound engine interface for testing
type TestSoundEngine = {
  playTestSound: (soundType: string) => void;
  getTestSounds: () => string[];
  getStats: () => {
    underruns: number;
    totalCallbacks: number;
    averageLatency: number;
    bufferState: {
      writePosition: number;
      readPosition: number;
      available: number;
    };
  };
  isPlaying: () => boolean;
}

export const SoundTestPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { volume: masterVolume, enabled } = useSelector((state: RootState) => state.sound);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<string>('silence');
  const [stats, setStats] = useState<ReturnType<TestSoundEngine['getStats']> | null>(null);
  const [testSounds, setTestSounds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get the sound engine with test methods
  const engine = soundManager.getEngine() as unknown as TestSoundEngine;

  useEffect(() => {
    // Initialize sound manager on mount
    if (!isInitialized) {
      soundManager.initialize();
      setIsInitialized(true);
    }
    
    if (engine && engine.getTestSounds) {
      setTestSounds(engine.getTestSounds());
    }
  }, [engine, isInitialized]);

  useEffect(() => {
    // Update stats every 100ms when playing
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (engine && engine.getStats) {
        setStats(engine.getStats());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, engine]);

  const handleStart = () => {
    soundManager.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    soundManager.stop();
    setIsPlaying(false);
  };

  const handleSoundChange = (soundType: string) => {
    setCurrentSound(soundType);
    if (engine && engine.playTestSound) {
      engine.playTestSound(soundType);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    dispatch(setVolume(volume));
  };

  const handleMuteToggle = () => {
    dispatch(toggleSound());
  };

  const formatLatency = (ms: number): string => {
    return ms < 1 ? `${(ms * 1000).toFixed(1)}μs` : `${ms.toFixed(2)}ms`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sound System</h2>
      
      {/* Audio Control */}
      <div style={styles.section}>
        <h3>Audio Control</h3>
        <div style={styles.controls}>
          <button 
            onClick={isPlaying ? handleStop : handleStart}
            style={{
              ...styles.button,
              backgroundColor: isPlaying ? '#ff4444' : '#44ff44'
            }}
          >
            {isPlaying ? 'Stop Audio' : 'Start Audio'}
          </button>
          
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={!enabled}
              onChange={handleMuteToggle}
            />
            Muted
          </label>
        </div>
        
        <div style={styles.volumeControl}>
          <label style={styles.label}>
            Volume: {Math.round(masterVolume * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={handleVolumeChange}
              style={styles.slider}
            />
          </label>
        </div>
      </div>

      {/* Test Sounds */}
      <div style={styles.section}>
        <h3>Test Sounds</h3>
        <div style={styles.soundGrid}>
          {testSounds.map(sound => (
            <button
              key={sound}
              onClick={() => handleSoundChange(sound)}
              style={{
                ...styles.soundButton,
                backgroundColor: currentSound === sound ? '#4488ff' : '#f0f0f0',
                color: currentSound === sound ? 'white' : 'black'
              }}
              disabled={!isPlaying}
            >
              {sound}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Stats */}
      {stats && (
        <div style={styles.section}>
          <h3>Performance Statistics</h3>
          <div style={styles.stats}>
            <div>Audio Callbacks: {stats.totalCallbacks}</div>
            <div>Underruns: <span style={{ color: stats.underruns > 0 ? 'red' : 'green' }}>
              {stats.underruns}
            </span></div>
            <div>Average Latency: {formatLatency(stats.averageLatency)}</div>
            <div>Buffer Fill: {stats.bufferState.available} / 8192 samples</div>
            <div>Buffer Usage: {((stats.bufferState.available / 8192) * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={styles.section}>
        <h3>Testing Instructions</h3>
        <ul style={styles.instructions}>
          <li>Click "Start Audio" to begin playback</li>
          <li>Select different test sounds to verify:
            <ul>
              <li><strong>silence</strong>: Should produce no sound</li>
              <li><strong>sine440</strong>: A4 note (440Hz) - concert pitch</li>
              <li><strong>sine880</strong>: A5 note (880Hz) - one octave up</li>
              <li><strong>sine220</strong>: A3 note (220Hz) - one octave down</li>
              <li><strong>whiteNoise</strong>: Random static sound</li>
              <li><strong>majorChord</strong>: C-E-G chord</li>
              <li><strong>octaves</strong>: Alternating A3-A4-A5</li>
            </ul>
          </li>
          <li>Monitor performance stats for underruns (should be 0)</li>
          <li>Test volume control and mute functionality</li>
        </ul>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '30px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  controls: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    marginBottom: '15px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  volumeControl: {
    marginTop: '10px',
  },
  slider: {
    width: '200px',
    marginLeft: '10px',
  },
  soundGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
  },
  soundButton: {
    padding: '15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 'bold',
  },
  stats: {
    fontFamily: 'monospace',
    lineHeight: '1.6',
  },
  instructions: {
    lineHeight: '1.8',
    paddingLeft: '20px',
  },
};