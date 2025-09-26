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

  return (
    <div
      style={{
        marginTop: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #333',
        padding: '15px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '200px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ minWidth: '50px' }}>Sound:</label>
        <button
          onClick={handleSoundToggle}
          style={{
            padding: '5px 10px',
            background: soundOn ? '#4CAF50' : '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            minWidth: '60px'
          }}
        >
          {soundOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ minWidth: '50px' }}>Volume:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
          disabled={!soundOn}
          style={{
            flex: 1,
            cursor: soundOn ? 'pointer' : 'not-allowed',
            opacity: soundOn ? 1 : 0.5
          }}
        />
        <span style={{ minWidth: '40px', textAlign: 'right' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  )
}

export default VolumeControls
