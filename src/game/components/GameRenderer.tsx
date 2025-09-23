import React, { useEffect, useRef } from 'react'
import type { BitmapRenderer } from '@lib/bitmap'
import { createMonochromeBitmap } from '@lib/bitmap'

type GameRendererProps = {
  renderer: BitmapRenderer
  width: number
  height: number
  scale: number
  fps: number
}

/**
 * Game renderer component - handles canvas rendering and game loop
 * Only active when the game is in 'playing' mode
 */
const GameRenderer: React.FC<GameRendererProps> = ({
  renderer,
  width,
  height,
  scale,
  fps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const frameIntervalMs = 1000 / fps
  const keysDownRef = useRef<Set<string>>(new Set())
  const frameCountRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up pixel-perfect rendering
    ctx.imageSmoothingEnabled = false

    // Create initial bitmap
    let bitmap = createMonochromeBitmap(width, height)

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent): void => {
      keysDownRef.current.add(e.code)
      // Prevent default browser behavior for game control keys
      if (
        e.code === 'Space' || // Shield
        e.code === 'KeyZ' || // Left
        e.code === 'KeyX' || // Right
        e.code === 'Period' || // Thrust
        e.code === 'Slash' // Fire
      ) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      keysDownRef.current.delete(e.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Initialize start time
    startTimeRef.current = performance.now()

    // Game loop
    const gameLoop = (currentTime: number): void => {
      const deltaTime = currentTime - lastFrameTimeRef.current

      if (deltaTime >= frameIntervalMs) {
        // Render game and get the resulting bitmap
        const renderedBitmap = renderer(
          bitmap,
          {
            frameCount: frameCountRef.current,
            deltaTime: deltaTime,
            totalTime: currentTime - startTimeRef.current,
            targetDelta: frameIntervalMs,
            keysDown: keysDownRef.current,
            keysPressed: new Set(),
            keysReleased: new Set()
          },
          {
            width: width,
            height: height,
            fps: fps
          }
        )

        // Update the bitmap for next frame
        bitmap = renderedBitmap

        // Create offscreen canvas for pixel-perfect scaling
        const offscreen = document.createElement('canvas')
        offscreen.width = renderedBitmap.width
        offscreen.height = renderedBitmap.height
        const offCtx = offscreen.getContext('2d')!

        // Convert bitmap to ImageData
        const imageData = new ImageData(
          renderedBitmap.width,
          renderedBitmap.height
        )
        const pixels = imageData.data

        // Convert monochrome bitmap to RGBA
        for (let y = 0; y < renderedBitmap.height; y++) {
          for (let x = 0; x < renderedBitmap.width; x++) {
            const byteIndex = y * renderedBitmap.rowBytes + Math.floor(x / 8)
            const bitMask = 0x80 >> x % 8
            const isSet = (renderedBitmap.data[byteIndex]! & bitMask) !== 0

            const pixelIndex = (y * renderedBitmap.width + x) * 4
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
          renderedBitmap.width * scale,
          renderedBitmap.height * scale
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

  return (
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
  )
}

export default GameRenderer
