import React from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { toggleInGameControls } from '../appSlice'
import { formatKey } from '../utils/formatKey'

const InGameControlsPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const bindings = useAppSelector(state => state.controls.bindings)

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(4px)',
    zIndex: 100
  }

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    width: '20px',
    height: '20px',
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  }

  const secondaryRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px'
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

  const secondaryLabelStyle: React.CSSProperties = {
    color: 'rgba(180, 180, 180, 0.7)',
    fontSize: '8px'
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

  const secondaryKeyStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '1px 4px',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    minWidth: '16px',
    textAlign: 'center',
    fontSize: '8px'
  }

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: 'rgba(255, 255, 255, 0.2)'
  }

  return (
    <div style={panelStyle}>
      {/* Close button */}
      <button
        style={closeButtonStyle}
        onClick={() => dispatch(toggleInGameControls())}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.95)'
          e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.7)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
        }}
        title="Hide controls (re-enable in Settings)"
      >
        ×
      </button>

      {/* Primary controls row - frequently used */}
      <div style={rowStyle}>
        <div style={controlItemStyle}>
          <span style={labelStyle}>Left:</span>
          <span style={keyStyle}>{formatKey(bindings.left)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={labelStyle}>Right:</span>
          <span style={keyStyle}>{formatKey(bindings.right)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={labelStyle}>Shield:</span>
          <span style={keyStyle}>{formatKey(bindings.shield)}</span>
        </div>

        <div style={separatorStyle} />

        <div style={controlItemStyle}>
          <span style={labelStyle}>Thrust:</span>
          <span style={keyStyle}>{formatKey(bindings.thrust)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={labelStyle}>Fire:</span>
          <span style={keyStyle}>{formatKey(bindings.fire)}</span>
        </div>
      </div>

      {/* Secondary controls row - less frequently used */}
      <div style={secondaryRowStyle}>
        <div style={controlItemStyle}>
          <span style={secondaryLabelStyle}>Map:</span>
          <span style={secondaryKeyStyle}>{formatKey(bindings.map)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={secondaryLabelStyle}>Pause:</span>
          <span style={secondaryKeyStyle}>{formatKey(bindings.pause)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={secondaryLabelStyle}>Quit:</span>
          <span style={secondaryKeyStyle}>{formatKey(bindings.quit)}</span>
        </div>

        <div style={controlItemStyle}>
          <span style={secondaryLabelStyle}>Self Destruct:</span>
          <span style={secondaryKeyStyle}>
            {formatKey(bindings.selfDestruct)}
          </span>
        </div>
      </div>

      {/* Tip text */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '9px',
          color: 'rgba(220, 220, 220, 0.85)',
          marginTop: '4px',
          fontStyle: 'italic'
        }}
      >
        Shield to retrieve fuel
      </div>
    </div>
  )
}

export default InGameControlsPanel
