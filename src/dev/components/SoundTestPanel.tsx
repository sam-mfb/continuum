/**
 * Sound Test Panel Component
 *
 * Provides UI for testing the sound system with game sounds
 */

import React, { useState, useEffect } from 'react'
import {
  createSoundService,
  type SoundService,
  SOUND_PRIORITIES,
  SoundType
} from '@core/sound'

// Map SoundType enum values to display names
const SOUND_NAMES: Record<SoundType, string> = {
  [SoundType.NO_SOUND]: 'No Sound',
  [SoundType.FIRE_SOUND]: 'Ship Fire',
  [SoundType.EXP1_SOUND]: 'Bunker Explosion',
  [SoundType.THRU_SOUND]: 'Thruster',
  [SoundType.BUNK_SOUND]: 'Bunker Shot',
  [SoundType.SOFT_SOUND]: 'Bunker Soft',
  [SoundType.SHLD_SOUND]: 'Shield',
  [SoundType.FUEL_SOUND]: 'Fuel Collect',
  [SoundType.EXP2_SOUND]: 'Ship Explosion',
  [SoundType.EXP3_SOUND]: 'Alien Explosion',
  [SoundType.CRACK_SOUND]: 'Level Complete',
  [SoundType.FIZZ_SOUND]: 'Level Transition',
  [SoundType.ECHO_SOUND]: 'Echo'
}

export const SoundTestPanel: React.FC = () => {
  const [soundService, setSoundService] = useState<SoundService | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(1.0)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    // Initialize sound service on mount
    if (!isInitialized) {
      createSoundService({ volume: masterVolume, muted: !enabled })
        .then(service => {
          setSoundService(service)
          // Sync initial state
          service.setVolume(masterVolume)
          service.setMuted(!enabled) // enabled=true means not muted
          setIsInitialized(true)
        })
        .catch(error => {
          console.error('Failed to initialize sound service:', error)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]) // Only depend on isInitialized, not volume/enabled

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const volume = parseFloat(e.target.value)
    setMasterVolume(volume)
    if (soundService) {
      soundService.setVolume(volume)
    }
  }

  const handleMuteToggle = (): void => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    if (soundService) {
      // If sound is enabled (newEnabled = true), then muted = false
      // If sound is disabled (newEnabled = false), then muted = true
      soundService.setMuted(!newEnabled)
    }
  }

  // Helper to play a sound
  const playSound = (playFunc: () => void): void => {
    playFunc()
  }

  const handleStopSound = (): void => {
    if (!soundService) return
    soundService.clearSound()
  }

  // Sort sounds by priority (highest first)
  const sortedPriorities = Object.entries(SOUND_PRIORITIES)
    .filter(([key]) => Number(key) !== SoundType.NO_SOUND)
    .sort(([, a], [, b]) => b - a)
    .map(([key, priority]) => ({
      soundType: Number(key) as SoundType,
      priority
    }))

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sound System Test Panel</h2>

      {/* Audio Control */}
      <div style={styles.section}>
        <h3>Audio Control</h3>
        <div style={styles.controls}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={!enabled}
              onChange={handleMuteToggle}
            />
            Muted
          </label>
          <button
            onClick={handleStopSound}
            style={styles.stopButton}
            disabled={!soundService}
          >
            Stop Sound
          </button>
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

      {/* Sound Priorities */}
      <div style={styles.section}>
        <h3>Sound Priorities</h3>
        <div style={styles.priorityGrid}>
          {sortedPriorities.map(({ soundType, priority }) => (
            <div key={soundType} style={styles.priorityItem}>
              <span style={styles.priorityName}>{SOUND_NAMES[soundType]}:</span>
              <span style={styles.priorityValue}>{priority}</span>
            </div>
          ))}
        </div>
        <p style={styles.priorityNote}>
          Higher priority sounds will interrupt lower priority sounds
        </p>
      </div>

      {/* Ship Sounds */}
      <div style={styles.section}>
        <h3>Ship Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => playSound(() => soundService?.playShipFire())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fire
          </button>
          <button
            onClick={() => playSound(() => soundService?.playShipThrust())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Thrust
          </button>
          <button
            onClick={() => playSound(() => soundService?.playShipShield())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Shield
          </button>
          <button
            onClick={() => playSound(() => soundService?.playShipExplosion())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Explosion
          </button>
        </div>
      </div>

      {/* Bunker Sounds */}
      <div style={styles.section}>
        <h3>Bunker Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => playSound(() => soundService?.playBunkerShoot())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Shoot
          </button>
          <button
            onClick={() => playSound(() => soundService?.playBunkerExplosion())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Explosion
          </button>
          <button
            onClick={() => playSound(() => soundService?.playBunkerSoft())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Soft
          </button>
        </div>
      </div>

      {/* Other Game Sounds */}
      <div style={styles.section}>
        <h3>Other Game Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => playSound(() => soundService?.playFuelCollect())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fuel Collect
          </button>
          <button
            onClick={() => playSound(() => soundService?.playAlienExplosion())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Alien Explosion
          </button>
          <button
            onClick={() => playSound(() => soundService?.playLevelComplete())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Complete
          </button>
          <button
            onClick={() => playSound(() => soundService?.playLevelTransition())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Transition
          </button>
          <button
            onClick={() => playSound(() => soundService?.playEcho())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Echo
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.section}>
        <h3>Usage Instructions</h3>
        <ul style={styles.instructions}>
          <li>Click any button to play the corresponding game sound</li>
          <li>Use the volume slider to adjust the master volume</li>
          <li>Check the mute checkbox to disable all sounds</li>
          <li>
            Click <strong>Stop Sound</strong> to immediately stop any playing
            sound (equivalent to original game's clear_sound)
          </li>
          <li>
            <strong>All Sounds:</strong> Click any button to play that sound.
            Thrust and Shield will continue playing until interrupted or
            stopped.
          </li>
          <li>
            <strong>Priority System:</strong> Sounds with higher priority values
            will interrupt sounds with lower priority. For example, Ship
            Explosion (100) will interrupt any other sound, while Bunker Soft
            (30) can be interrupted by almost any other sound.
          </li>
          <li>
            <strong>Testing Scenarios:</strong>
            <ul>
              <li>
                Play Thrust, then click Shield - Shield (70) interrupts Thrust
                (35)
              </li>
              <li>
                Play a low priority sound (e.g., Bunker Soft), then a high
                priority sound (e.g., Ship Explosion) - the high priority should
                interrupt
              </li>
              <li>
                Try to play a low priority sound while a high priority is
                playing - it should be blocked
              </li>
              <li>
                Test that sounds do NOT resume after being interrupted (matches
                original game)
              </li>
              <li>Use Stop Sound button to clear any playing sound</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  section: {
    marginBottom: '30px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  controls: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    marginBottom: '15px'
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  volumeControl: {
    marginTop: '10px'
  },
  slider: {
    width: '200px',
    marginLeft: '10px'
  },
  soundGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px'
  },
  soundButton: {
    padding: '15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  stopButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#f44336',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  instructions: {
    lineHeight: '1.8',
    paddingLeft: '20px'
  },
  priorityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
    marginBottom: '10px'
  },
  priorityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '3px',
    fontSize: '14px'
  },
  priorityName: {
    fontWeight: 'normal'
  },
  priorityValue: {
    fontWeight: 'bold',
    color: '#2196F3'
  },
  priorityNote: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: '#666',
    marginTop: '10px'
  }
}
