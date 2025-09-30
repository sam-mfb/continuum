import React, { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setVolume, enableSound, disableSound } from '../appSlice'

const VolumeButton: React.FC = () => {
  const dispatch = useAppDispatch()
  const volume = useAppSelector(state => state.app.volume)
  const soundOn = useAppSelector(state => state.app.soundOn)
  const [showSlider, setShowSlider] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSlider(false)
      }
    }

    if (showSlider) {
      document.addEventListener('mousedown', handleClickOutside)
      return (): void =>
        document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSlider])

  const handleVolumeChange = (newVolume: number): void => {
    dispatch(setVolume(newVolume))
    // Auto-enable sound when adjusting volume
    if (!soundOn && newVolume > 0) {
      dispatch(enableSound())
    }
  }

  const handleIconClick = (): void => {
    // Toggle mute/unmute when clicking the icon
    if (soundOn) {
      dispatch(disableSound())
    } else {
      dispatch(enableSound())
    }
  }

  const handleButtonClick = (): void => {
    // Toggle slider visibility
    setShowSlider(!showSlider)
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  }

  const buttonStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '0'
  }

  const sliderContainerStyle: React.CSSProperties = {
    display: showSlider ? 'flex' : 'none',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    padding: '12px 8px',
    gap: '8px',
    minWidth: '60px'
  }

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'slider-vertical',
    width: '8px',
    height: '120px',
    background: 'rgba(255, 255, 255, 0.2)',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '4px'
  }

  const volumeTextStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 'bold'
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
    <div ref={containerRef} style={containerStyle}>
      {/* Slider (appears above button) */}
      <div style={sliderContainerStyle}>
        <span style={volumeTextStyle}>{Math.round(volume * 100)}%</span>
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

      {/* Speaker button */}
      <button
        style={buttonStyle}
        onClick={handleButtonClick}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
        }}
        title={soundOn ? 'Volume controls' : 'Sound muted'}
      >
        <div
          onClick={e => {
            e.stopPropagation()
            handleIconClick()
          }}
        >
          {getSpeakerIcon()}
        </div>
      </button>
    </div>
  )
}

export default VolumeButton
