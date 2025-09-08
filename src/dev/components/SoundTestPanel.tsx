/**
 * Sound Test Panel Component
 *
 * Provides UI for testing the new sound system with various test sounds
 * Part of Phase 6: Browser Integration & Manual Testing
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

  useEffect(() => {
    // Initialize sound service on mount
    if (!isInitialized) {
      initializeSoundService().then(service => {
        setSoundService(service)
        // Sync initial state with Redux
        service.setVolume(masterVolume)
        service.setMuted(!enabled)  // enabled=true means not muted
        setIsInitialized(true)
      }).catch(error => {
        console.error('Failed to initialize sound service:', error)
      })
    }
  }, [isInitialized, masterVolume, enabled])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const volume = parseFloat(e.target.value)
    dispatch(setVolume(volume))
    if (soundService) {
      soundService.setVolume(volume)
    }
  }

  const handleMuteToggle = (): void => {
    const newEnabled = !enabled  // Calculate the new state
    dispatch(toggleSound())
    if (soundService) {
      // If sound is enabled (newEnabled = true), then muted = false
      // If sound is disabled (newEnabled = false), then muted = true
      soundService.setMuted(!newEnabled)
    }
  }


  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sound System</h2>

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

      {/* Game Sound Service API - Ship */}
      <div style={styles.section}>
        <h3>Service API - Ship Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playShipFire()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Fire
          </button>
          <button
            onClick={() => soundService?.playShipThrust()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Thrust
          </button>
          <button
            onClick={() => soundService?.playShipShield()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Shield
          </button>
          <button
            onClick={() => soundService?.playShipExplosion()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Explode
          </button>
        </div>
      </div>

      {/* Game Sound Service API - Bunkers */}
      <div style={styles.section}>
        <h3>Service API - Bunker Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playBunkerShoot()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Shoot
          </button>
          <button
            onClick={() => soundService?.playBunkerExplosion()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Explode
          </button>
          <button
            onClick={() => soundService?.playBunkerSoft()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Soft
          </button>
        </div>
      </div>

      {/* Game Sound Service API - Other Game Sounds */}
      <div style={styles.section}>
        <h3>Service API - Other Game Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playFuelCollect()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fuel Collect
          </button>
          <button
            onClick={() => soundService?.playAlienExplosion()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Alien Explode
          </button>
          <button
            onClick={() => soundService?.playLevelComplete()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Complete (Crack)
          </button>
          <button
            onClick={() => soundService?.playLevelTransition()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Level Transition (Fizz)
          </button>
          <button
            onClick={() => soundService?.playEcho()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Echo
          </button>
        </div>
      </div>

      {/* Test Sound Service API */}
      <div style={styles.section}>
        <h3>Service API - Test Sounds</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playSilence()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Silence
          </button>
          <button
            onClick={() => soundService?.playSine440()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Sine 440Hz
          </button>
          <button
            onClick={() => soundService?.playSine880()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Sine 880Hz
          </button>
          <button
            onClick={() => soundService?.playSine220()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Sine 220Hz
          </button>
          <button
            onClick={() => soundService?.playWhiteNoise()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            White Noise
          </button>
          <button
            onClick={() => soundService?.playMajorChord()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Major Chord
          </button>
          <button
            onClick={() => soundService?.playOctaves()}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Octaves
          </button>
        </div>
      </div>

      {/* Assembly Implementation Sounds */}
      <div style={styles.section}>
        <h3>Assembly Implementations (More Accurate)</h3>
        <div style={styles.soundGrid}>
          <button
            onClick={() => soundService?.playSound('fireAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fire (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('thrusterAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Thruster (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('shieldAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Shield (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('explosionBunkerAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker Explosion (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('explosionShipAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Ship Explosion (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('explosionAlienAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Alien Explosion (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('bunkerAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Bunker (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('softAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Soft (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('fuelAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fuel (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('crackAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Crack (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('fizzAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Fizz (ASM)
          </button>
          <button
            onClick={() => soundService?.playSound('echoAsm')}
            style={styles.soundButton}
            disabled={!soundService}
          >
            Echo (ASM)
          </button>
        </div>
      </div>



      {/* Instructions */}
      <div style={styles.section}>
        <h3>Sound Service API Test Panel</h3>
        <ul style={styles.instructions}>
          <li>Click any button to play the corresponding sound through the service API</li>
          <li>Use the volume slider to adjust the master volume</li>
          <li>Check the mute checkbox to disable all sounds</li>
          <li>All sounds are triggered through the centralized sound service</li>
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px'
  },
  soundButton: {
    padding: '15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 'bold'
  },
  stats: {
    fontFamily: 'monospace',
    lineHeight: '1.6'
  },
  instructions: {
    lineHeight: '1.8',
    paddingLeft: '20px'
  }
}
