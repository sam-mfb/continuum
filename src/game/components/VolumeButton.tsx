import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setVolume, enableSound, disableSound } from '../appSlice'

const VolumeButton: React.FC = () => {
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
    bottom: '20px',
    right: '20px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  }

  const buttonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: isHovered ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.75)',
    border: `2px solid ${isHovered ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    padding: '0',
    boxShadow: isHovered
      ? '0 4px 12px rgba(0, 0, 0, 0.5)'
      : '0 2px 6px rgba(0, 0, 0, 0.3)'
  }

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.95)',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '6px',
    padding: '14px 10px',
    gap: '10px',
    minWidth: '50px',
    opacity: isHovered ? 1 : 0,
    transform: isHovered
      ? 'translateY(0) scale(1)'
      : 'translateY(10px) scale(0.9)',
    transition: 'all 0.25s ease',
    pointerEvents: isHovered ? 'auto' : 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)'
  }

  const sliderWrapperStyle: React.CSSProperties = {
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-90deg)'
  }

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'slider-horizontal',
    appearance: 'none',
    width: '100px',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.15)',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '3px',
    border: '1px solid rgba(255, 255, 255, 0.25)'
  }

  const volumeTextStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  }

  // Speaker icon SVG
  const getSpeakerIcon = (): React.ReactElement => {
    if (!soundOn || volume === 0) {
      // Muted speaker icon
      return (
        <svg
          width="24"
          height="24"
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
          <line
            x1="23"
            y1="9"
            x2="17"
            y2="15"
            stroke="rgba(255, 100, 100, 0.9)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="17"
            y1="9"
            x2="23"
            y2="15"
            stroke="rgba(255, 100, 100, 0.9)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    } else if (volume < 0.33) {
      // Low volume
      return (
        <svg
          width="24"
          height="24"
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
          width="24"
          height="24"
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
          width="24"
          height="24"
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
            width: '24px',
            height: '24px'
          }}
        >
          {getSpeakerIcon()}
        </div>
      </button>

      {/* Custom slider styling */}
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(255, 255, 255, 1);
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          input[type="range"]::-webkit-slider-thumb:hover {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }

          input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(255, 255, 255, 1);
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          input[type="range"]::-moz-range-thumb:hover {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
    </div>
  )
}

export default VolumeButton
