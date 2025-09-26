import React from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setVolume, enableSound, disableSound } from '../appSlice'

const VolumeControls: React.FC = () => {
  const dispatch = useAppDispatch()
  const volume = useAppSelector(state => state.app.volume)
  const soundOn = useAppSelector(state => state.app.soundOn)

  const handleVolumeChange = (newVolume: number): void => {
    dispatch(setVolume(newVolume))
  }

  const handleSoundToggle = (): void => {
    if (soundOn) {
      dispatch(disableSound())
    } else {
      dispatch(enableSound())
    }
  }

  const sectionStyle: React.CSSProperties = {
    border: '1px solid #666',
    padding: '8px',
    background: '#000',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '11px'
  }

  const toggleButtonStyle: React.CSSProperties = {
    background: soundOn ? '#000' : '#000',
    color: soundOn ? '#fff' : '#666',
    border: soundOn ? '1px solid #fff' : '1px solid #666',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
    minWidth: '50px'
  }

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '5px'
  }

  const sliderStyle: React.CSSProperties = {
    width: '150px',
    cursor: soundOn ? 'pointer' : 'not-allowed',
    opacity: soundOn ? 1 : 0.3,
    background: '#000',
    height: '4px',
    outline: 'none'
  }

  return (
    <div style={sectionStyle}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>AUDIO</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ minWidth: '50px' }}>SOUND:</span>
        <button
          onClick={handleSoundToggle}
          style={toggleButtonStyle}
          onMouseEnter={e => {
            if (soundOn) {
              e.currentTarget.style.background = '#333'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#000'
          }}
        >
          {soundOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={sliderContainerStyle}>
        <span style={{ minWidth: '50px' }}>VOLUME:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
          disabled={!soundOn}
          style={sliderStyle}
        />
        <span
          style={{
            minWidth: '40px',
            textAlign: 'right',
            color: soundOn ? '#fff' : '#666'
          }}
        >
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  )
}

export default VolumeControls
