import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import {
  toggleCollisionMode,
  toggleAlignmentMode,
  toggleInGameControls,
  closeSettings
} from '../appSlice'
import { resetHighScores } from '@/core/highscore'
import { setBinding, resetBindings } from '@/core/controls'
import { ControlAction } from '@/core/controls/types'
import { type SpriteService } from '@/core/sprites'
import { BunkerKind } from '@/core/figs'
import { formatKey } from '../utils/formatKey'
import VolumeControls from './VolumeControls'

type Tab = 'options' | 'controls' | 'tips' | 'scoring' | 'about'

type SettingsModalProps = {
  spriteService: SpriteService
  scale: number
}

// Helper component to render a sprite to a canvas
const SpriteIcon: React.FC<{
  spriteService: SpriteService
  type: 'bunker' | 'fuel'
  bunkerKind?: BunkerKind
  rotation?: number
  width: number
  height: number
}> = ({ spriteService, type, bunkerKind, rotation = 0, width, height }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false

    // Get sprite data
    let spriteData
    let spriteWidth
    let spriteHeight
    let rowBytes

    if (type === 'bunker' && bunkerKind !== undefined) {
      const sprite = spriteService.getBunkerSprite(bunkerKind, rotation, {
        variant: 'def'
      })
      spriteData = sprite.uint8
      spriteWidth = sprite.bitmap.width
      spriteHeight = sprite.bitmap.height
      rowBytes = sprite.bitmap.rowBytes
    } else if (type === 'fuel') {
      const sprite = spriteService.getFuelSprite(0, { variant: 'def' })
      spriteData = sprite.uint8
      spriteWidth = sprite.bitmap.width
      spriteHeight = sprite.bitmap.height
      rowBytes = sprite.bitmap.rowBytes
    } else {
      return
    }

    // Calculate integer scale factor from width
    const scaleFactor = Math.round(width / spriteWidth)

    // Set canvas size to exact integer multiples
    canvas.width = spriteWidth * scaleFactor
    canvas.height = spriteHeight * scaleFactor

    // Clear canvas with white background
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw pixels as scaled rectangles using integer coordinates
    for (let y = 0; y < spriteHeight; y++) {
      for (let x = 0; x < spriteWidth; x++) {
        const byteIdx = y * rowBytes + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        const bit = (spriteData[byteIdx]! >> bitIdx) & 1

        ctx.fillStyle = bit ? '#000' : '#fff'
        ctx.fillRect(x * scaleFactor, y * scaleFactor, scaleFactor, scaleFactor)
      }
    }
  }, [spriteService, type, bunkerKind, rotation, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated'
      }}
    />
  )
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  spriteService,
  scale
}) => {
  const dispatch = useAppDispatch()
  const collisionMode = useAppSelector(state => state.app.collisionMode)
  const alignmentMode = useAppSelector(state => state.app.alignmentMode)
  const showInGameControls = useAppSelector(
    state => state.app.showInGameControls
  )
  const bindings = useAppSelector(state => state.controls.bindings)
  const showSettings = useAppSelector(state => state.app.showSettings)
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('options')
  const [editingControl, setEditingControl] = useState<ControlAction | null>(
    null
  )
  const [conflictError, setConflictError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // If editing a control, capture the key press
      if (editingControl) {
        e.preventDefault()
        e.stopPropagation()

        // Don't allow Escape to be bound (reserved for closing modal)
        if (e.code === 'Escape') {
          setEditingControl(null)
          setConflictError(null)
          return
        }

        // Check if this key is already bound to another control
        const conflictingControl = Object.entries(bindings).find(
          ([action, key]) => key === e.code && action !== editingControl
        )

        if (conflictingControl) {
          setConflictError(
            `${e.code} is already bound to ${conflictingControl[0]}`
          )
          return
        }

        // Valid key - update the binding
        dispatch(setBinding({ action: editingControl, key: e.code }))
        setEditingControl(null)
        setConflictError(null)
        return
      }

      // Normal modal behavior
      if (e.key === 'Escape' && showSettings) {
        dispatch(closeSettings())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, showSettings, editingControl, bindings])

  if (!showSettings) return null as React.ReactElement | null

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
    border: `${1 * scale}px solid #666`,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: `${6.5 * scale}px`,
    padding: `${10 * scale}px`,
    maxWidth: `${400 * scale}px`,
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative'
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: `${10 * scale}px`,
    borderBottom: `${1 * scale}px solid #666`,
    paddingBottom: `${5 * scale}px`
  }

  const closeButtonStyle: React.CSSProperties = {
    background: '#000',
    color: '#fff',
    border: `${1 * scale}px solid #fff`,
    padding: `${2 * scale}px ${4 * scale}px`,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: `${5.5 * scale}px`
  }

  const sectionStyle: React.CSSProperties = {
    border: `${1 * scale}px solid #666`,
    padding: `${4 * scale}px`,
    background: '#000',
    marginBottom: `${5 * scale}px`
  }

  const controlGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: `${2.5 * scale}px`,
    fontSize: `${6 * scale}px`
  }

  const controlItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: `${2.5 * scale}px`,
    padding: `${1 * scale}px 0`
  }

  const labelStyle: React.CSSProperties = {
    color: '#aaa'
  }

  const editableKeyStyle = (isEditing: boolean): React.CSSProperties => ({
    color: isEditing ? '#000' : '#fff',
    fontWeight: 'bold',
    background: isEditing ? '#ffcc00' : '#333',
    border: `${1 * scale}px solid ` + (isEditing ? '#ffcc00' : '#666'),
    padding: `${1 * scale}px ${3 * scale}px`,
    borderRadius: `${1 * scale}px`,
    cursor: 'pointer',
    minWidth: `${30 * scale}px`,
    textAlign: 'center',
    display: 'inline-block',
    transition: 'all 0.15s',
    fontSize: `${5.5 * scale}px`
  })

  const handleControlClick = (action: ControlAction): void => {
    setEditingControl(action)
    setConflictError(null)
  }

  const toggleButtonStyle: React.CSSProperties = {
    background: '#000',
    color: '#fff',
    border: `${1 * scale}px solid #fff`,
    padding: `${2 * scale}px ${4 * scale}px`,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: `${6 * scale}px`,
    textTransform: 'uppercase'
  }

  const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0',
    marginBottom: `${10 * scale}px`,
    borderBottom: `${1 * scale}px solid #666`
  }

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? '#333' : '#000',
    color: isActive ? '#fff' : '#888',
    border: `${1 * scale}px solid #666`,
    borderBottom: isActive
      ? `${1 * scale}px solid #333`
      : `${1 * scale}px solid #666`,
    padding: `${4 * scale}px ${10 * scale}px`,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: `${6 * scale}px`,
    textTransform: 'uppercase',
    marginBottom: `${-1 * scale}px`
  })

  return (
    <div style={overlayStyle} onClick={() => dispatch(closeSettings())}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: `${8 * scale}px` }}>SETTINGS</h2>
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
            style={tabButtonStyle(activeTab === 'tips')}
            onClick={() => setActiveTab('tips')}
            onMouseEnter={e => {
              if (activeTab !== 'tips') {
                e.currentTarget.style.background = '#222'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'tips') {
                e.currentTarget.style.background = '#000'
              }
            }}
          >
            Tips
          </button>
          <button
            style={tabButtonStyle(activeTab === 'scoring')}
            onClick={() => setActiveTab('scoring')}
            onMouseEnter={e => {
              if (activeTab !== 'scoring') {
                e.currentTarget.style.background = '#222'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== 'scoring') {
                e.currentTarget.style.background = '#000'
              }
            }}
          >
            Scoring
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
            {/* Collision Mode Section */}
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${5 * scale}px`
                }}
              >
                <span>COLLISION MODE:</span>
                <button
                  onClick={() => dispatch(toggleCollisionMode())}
                  style={toggleButtonStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#333'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#000'
                  }}
                >
                  {collisionMode === 'modern' ? 'MODERN' : 'ORIGINAL'}
                </button>
                <span
                  style={{
                    color: '#666',
                    fontSize: `${5 * scale}px`,
                    marginLeft: `${5 * scale}px`
                  }}
                >
                  (
                  {collisionMode === 'modern'
                    ? 'Modern collision detection'
                    : 'Original render-time collision detection'}
                  )
                </span>
              </div>
            </div>

            {/* Alignment Mode Section */}
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${5 * scale}px`
                }}
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
                    fontSize: `${5 * scale}px`,
                    marginLeft: `${5 * scale}px`
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

            {/* In-Game Controls Panel Section */}
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${5 * scale}px`
                }}
              >
                <span>SHOW IN-GAME CONTROLS:</span>
                <button
                  onClick={() => dispatch(toggleInGameControls())}
                  style={toggleButtonStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#333'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#000'
                  }}
                >
                  {showInGameControls ? 'VISIBLE' : 'HIDDEN'}
                </button>
                <span
                  style={{
                    color: '#666',
                    fontSize: `${5 * scale}px`,
                    marginLeft: `${5 * scale}px`
                  }}
                >
                  (Show control hints at bottom of screen during gameplay)
                </span>
              </div>
            </div>

            {/* Volume Controls Section */}
            <VolumeControls scale={scale} />

            {/* High Score Reset Section */}
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${5 * scale}px`
                }}
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
                  <span
                    style={{ color: '#ff3333', fontSize: `${5 * scale}px` }}
                  >
                    Click again to confirm or wait to cancel
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Controls Tab Content */}
        {activeTab === 'controls' && (
          <>
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: `${5 * scale}px`
                }}
              >
                <div style={{ fontWeight: 'bold' }}>
                  CONTROLS
                  <span
                    style={{
                      fontSize: `${5 * scale}px`,
                      color: '#888',
                      marginLeft: '10px',
                      fontWeight: 'normal'
                    }}
                  >
                    (Click to edit)
                  </span>
                </div>
                <button
                  onClick={() => dispatch(resetBindings())}
                  style={toggleButtonStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#333'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#000'
                  }}
                >
                  RESET TO DEFAULTS
                </button>
              </div>
              {conflictError && (
                <div
                  style={{
                    color: '#ff3333',
                    fontSize: `${5.5 * scale}px`,
                    marginBottom: `${4 * scale}px`,
                    padding: `${2 * scale}px ${4 * scale}px`,
                    background: 'rgba(255, 51, 51, 0.1)',
                    border: `${1 * scale}px solid #ff3333`
                  }}
                >
                  {conflictError}
                </div>
              )}
              {editingControl && (
                <div
                  style={{
                    color: '#ffcc00',
                    fontSize: `${5.5 * scale}px`,
                    marginBottom: `${4 * scale}px`,
                    padding: `${2 * scale}px ${4 * scale}px`,
                    background: 'rgba(255, 204, 0, 0.1)',
                    border: `${1 * scale}px solid #ffcc00`
                  }}
                >
                  Press a key to bind to this control (ESC to cancel)
                </div>
              )}
              <div style={controlGridStyle}>
                {/* Movement Controls */}
                <div>
                  <div
                    style={{
                      ...controlItemStyle,
                      fontWeight: 'bold',
                      borderBottom: `${1 * scale}px solid #333`,
                      marginBottom: `${1.5 * scale}px`
                    }}
                  >
                    MOVEMENT
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Thrust:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.THRUST
                      )}
                      onClick={() => handleControlClick(ControlAction.THRUST)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.THRUST) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.THRUST) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.THRUST
                        ? '...'
                        : formatKey(bindings.thrust)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Left:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.LEFT
                      )}
                      onClick={() => handleControlClick(ControlAction.LEFT)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.LEFT) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.LEFT) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.LEFT
                        ? '...'
                        : formatKey(bindings.left)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Right:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.RIGHT
                      )}
                      onClick={() => handleControlClick(ControlAction.RIGHT)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.RIGHT) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.RIGHT) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.RIGHT
                        ? '...'
                        : formatKey(bindings.right)}
                    </button>
                  </div>
                </div>

                {/* Action Controls */}
                <div>
                  <div
                    style={{
                      ...controlItemStyle,
                      fontWeight: 'bold',
                      borderBottom: `${1 * scale}px solid #333`,
                      marginBottom: `${1.5 * scale}px`
                    }}
                  >
                    ACTIONS
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Fire:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.FIRE
                      )}
                      onClick={() => handleControlClick(ControlAction.FIRE)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.FIRE) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.FIRE) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.FIRE
                        ? '...'
                        : formatKey(bindings.fire)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Shield:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.SHIELD
                      )}
                      onClick={() => handleControlClick(ControlAction.SHIELD)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.SHIELD) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.SHIELD) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.SHIELD
                        ? '...'
                        : formatKey(bindings.shield)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Self Destruct:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.SELF_DESTRUCT
                      )}
                      onClick={() =>
                        handleControlClick(ControlAction.SELF_DESTRUCT)
                      }
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.SELF_DESTRUCT) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.SELF_DESTRUCT) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.SELF_DESTRUCT
                        ? '...'
                        : formatKey(bindings.selfDestruct)}
                    </button>
                  </div>
                </div>

                {/* Game Controls */}
                <div>
                  <div
                    style={{
                      ...controlItemStyle,
                      fontWeight: 'bold',
                      borderBottom: `${1 * scale}px solid #333`,
                      marginBottom: `${1.5 * scale}px`
                    }}
                  >
                    GAME
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Pause:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.PAUSE
                      )}
                      onClick={() => handleControlClick(ControlAction.PAUSE)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.PAUSE) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.PAUSE) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.PAUSE
                        ? '...'
                        : formatKey(bindings.pause)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Map:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.MAP
                      )}
                      onClick={() => handleControlClick(ControlAction.MAP)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.MAP) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.MAP) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.MAP
                        ? '...'
                        : formatKey(bindings.map)}
                    </button>
                  </div>
                  <div style={controlItemStyle}>
                    <span style={labelStyle}>Quit:</span>
                    <button
                      style={editableKeyStyle(
                        editingControl === ControlAction.QUIT
                      )}
                      onClick={() => handleControlClick(ControlAction.QUIT)}
                      onMouseEnter={e => {
                        if (editingControl !== ControlAction.QUIT) {
                          e.currentTarget.style.background = '#444'
                        }
                      }}
                      onMouseLeave={e => {
                        if (editingControl !== ControlAction.QUIT) {
                          e.currentTarget.style.background = '#333'
                        }
                      }}
                    >
                      {editingControl === ControlAction.QUIT
                        ? '...'
                        : formatKey(bindings.quit)}
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: `${2.5 * scale}px`,
                      paddingTop: `${2.5 * scale}px`,
                      borderTop: `${1 * scale}px solid #333`
                    }}
                  >
                    <div
                      style={{
                        fontSize: `${4.5 * scale}px`,
                        color: '#888',
                        marginBottom: `${1.5 * scale}px`
                      }}
                    >
                      CHEATS (disables high scores):
                    </div>
                    <div style={controlItemStyle}>
                      <span style={{ ...labelStyle, color: '#888' }}>
                        Next Level:
                      </span>
                      <button
                        style={{
                          ...editableKeyStyle(
                            editingControl === ControlAction.NEXT_LEVEL
                          ),
                          opacity: 0.7
                        }}
                        onClick={() =>
                          handleControlClick(ControlAction.NEXT_LEVEL)
                        }
                        onMouseEnter={e => {
                          if (editingControl !== ControlAction.NEXT_LEVEL) {
                            e.currentTarget.style.background = '#444'
                          }
                        }}
                        onMouseLeave={e => {
                          if (editingControl !== ControlAction.NEXT_LEVEL) {
                            e.currentTarget.style.background = '#333'
                          }
                        }}
                      >
                        {editingControl === ControlAction.NEXT_LEVEL
                          ? '...'
                          : formatKey(bindings.nextLevel)}
                      </button>
                    </div>
                    <div style={controlItemStyle}>
                      <span style={{ ...labelStyle, color: '#888' }}>
                        Extra Life:
                      </span>
                      <button
                        style={{
                          ...editableKeyStyle(
                            editingControl === ControlAction.EXTRA_LIFE
                          ),
                          opacity: 0.7
                        }}
                        onClick={() =>
                          handleControlClick(ControlAction.EXTRA_LIFE)
                        }
                        onMouseEnter={e => {
                          if (editingControl !== ControlAction.EXTRA_LIFE) {
                            e.currentTarget.style.background = '#444'
                          }
                        }}
                        onMouseLeave={e => {
                          if (editingControl !== ControlAction.EXTRA_LIFE) {
                            e.currentTarget.style.background = '#333'
                          }
                        }}
                      >
                        {editingControl === ControlAction.EXTRA_LIFE
                          ? '...'
                          : formatKey(bindings.extraLife)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tips Tab Content */}
        {activeTab === 'tips' && (
          <div style={sectionStyle}>
            <div
              style={{
                fontSize: `${6.5 * scale}px`,
                lineHeight: '1.8',
                padding: `${10 * scale}px`
              }}
            >
              <div style={{ marginBottom: `${10 * scale}px` }}>
                <div
                  style={{
                    fontSize: `${7 * scale}px`,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: `${5 * scale}px`,
                    borderBottom: `${1 * scale}px solid #444`,
                    paddingBottom: `${2.5 * scale}px`
                  }}
                >
                  BEGINNER
                </div>
                <div style={{ color: '#ccc', marginBottom: `${3 * scale}px` }}>
                  • Avoid the walls first; kill things second
                </div>
                <div style={{ color: '#ccc' }}>
                  • Never thrust with the wind
                </div>
              </div>

              <div style={{ marginBottom: `${10 * scale}px` }}>
                <div
                  style={{
                    fontSize: `${7 * scale}px`,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: `${5 * scale}px`,
                    borderBottom: `${1 * scale}px solid #444`,
                    paddingBottom: `${2.5 * scale}px`
                  }}
                >
                  INTERMEDIATE
                </div>
                <div style={{ color: '#ccc', marginBottom: `${3 * scale}px` }}>
                  • Take your time
                </div>
                <div style={{ color: '#ccc' }}>• Use your shield often</div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: `${7 * scale}px`,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: `${5 * scale}px`,
                    borderBottom: `${1 * scale}px solid #444`,
                    paddingBottom: `${2.5 * scale}px`
                  }}
                >
                  ADVANCED
                </div>
                <div style={{ color: '#ccc', marginBottom: `${3 * scale}px` }}>
                  • Find and use bases' blind spots
                </div>
                <div style={{ color: '#ccc' }}>
                  • Don't always do things the obvious way
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Tab Content */}
        {activeTab === 'scoring' && (
          <div style={sectionStyle}>
            <div
              style={{
                fontSize: `${6.5 * scale}px`,
                lineHeight: '1.8',
                padding: `${10 * scale}px`,
                background: '#fff',
                color: '#000'
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  marginBottom: `${7.5 * scale}px`,
                  fontSize: `${7 * scale}px`
                }}
              >
                POINT VALUES
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: `${10 * scale}px`,
                  justifyItems: 'center'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.WALL}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>100</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.GROUND}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>100</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.DIFF}
                    rotation={0}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>10</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.DIFF}
                    rotation={1}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>200</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.DIFF}
                    rotation={2}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>300</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.FOLLOW}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>400</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="bunker"
                    bunkerKind={BunkerKind.GENERATOR}
                    width={24 * scale}
                    height={24 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>500</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${4 * scale}px`
                  }}
                >
                  <SpriteIcon
                    spriteService={spriteService}
                    type="fuel"
                    width={16 * scale}
                    height={16 * scale}
                  />
                  <span style={{ color: '#000', fontWeight: 'bold' }}>15</span>
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
                fontSize: `${6 * scale}px`,
                lineHeight: '1.8',
                padding: `${10 * scale}px`
              }}
            >
              <h2
                style={{
                  fontSize: `${9 * scale}px`,
                  marginBottom: `${10 * scale}px`,
                  letterSpacing: '2px',
                  fontWeight: 'bold'
                }}
              >
                CONTINUUM
              </h2>

              <div style={{ marginBottom: `${7.5 * scale}px` }}>
                <div style={{ color: '#fff', marginBottom: '5px' }}>
                  Created by Randy and Brian Wilson
                </div>
                <div style={{ color: '#888', fontSize: `${5.5 * scale}px` }}>
                  © 1987-1992
                </div>
              </div>

              <div style={{ marginBottom: `${7.5 * scale}px` }}>
                <div
                  style={{
                    color: '#aaa',
                    marginBottom: '5px',
                    fontSize: `${5.5 * scale}px`
                  }}
                >
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
                    fontSize: `${5 * scale}px`,
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

              <div style={{ marginBottom: `${10 * scale}px` }}>
                <div
                  style={{
                    color: '#fff',
                    marginBottom: `${2.5 * scale}px`
                  }}
                >
                  JavaScript Port by Sam Davidoff
                </div>
                <div style={{ color: '#888', fontSize: `${5.5 * scale}px` }}>
                  © 2025
                </div>
              </div>

              <div
                style={{
                  borderTop: `${1 * scale}px solid #666`,
                  paddingTop: `${10 * scale}px`,
                  marginTop: `${10 * scale}px`
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
                    gap: `${4 * scale}px`,
                    padding: `${4 * scale}px ${8 * scale}px`,
                    border: `${1 * scale}px solid #666`,
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
                    style={{
                      width: `${8 * scale}px`,
                      height: `${8 * scale}px`,
                      fill: 'currentColor'
                    }}
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
