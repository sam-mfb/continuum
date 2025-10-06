import React, { useEffect, useRef } from 'react'
import nipplejs from 'nipplejs'
import type { ControlMatrix } from '@core/controls'

type TouchJoystickProps = {
  onControlsChange: (controls: Partial<ControlMatrix>) => void
  scale: number
}

/**
 * Virtual joystick for touch controls
 * Maps joystick vector to ship movement controls (left/right/thrust)
 */
export const TouchJoystick: React.FC<TouchJoystickProps> = ({
  onControlsChange,
  scale
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<ReturnType<typeof nipplejs.create> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create joystick instance
    const manager = nipplejs.create({
      zone: containerRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'rgba(255, 255, 255, 0.5)',
      size: 120 * scale
    })

    managerRef.current = manager

    // Handle joystick movement
    manager.on('move', (_evt, data) => {
      const angle = data.angle.radian
      const force = Math.min(data.force, 2) / 2 // Normalize to 0-1

      // Calculate control states based on angle and force
      // Threshold for activating controls
      const threshold = 0.3

      const controls: Partial<ControlMatrix> = {
        left: false,
        right: false,
        thrust: false
      }

      if (force > threshold) {
        // Calculate horizontal and vertical components
        const horizontal = Math.cos(angle)
        const vertical = Math.sin(angle)

        // Left/Right: Use horizontal component
        // Joystick uses mathematical angle (0 = right, π/2 = up)
        if (horizontal < -0.5) {
          controls.left = true
        } else if (horizontal > 0.5) {
          controls.right = true
        }

        // Thrust: Activate when joystick points upward
        // In nipplejs, angle 0 is right, π/2 is up, π is left, 3π/2 is down
        if (vertical > 0.5) {
          controls.thrust = true
        }
      }

      onControlsChange(controls)
    })

    // Handle joystick release
    manager.on('end', () => {
      onControlsChange({
        left: false,
        right: false,
        thrust: false
      })
    })

    // Cleanup
    return () => {
      manager.destroy()
      managerRef.current = null
    }
  }, [onControlsChange, scale])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: `${20 * scale}px`,
        left: `${20 * scale}px`,
        width: `${140 * scale}px`,
        height: `${140 * scale}px`,
        touchAction: 'none'
      }}
    />
  )
}
