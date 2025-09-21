/**
 * Sound Test Panel Component
 *
 * Provides UI for testing the sound system with game sounds
 */

import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@dev/store'
import { setVolume, toggleSound, initializeSoundService, type SoundService } from '@core/sound'

export const SoundTestPanel: React.FC = () => {
  const dispatch = useDispatch()
  const { volume: masterVolume, enabled } = useSelector(
    (state: RootState) => state.sound
  )
  const [soundService, setSoundService] = useState<SoundService | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHighPriorityActive, setIsHighPriorityActive] = useState(false)
  const [isThrustActive, setIsThrustActive] = useState(false)
  const [isShieldActive, setIsShieldActive] = useState(false)

  useEffect(() => {
    // Initialize sound service on mount
    if (!isInitialized) {
      initializeSoundService()
        .then(service => {
          setSoundService(service)
          // Sync initial state with Redux
          service.setVolume(masterVolume)
          service.setMuted(!enabled) // enabled=true means not muted
          setIsInitialized(true)
        })
        .catch(error => {
          console.error('Failed to initialize sound service:', error)
        })
    }
  }, [isInitialized, masterVolume, enabled])

  // Poll for high-priority state
  useEffect(() => {
    if (!soundService) return

    const interval = setInterval(() => {
      setIsHighPriorityActive(soundService.isHighPriorityPlaying())
    }, 100)

    return (): void => clearInterval(interval)
  }, [soundService])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const volume = parseFloat(e.target.value)
    dispatch(setVolume(volume))
    if (soundService) {
      soundService.setVolume(volume)
    }
  }

  const handleMuteToggle = (): void => {
    const newEnabled = !enabled // Calculate the new state
    dispatch(toggleSound())
    if (soundService) {
      // If sound is enabled (newEnabled = true), then muted = false
      // If sound is disabled (newEnabled = false), then muted = true
      soundService.setMuted(!newEnabled)
    }
  }

  // Helper to play a discrete sound
  const playDiscreteSound = (playFunc: () => void): void => {
    playFunc()
  }

  const handleThrustToggle = (): void => {
    if (!soundService) return

    if (isThrustActive) {
      // Stop thrust using the new stopThrust method
      soundService.stopThrust()
      setIsThrustActive(false)
    } else {
      soundService.playShipThrust()
      setIsThrustActive(true)
      // Shield takes priority, so thrust won't actually play if shield is on
      // but we still set the state to show user intent
      setIsShieldActive(false)
    }
  }

  const handleShieldToggle = (): void => {
    if (!soundService) return

    if (isShieldActive) {
      // Stop shield using the new stopShield method
      soundService.stopShield()
      setIsShieldActive(false)
    } else {
      soundService.playShipShield()
      setIsShieldActive(true)
      // Shield takes priority over thrust
      setIsThrustActive(false)
    }
  }

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
          {isHighPriorityActive && (
            <span style={styles.highPriorityIndicator}>
              🔒 HIGH PRIORITY ACTIVE
            </span>
          )}
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

      {/* Continuous Sounds */}
      <div style={styles.section}>
        <h3>Continuous Sounds (Independent Toggles)</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={handleThrustToggle}
            style={{
              ...styles.soundButton,
              backgroundColor: isThrustActive ? '#ff9800' : '#4CAF50'
            }}
            disabled={!soundService}
          >
            Thrust {isThrustActive ? '(ON)' : '(OFF)'}
          </button>
          <button
            onClick={handleShieldToggle}
            style={{
              ...styles.soundButton,
              backgroundColor: isShieldActive ? '#2196F3' : '#4CAF50'
            }}
            disabled={!soundService}
          >
            Shield {isShieldActive ? '(ON)' : '(OFF)'}
          </button>
        </div>
      </div>

      {/* Ship Sounds */}
      <div style={styles.section}>
        <h3>Ship Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playShipFire())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fire
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playShipFire({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Fire (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playShipShieldDiscrete())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Shield (Discrete)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playShipShieldDiscrete({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Shield Discrete (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playShipExplosion())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Explosion
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playShipExplosion({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Ship Explosion (HP)
          </button>
        </div>
      </div>

      {/* Bunker Sounds */}
      <div style={styles.section}>
        <h3>Bunker Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playBunkerShoot())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Shoot
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playBunkerShoot({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Bunker Shoot (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playBunkerExplosion())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Explosion
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playBunkerExplosion({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Bunker Explosion (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playBunkerSoft())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Soft
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playBunkerSoft({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Bunker Soft (HP)
          </button>
        </div>
      </div>

      {/* Other Game Sounds */}
      <div style={styles.section}>
        <h3>Other Game Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playFuelCollect())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fuel Collect
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playFuelCollect({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Fuel Collect (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playAlienExplosion())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Alien Explosion
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playAlienExplosion({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Alien Explosion (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playLevelComplete())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Complete
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playLevelComplete({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Level Complete (HP)
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() => soundService?.playLevelTransition())
            }
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Transition
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playLevelTransition({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Level Transition (HP)
          </button>
          <button
            onClick={() => playDiscreteSound(() => soundService?.playEcho())}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Echo
          </button>
          <button
            onClick={() =>
              playDiscreteSound(() =>
                soundService?.playEcho({ highPriority: true })
              )
            }
            style={styles.highPriorityButton}
            disabled={!soundService}
          >
            Echo (HP)
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
            <strong>Continuous Sounds:</strong> Thrust and Shield can be toggled
            independently. They maintain their state through interruptions.
          </li>
          <li>
            <strong>High Priority (HP) Sounds:</strong> Orange buttons play
            high-priority versions. These block normal sounds but can interrupt
            each other.
          </li>
          <li>
            <strong>Priority Indicator:</strong> When a high-priority sound is
            playing, the 🔒 indicator shows that normal sounds are blocked.
          </li>
          <li>
            <strong>Testing Scenarios:</strong>
            <ul>
              <li>Start thrust, then shield - observe switching behavior</li>
              <li>
                Play a normal sound while thrust is on - thrust should resume
                after
              </li>
              <li>
                Play an HP sound - it blocks normal sounds but not other HP
                sounds
              </li>
              <li>Test fuel collection (HP) while shield is active</li>
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
  highPriorityButton: {
    padding: '15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#ff6b6b',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  instructions: {
    lineHeight: '1.8',
    paddingLeft: '20px'
  },
  highPriorityIndicator: {
    marginLeft: '20px',
    padding: '5px 10px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '12px',
    animation: 'pulse 1s infinite'
  }
}
