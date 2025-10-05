import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setVolume, enableSound, disableSound } from '../appSlice'
import styles from './VolumeButton.module.css'

type VolumeButtonProps = {
  scale: number
}

const VolumeButton: React.FC<VolumeButtonProps> = ({ scale }) => {
  const dispatch = useAppDispatch()
  const volume = useAppSelector(state => state.app.volume)
  const soundOn = useAppSelector(state => state.app.soundOn)
  const [isHovered, setIsHovered] = useState(false)
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(0.5)

  const handleVolumeChange = (newVolume: number): void => {
    dispatch(setVolume(newVolume))
    // Auto-enable sound when adjusting volume
    if (!soundOn && newVolume > 0) {
      dispatch(enableSound())
    }
    // Update the volume before mute when adjusting
    if (newVolume > 0) {
      setVolumeBeforeMute(newVolume)
    }
  }

  const handleIconClick = (): void => {
    // Toggle mute/unmute when clicking the icon
    if (soundOn) {
      // Muting: save current volume and disable sound
      if (volume > 0) {
        setVolumeBeforeMute(volume)
      }
      dispatch(setVolume(0))
      dispatch(disableSound())
    } else {
      // Unmuting: restore previous volume and enable sound
      dispatch(setVolume(volumeBeforeMute))
      dispatch(enableSound())
    }
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${20 * scale}px`,
    right: `${20 * scale}px`,
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${4 * scale}px`
  }

  const buttonStyle: React.CSSProperties = {
    width: `${44 * scale}px`,
    height: `${44 * scale}px`,
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    padding: '0',
    boxShadow: 'none'
  }

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: `${6 * scale}px`,
    padding: `${14 * scale}px ${10 * scale}px`,
    gap: `${10 * scale}px`,
    minWidth: `${50 * scale}px`,
    opacity: isHovered ? 1 : 0,
    transform: isHovered
      ? 'translateY(0) scale(1)'
      : `translateY(${10 * scale}px) scale(0.9)`,
    transition: 'all 0.25s ease',
    pointerEvents: isHovered ? 'auto' : 'none',
    boxShadow: 'none'
  }

  const sliderWrapperStyle: React.CSSProperties = {
    width: `${100 * scale}px`,
    height: `${100 * scale}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-90deg)'
  }

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'slider-horizontal',
    appearance: 'none',
    width: `${100 * scale}px`,
    height: `${6 * scale}px`,
    background: 'rgba(128, 128, 128, 0.5)',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: `${3 * scale}px`,
    border: `${1 * scale}px solid rgba(128, 128, 128, 0.7)`
  }

  const volumeTextStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: `${12 * scale}px`,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: `${0.5 * scale}px`
  }

  // Speaker icon SVG
  const iconSize = 24 * scale
  const getSpeakerIcon = (): React.ReactElement => {
    if (!soundOn || volume === 0) {
      // Muted speaker icon with diagonal line through it
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill="rgba(128, 128, 128, 0.4)"
            stroke="rgba(128, 128, 128, 0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="2"
            y1="2"
            x2="22"
            y2="22"
            stroke="rgba(128, 128, 128, 0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    } else if (volume < 0.33) {
      // Low volume
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.54 8.46a5 5 0 0 1 0 7.07"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    } else if (volume < 0.67) {
      // Medium volume
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.54 8.46a5 5 0 0 1 0 7.07"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.07 5.93a10 10 0 0 1 0 12.14"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    } else {
      // High volume
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.54 8.46a5 5 0 0 1 0 7.07"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.07 5.93a10 10 0 0 1 0 12.14"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.6 3.4a15 15 0 0 1 0 17.2"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  }

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider (appears above button on hover) */}
      <div style={sliderContainerStyle}>
        <span style={volumeTextStyle}>{Math.round(volume * 100)}%</span>
        <div style={sliderWrapperStyle}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            style={sliderStyle}
            className={styles.volumeSlider}
          />
        </div>
      </div>

      {/* Speaker button - click to mute/unmute */}
      <button
        style={buttonStyle}
        onClick={handleIconClick}
        title={soundOn && volume > 0 ? 'Click to mute' : 'Click to unmute'}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${24 * scale}px`,
            height: `${24 * scale}px`
          }}
        >
          {getSpeakerIcon()}
        </div>
      </button>
    </div>
  )
}

export default VolumeButton
