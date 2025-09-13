/**
 * Sound Test Panel Component
 *
 * Provides UI for testing the sound system with game sounds
 */

import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@dev/store'
import { setVolume, toggleSound } from '@core/sound/soundSlice'
import { initializeSoundService } from '@core/sound/service'
import type { SoundService } from '@core/sound/service'

export const SoundTestPanel: React.FC = () => {
  const dispatch = useDispatch()
  const { volume: masterVolume, enabled } = useSelector(
    (state: RootState) => state.sound
  )
  const [soundService, setSoundService] = useState<SoundService | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [useHighPriority, setUseHighPriority] = useState(false)
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

  // Helper to play a discrete sound and clear continuous states
  const playDiscreteSound = (playFunc: () => void): void => {
    playFunc()
    setIsThrustActive(false)
    setIsShieldActive(false)
  }

  const handleThrustToggle = (): void => {
    if (!soundService) return
    
    if (isThrustActive) {
      // Stop thrust by playing silence
      soundService.playSound('silence')
      setIsThrustActive(false)
    } else {
      soundService.playShipThrust({ highPriority: useHighPriority })
      setIsThrustActive(true)
      setIsShieldActive(false) // Stop shield if active
    }
  }

  const handleShieldToggle = (): void => {
    if (!soundService) return
    
    if (isShieldActive) {
      // Stop shield by playing silence
      soundService.playSound('silence')
      setIsShieldActive(false)
    } else {
      soundService.playShipShield({ highPriority: useHighPriority })
      setIsShieldActive(true)
      setIsThrustActive(false) // Stop thrust if active
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
          <label style={{ ...styles.label, marginLeft: '20px' }}>
            <input
              type="checkbox"
              checked={useHighPriority}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setUseHighPriority(e.target.checked)}
            />
            High Priority Mode
          </label>
          {isHighPriorityActive && (
            <span style={styles.highPriorityIndicator}>
              🔒 HIGH PRIORITY BLOCKING
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

      {/* Ship Sounds */}
      <div style={styles.section}>
        <h3>Ship Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => playDiscreteSound(() => soundService?.playShipFire({ highPriority: useHighPriority }))}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fire
          </button>
          <button
            onClick={handleThrustToggle}
            style={{
              ...styles.soundButton,
              backgroundColor: isThrustActive ? '#ff9800' : '#4CAF50'
            }}
            disabled={!soundService}
          >
            Thrust {isThrustActive ? '(ON)' : ''}
          </button>
          <button
            onClick={handleShieldToggle}
            style={{
              ...styles.soundButton,
              backgroundColor: isShieldActive ? '#2196F3' : '#4CAF50'
            }}
            disabled={!soundService}
          >
            Shield {isShieldActive ? '(ON)' : ''}
          </button>
          <button
            onClick={() => {
              soundService?.playShipExplosion({ highPriority: useHighPriority })
              setIsThrustActive(false)
              setIsShieldActive(false)
            }}
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
            onClick={() => soundService?.playBunkerShoot({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Shoot
          </button>
          <button
            onClick={() => soundService?.playBunkerExplosion({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Explosion
          </button>
          <button
            onClick={() => soundService?.playBunkerSoft({ highPriority: useHighPriority })}
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
            onClick={() => soundService?.playFuelCollect({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fuel Collect
          </button>
          <button
            onClick={() => soundService?.playAlienExplosion({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Alien Explosion
          </button>
          <button
            onClick={() => soundService?.playLevelComplete({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Complete (Crack)
          </button>
          <button
            onClick={() => soundService?.playLevelTransition({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Transition (Fizz)
          </button>
          <button
            onClick={() => soundService?.playEcho({ highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Echo
          </button>
        </div>
      </div>

      {/* Direct Engine Access */}
      <div style={styles.section}>
        <h3>Direct Engine Access</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playSound('fire', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            fire
          </button>
          <button
            onClick={() => soundService?.playSound('thruster', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            thruster
          </button>
          <button
            onClick={() => soundService?.playSound('shield', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            shield
          </button>
          <button
            onClick={() => soundService?.playSound('explosionShip', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            explosionShip
          </button>
          <button
            onClick={() => soundService?.playSound('explosionBunker', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            explosionBunker
          </button>
          <button
            onClick={() => soundService?.playSound('explosionAlien', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            explosionAlien
          </button>
          <button
            onClick={() => soundService?.playSound('bunker', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            bunker
          </button>
          <button
            onClick={() => soundService?.playSound('soft', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            soft
          </button>
          <button
            onClick={() => soundService?.playSound('fuel', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            fuel
          </button>
          <button
            onClick={() => soundService?.playSound('crack', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            crack
          </button>
          <button
            onClick={() => soundService?.playSound('fizz', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            fizz
          </button>
          <button
            onClick={() => soundService?.playSound('echo', { highPriority: useHighPriority })}
            style={styles.soundButton}
            disabled={!soundService}
          >
            echo
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.section}>
        <h3>Usage Instructions</h3>
        <ul style={styles.instructions}>
          <li>
            Click any button to play the corresponding game sound
          </li>
          <li>Use the volume slider to adjust the master volume</li>
          <li>Check the mute checkbox to disable all sounds</li>
          <li>
            <strong>High Priority Mode:</strong> When enabled, sounds will be marked as high-priority.
            High-priority sounds block other sounds until they complete.
          </li>
          <li>
            <strong>Blocking Indicator:</strong> When a high-priority sound is playing,
            the 🔒 indicator shows that other sounds are being blocked.
          </li>
          <li>
            <strong>Testing High-Priority:</strong> Enable high-priority mode, play a long sound
            (like an explosion), then try playing other sounds while it's active.
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