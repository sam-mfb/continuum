import React, { useCallback, useRef } from 'react'
import type { ControlMatrix } from '@core/controls'
import { TouchJoystick } from './TouchJoystick'
import { TouchButtons } from './TouchButtons'

type TouchControlsOverlayProps = {
  onControlsChange: (controls: ControlMatrix) => void
  scale: number
}

/**
 * Touch controls overlay combining joystick and buttons
 * Fixed positioning relative to viewport for ergonomic thumb access
 */
export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = ({
  onControlsChange,
  scale
}) => {
  // Track current control state from both components
  const joystickControlsRef = useRef<Partial<ControlMatrix>>({
    left: false,
    right: false,
    thrust: false
  })

  const buttonControlsRef = useRef<Partial<ControlMatrix>>({
    fire: false,
    shield: false
  })

  const mergeAndNotify = useCallback(() => {
    // Merge controls from both sources
    const mergedControls: ControlMatrix = {
      // Movement from joystick
      left: joystickControlsRef.current.left ?? false,
      right: joystickControlsRef.current.right ?? false,
      thrust: joystickControlsRef.current.thrust ?? false,
      // Actions from buttons
      fire: buttonControlsRef.current.fire ?? false,
      shield: buttonControlsRef.current.shield ?? false,
      // Non-touch controls (all false)
      selfDestruct: false,
      pause: false,
      quit: false,
      nextLevel: false,
      extraLife: false,
      map: false
    }

    onControlsChange(mergedControls)
  }, [onControlsChange])

  const handleJoystickChange = useCallback(
    (controls: Partial<ControlMatrix>) => {
      joystickControlsRef.current = {
        left: controls.left ?? false,
        right: controls.right ?? false,
        thrust: controls.thrust ?? false
      }
      mergeAndNotify()
    },
    [mergeAndNotify]
  )

  const handleButtonsChange = useCallback(
    (controls: Partial<ControlMatrix>) => {
      buttonControlsRef.current = {
        fire: controls.fire ?? false,
        shield: controls.shield ?? false
      }
      mergeAndNotify()
    },
    [mergeAndNotify]
  )

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {/* Enable pointer events only on the interactive elements */}
      <div style={{ pointerEvents: 'auto' }}>
        <TouchJoystick onControlsChange={handleJoystickChange} scale={scale} />
        <TouchButtons onControlsChange={handleButtonsChange} scale={scale} />
      </div>
    </div>
  )
}
