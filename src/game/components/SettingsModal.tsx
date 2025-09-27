import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { toggleAlignmentMode, closeSettings } from '../appSlice'
import { resetHighScores } from '@/core/highscore'
import VolumeControls from './VolumeControls'

type Tab = 'options' | 'controls' | 'about'

const SettingsModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const alignmentMode = useAppSelector(state => state.app.alignmentMode)
  const bindings = useAppSelector(state => state.controls.bindings)
  const showSettings = useAppSelector(state => state.app.showSettings)
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('options')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && showSettings) {
        dispatch(closeSettings())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, showSettings])

  if (!showSettings) return null as React.ReactElement | null

  const formatKey = (keyCode: string): string => {
    if (keyCode.startsWith('Key')) {
      return keyCode.slice(3)
    }
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

  const handleAlignmentToggle = (): void => {
    dispatch(toggleAlignmentMode())
  }

  const handleResetScores = (): void => {
    if (showConfirm) {
      dispatch(resetHighScores())
      setShowConfirm(false)
    } else {
      setShowConfirm(true)
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#000',
    border: '2px solid #666',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '20px',
    maxWidth: '800px',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative'
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #666',
    paddingBottom: '10px'
  }

  const closeButtonStyle: React.CSSProperties = {
    background: '#000',
    color: '#fff',
    border: '1px solid #fff',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px'
  }

  const sectionStyle: React.CSSProperties = {
    border: '1px solid #666',
    padding: '8px',
    background: '#000',
    marginBottom: '10px'
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

  const githubSectionStyle: React.CSSProperties = {
    ...sectionStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px'
  }

  const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0',
    marginBottom: '20px',
    borderBottom: '1px solid #666'
  }

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? '#333' : '#000',
    color: isActive ? '#fff' : '#888',
    border: '1px solid #666',
    borderBottom: isActive ? '1px solid #333' : '1px solid #666',
    padding: '8px 20px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
    textTransform: 'uppercase',
    marginBottom: '-1px'
  })

  return (
    <div style={overlayStyle} onClick={() => dispatch(closeSettings())}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>SETTINGS</h2>
          <button
            onClick={() => dispatch(closeSettings())}
            style={closeButtonStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#333'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#000'
            }}
          >
            CLOSE (ESC)
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button
            style={tabButtonStyle(activeTab === 'options')}
            onClick={() => setActiveTab('options')}
            onMouseEnter={e => {
              if (activeTab !== 'options') {
                e.currentTarget.style.background = '#222'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'options') {
                e.currentTarget.style.background = '#000'
              }
            }}
          >
            Options
          </button>
          <button
            style={tabButtonStyle(activeTab === 'controls')}
            onClick={() => setActiveTab('controls')}
            onMouseEnter={e => {
              if (activeTab !== 'controls') {
                e.currentTarget.style.background = '#222'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'controls') {
                e.currentTarget.style.background = '#000'
              }
            }}
          >
            Controls
          </button>
          <button
            style={tabButtonStyle(activeTab === 'about')}
            onClick={() => setActiveTab('about')}
            onMouseEnter={e => {
              if (activeTab !== 'about') {
                e.currentTarget.style.background = '#222'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'about') {
                e.currentTarget.style.background = '#000'
              }
            }}
          >
            About
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'options' && (
          <>
            {/* Alignment Mode Section */}
            <div style={sectionStyle}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
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
                  {alignmentMode === 'world-fixed'
                    ? 'WORLD-FIXED'
                    : 'SCREEN-FIXED'}
                </button>
                <span
                  style={{
                    color: '#666',
                    fontSize: '10px',
                    marginLeft: '10px'
                  }}
                >
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

            {/* High Score Reset Section */}
            <div style={sectionStyle}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span>HIGH SCORES:</span>
                <button
                  onClick={handleResetScores}
                  style={{
                    ...toggleButtonStyle,
                    backgroundColor: showConfirm ? '#660000' : '#000',
                    borderColor: showConfirm ? '#ff3333' : '#fff',
                    color: showConfirm ? '#ff3333' : '#fff'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = showConfirm
                      ? '#990000'
                      : '#333'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = showConfirm
                      ? '#660000'
                      : '#000'
                  }}
                >
                  {showConfirm ? 'CONFIRM RESET' : 'RESET SCORES'}
                </button>
                {showConfirm && (
                  <span style={{ color: '#ff3333', fontSize: '10px' }}>
                    Click again to confirm or wait to cancel
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Controls Tab Content */}
        {activeTab === 'controls' && (
          <div style={sectionStyle}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
              CONTROLS
            </div>
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
                  <span style={keyStyle}>
                    {formatKey(bindings.selfDestruct)}
                  </span>
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
                    style={{
                      fontSize: '9px',
                      color: '#888',
                      marginBottom: '3px'
                    }}
                  >
                    CHEATS (disables high scores):
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
        )}

        {/* About Tab Content */}
        {activeTab === 'about' && (
          <div style={sectionStyle}>
            <div
              style={{
                textAlign: 'center',
                fontSize: '12px',
                lineHeight: '1.8',
                padding: '20px'
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  marginBottom: '20px',
                  letterSpacing: '2px',
                  fontWeight: 'bold'
                }}
              >
                CONTINUUM
              </h2>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ color: '#fff', marginBottom: '5px' }}>
                  Created by Randy and Brian Wilson
                </div>
                <div style={{ color: '#888', fontSize: '11px' }}>
                  © 1987-1992
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ color: '#aaa', marginBottom: '5px', fontSize: '11px' }}>
                  Originally released under the "Beerware" system
                </div>
                <div style={{ color: '#aaa', marginBottom: '5px' }}>
                  Released into the Public Domain 2015
                </div>
                <a
                  href="https://www.ski-epic.com/continuum_downloads/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#66aaff',
                    fontSize: '10px',
                    wordBreak: 'break-all'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#99ccff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#66aaff'
                  }}
                >
                  https://www.ski-epic.com/continuum_downloads/
                </a>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#fff', marginBottom: '5px' }}>
                  JavaScript Port by Sam Davidoff
                </div>
                <div style={{ color: '#888', fontSize: '11px' }}>
                  © 2025
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #666',
                  paddingTop: '20px',
                  marginTop: '20px'
                }}
              >
                <a
                  href="https://github.com/sam-mfb/continuum"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    border: '1px solid #666',
                    borderRadius: '0'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#333'
                    e.currentTarget.style.borderColor = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = '#666'
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: '16px', height: '16px', fill: 'currentColor' }}
                  >
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  View Source on GitHub
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsModal
