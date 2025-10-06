import React from 'react'
import type { ControlMatrix } from '@core/controls'

type TouchButtonsProps = {
  onControlsChange: (controls: Partial<ControlMatrix>) => void
  scale: number
}

/**
 * Touch buttons for Fire and Shield actions
 * Positioned in bottom-right corner for right thumb access
 */
export const TouchButtons: React.FC<TouchButtonsProps> = ({
  onControlsChange,
  scale
}) => {
  const [firePressed, setFirePressed] = React.useState(false)
  const [shieldPressed, setShieldPressed] = React.useState(false)

  const handleFireStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setFirePressed(true)
    onControlsChange({ fire: true, shield: shieldPressed })
  }

  const handleFireEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setFirePressed(false)
    onControlsChange({ fire: false, shield: shieldPressed })
  }

  const handleShieldStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setShieldPressed(true)
    onControlsChange({ fire: firePressed, shield: true })
  }

  const handleShieldEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setShieldPressed(false)
    onControlsChange({ fire: firePressed, shield: false })
  }

  const buttonSize = 60 * scale
  const buttonSpacing = 10 * scale

  const buttonStyle = (pressed: boolean): React.CSSProperties => ({
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    borderRadius: '50%',
    backgroundColor: pressed
      ? 'rgba(255, 255, 255, 0.8)'
      : 'rgba(255, 255, 255, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${16 * scale}px`,
    fontWeight: 'bold',
    color: pressed ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'none',
    transform: pressed ? 'scale(0.95)' : 'scale(1)',
    transition: 'all 0.1s ease'
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: `${20 * scale}px`,
        right: `${20 * scale}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: `${buttonSpacing}px`,
        touchAction: 'none'
      }}
    >
      {/* Shield button (top) */}
      <button
        onTouchStart={handleShieldStart}
        onTouchEnd={handleShieldEnd}
        onMouseDown={handleShieldStart}
        onMouseUp={handleShieldEnd}
        onMouseLeave={handleShieldEnd}
        style={buttonStyle(shieldPressed)}
        aria-label="Shield"
      >
        🛡
      </button>

      {/* Fire button (bottom) */}
      <button
        onTouchStart={handleFireStart}
        onTouchEnd={handleFireEnd}
        onMouseDown={handleFireStart}
        onMouseUp={handleFireEnd}
        onMouseLeave={handleFireEnd}
        style={buttonStyle(firePressed)}
        aria-label="Fire"
      >
        🔥
      </button>
    </div>
  )
}
