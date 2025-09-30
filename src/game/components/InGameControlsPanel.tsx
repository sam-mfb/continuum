import React from 'react'
import { useAppSelector } from '../store'

const InGameControlsPanel: React.FC = () => {
  const bindings = useAppSelector(state => state.controls.bindings)

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
      case 'ArrowLeft':
        return '←'
      case 'ArrowRight':
        return '→'
      case 'ArrowUp':
        return '↑'
      case 'ArrowDown':
        return '↓'
      default:
        return keyCode.toUpperCase()
    }
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    padding: '8px 16px',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(4px)',
    zIndex: 100
  }

  const controlItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  }

  const labelStyle: React.CSSProperties = {
    color: 'rgba(200, 200, 200, 0.8)',
    fontSize: '10px'
  }

  const keyStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 1)',
    fontWeight: 'bold',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2px 6px',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    minWidth: '20px',
    textAlign: 'center'
  }

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: 'rgba(255, 255, 255, 0.2)'
  }

  return (
    <div style={panelStyle}>
      <div style={controlItemStyle}>
        <span style={labelStyle}>Left:</span>
        <span style={keyStyle}>{formatKey(bindings.left)}</span>
      </div>

      <div style={controlItemStyle}>
        <span style={labelStyle}>Right:</span>
        <span style={keyStyle}>{formatKey(bindings.right)}</span>
      </div>

      <div style={separatorStyle} />

      <div style={controlItemStyle}>
        <span style={labelStyle}>Thrust:</span>
        <span style={keyStyle}>{formatKey(bindings.thrust)}</span>
      </div>

      <div style={separatorStyle} />

      <div style={controlItemStyle}>
        <span style={labelStyle}>Fire:</span>
        <span style={keyStyle}>{formatKey(bindings.fire)}</span>
      </div>

      <div style={controlItemStyle}>
        <span style={labelStyle}>Shield:</span>
        <span style={keyStyle}>{formatKey(bindings.shield)}</span>
      </div>

      <div style={separatorStyle} />

      <div style={controlItemStyle}>
        <span style={labelStyle}>Map:</span>
        <span style={keyStyle}>{formatKey(bindings.map)}</span>
      </div>
    </div>
  )
}

export default InGameControlsPanel
