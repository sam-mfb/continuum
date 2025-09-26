import React from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { toggleAlignmentMode } from '../appSlice'
import VolumeControls from './VolumeControls'

const ControlsPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const alignmentMode = useAppSelector(state => state.app.alignmentMode)
  const bindings = useAppSelector(state => state.controls.bindings)

  const handleAlignmentToggle = (): void => {
    dispatch(toggleAlignmentMode())
  }

  // Format key code for display
  const formatKey = (keyCode: string): string => {
    // Remove 'Key' prefix and make uppercase
    if (keyCode.startsWith('Key')) {
      return keyCode.slice(3)
    }
    // Special keys
    switch (keyCode) {
      case 'Space':
        return 'SPACE'
      case 'Escape':
        return 'ESC'
      case 'Period':
        return '.'
      case 'Slash':
        return '/'
      default:
        return keyCode.toUpperCase()
    }
  }

  const panelStyle: React.CSSProperties = {
    width: '1028px', // Match GameRenderer width (512 * 2) + borders (2px each side)
    background: '#000',
    border: '2px solid #666',
    borderTop: 'none',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '10px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }

  const sectionStyle: React.CSSProperties = {
    border: '1px solid #666',
    padding: '8px',
    background: '#000'
  }

  const controlGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '5px',
    fontSize: '11px'
  }

  const controlItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: '5px',
    padding: '2px 0'
  }

  const labelStyle: React.CSSProperties = {
    color: '#aaa'
  }

  const keyStyle: React.CSSProperties = {
    color: '#fff',
    fontWeight: 'bold'
  }

  const toggleButtonStyle: React.CSSProperties = {
    background: '#000',
    color: '#fff',
    border: '1px solid #fff',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
    textTransform: 'uppercase'
  }

  return (
    <div style={panelStyle}>
      {/* Alignment Mode Section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>ALIGNMENT MODE:</span>
          <button
            onClick={handleAlignmentToggle}
            style={toggleButtonStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#333'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#000'
            }}
          >
            {alignmentMode === 'world-fixed' ? 'WORLD-FIXED' : 'SCREEN-FIXED'}
          </button>
          <span style={{ color: '#666', fontSize: '10px', marginLeft: '10px' }}>
            (
            {alignmentMode === 'world-fixed'
              ? 'Original mode - background moves with camera'
              : 'Modern mode - background fixed against camera'}
            )
          </span>
        </div>
      </div>

      {/* Volume Controls Section */}
      <VolumeControls />

      {/* Controls Reference Section */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>CONTROLS</div>
        <div style={controlGridStyle}>
          {/* Movement Controls */}
          <div>
            <div
              style={{
                ...controlItemStyle,
                fontWeight: 'bold',
                borderBottom: '1px solid #333',
                marginBottom: '3px'
              }}
            >
              MOVEMENT
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Thrust:</span>
              <span style={keyStyle}>{formatKey(bindings.thrust)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Left:</span>
              <span style={keyStyle}>{formatKey(bindings.left)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Right:</span>
              <span style={keyStyle}>{formatKey(bindings.right)}</span>
            </div>
          </div>

          {/* Action Controls */}
          <div>
            <div
              style={{
                ...controlItemStyle,
                fontWeight: 'bold',
                borderBottom: '1px solid #333',
                marginBottom: '3px'
              }}
            >
              ACTIONS
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Fire:</span>
              <span style={keyStyle}>{formatKey(bindings.fire)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Shield:</span>
              <span style={keyStyle}>{formatKey(bindings.shield)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Self Destruct:</span>
              <span style={keyStyle}>{formatKey(bindings.selfDestruct)}</span>
            </div>
          </div>

          {/* Game Controls */}
          <div>
            <div
              style={{
                ...controlItemStyle,
                fontWeight: 'bold',
                borderBottom: '1px solid #333',
                marginBottom: '3px'
              }}
            >
              GAME
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Pause:</span>
              <span style={keyStyle}>{formatKey(bindings.pause)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Map:</span>
              <span style={keyStyle}>{formatKey(bindings.map)}</span>
            </div>
            <div style={controlItemStyle}>
              <span style={labelStyle}>Quit:</span>
              <span style={keyStyle}>{formatKey(bindings.quit)}</span>
            </div>
            <div
              style={{
                marginTop: '5px',
                paddingTop: '5px',
                borderTop: '1px solid #333'
              }}
            >
              <div
                style={{ fontSize: '9px', color: '#888', marginBottom: '3px' }}
              >
                CHEATS (disable high scores):
              </div>
              <div style={controlItemStyle}>
                <span style={{ ...labelStyle, color: '#888' }}>
                  Next Level:
                </span>
                <span style={{ ...keyStyle, color: '#888' }}>
                  {formatKey(bindings.nextLevel)}
                </span>
              </div>
              <div style={controlItemStyle}>
                <span style={{ ...labelStyle, color: '#888' }}>
                  Extra Life:
                </span>
                <span style={{ ...keyStyle, color: '#888' }}>
                  {formatKey(bindings.extraLife)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlsPanel
