import React, { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { BitmapRenderer } from '@lib/bitmap'
import { createMonochromeBitmap, clearBitmap } from '@lib/bitmap'
import { toggleAlignmentMode } from './gameSlice'
import type { RootState } from './store'

type GameCanvasProps = {
  renderer: BitmapRenderer
  width?: number
  height?: number
  scale?: number
  fps?: number
  totalLevels?: number
  onLevelSelect?: (level: number) => void
}

/**
 * Simple game canvas component without any UI controls
 * Perfect for the production game
 */
const GameCanvas: React.FC<GameCanvasProps> = ({
  renderer,
  width = 512,
  height = 342,
  scale = 2,
  fps = 20,
  totalLevels = 30,
  onLevelSelect
}) => {
  const dispatch = useDispatch()
  const alignmentMode = useSelector((state: RootState) => state.game.alignmentMode)
  const [selectedLevel, setSelectedLevel] = useState<string>('1')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const frameIntervalMs = 1000 / fps
  const keysDownRef = useRef<Set<string>>(new Set())
  const frameCountRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up pixel-perfect rendering
    ctx.imageSmoothingEnabled = false

    // Create bitmap
    const bitmap = createMonochromeBitmap(width, height)

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent): void => {
      keysDownRef.current.add(e.code)
      // Prevent default browser behavior for game control keys
      if (
        e.code === 'Space' || // Shield
        e.code === 'KeyZ' || // Left
        e.code === 'KeyX' || // Right
        e.code === 'Period' || // Thrust
        e.code === 'Slash'
      ) {
        // Fire
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      keysDownRef.current.delete(e.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Game loop
    const gameLoop = (currentTime: number): void => {
      const deltaTime = currentTime - lastFrameTimeRef.current

      if (deltaTime >= frameIntervalMs) {
        // Clear bitmap
        clearBitmap(bitmap)

        // Render game
        renderer(
          bitmap,
          {
            keysDown: keysDownRef.current,
            keysPressed: new Set(),
            keysReleased: new Set(),
            frameCount: frameCountRef.current,
            deltaTime: deltaTime,
            totalTime: currentTime,
            targetDelta: frameIntervalMs
          },
          {
            width,
            height,
            fps
          }
        )

        // Create offscreen canvas at native resolution
        const offscreen = document.createElement('canvas')
        offscreen.width = bitmap.width
        offscreen.height = bitmap.height
        const offCtx = offscreen.getContext('2d')!

        // Convert bitmap to ImageData
        const imageData = new ImageData(bitmap.width, bitmap.height)
        const pixels = imageData.data

        // Convert monochrome bitmap to RGBA
        for (let y = 0; y < bitmap.height; y++) {
          for (let x = 0; x < bitmap.width; x++) {
            const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
            const bitMask = 0x80 >> x % 8
            const isSet = (bitmap.data[byteIndex]! & bitMask) !== 0

            const pixelIndex = (y * bitmap.width + x) * 4
            const value = isSet ? 0 : 255 // Black on white

            pixels[pixelIndex] = value // R
            pixels[pixelIndex + 1] = value // G
            pixels[pixelIndex + 2] = value // B
            pixels[pixelIndex + 3] = 255 // A
          }
        }

        // Draw to offscreen canvas
        offCtx.putImageData(imageData, 0, 0)

        // Draw scaled to main canvas
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          offscreen,
          0,
          0,
          bitmap.width * scale,
          bitmap.height * scale
        )

        lastFrameTimeRef.current = currentTime
        frameCountRef.current++
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    // Cleanup
    return (): void => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [renderer, width, height, scale, fps, frameIntervalMs])

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const level = e.target.value
    setSelectedLevel(level)
    if (onLevelSelect) {
      onLevelSelect(parseInt(level, 10))
    }
  }

  const handleAlignmentToggle = (): void => {
    dispatch(toggleAlignmentMode())
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center'
      }}
    >
      {onLevelSelect && (
        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: '#222',
            borderRadius: '5px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ color: 'white', fontFamily: 'monospace' }}>
              Jump to Level:
            </label>
            <select
              value={selectedLevel}
              onChange={handleLevelChange}
              style={{
                padding: '5px',
                fontFamily: 'monospace',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '3px'
              }}
            >
              {Array.from({ length: totalLevels }, (_, i) => i + 1).map(
                level => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                )
              )}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="originalBackground"
              checked={alignmentMode === 'world-fixed'}
              onChange={handleAlignmentToggle}
              style={{
                cursor: 'pointer'
              }}
            />
            <label
              htmlFor="originalBackground"
              style={{
                color: 'white',
                fontFamily: 'monospace',
                cursor: 'pointer'
              }}
            >
              Original Background
            </label>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width * scale}
        height={height * scale}
        style={{
          imageRendering: 'pixelated',
          // @ts-ignore - vendor prefixes
          WebkitImageRendering: 'pixelated',
          MozImageRendering: 'crisp-edges',
          border: '2px solid #666',
          display: 'block'
        }}
      />
    </div>
  )
}

export default GameCanvas
