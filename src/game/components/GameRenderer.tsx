import React, { useEffect, useRef } from 'react'
import type { FrameInfo, KeyInfo, MonochromeBitmap } from '@lib/bitmap'
import { useAppDispatch, useAppSelector } from '../store'
import { togglePause, showMap, hideMap, pause, unpause } from '../gameSlice'
import { getControls, type ControlMatrix } from '@core/controls'
import { Map } from './Map'

type GameRendererProps = {
  renderer: (frame: FrameInfo, controls: ControlMatrix) => MonochromeBitmap
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

  const paused = useAppSelector(state => state.game.paused)
  const showMapState = useAppSelector(state => state.game.showMap)
  const bindings = useAppSelector(state => state.controls.bindings)
  const pauseKey = useAppSelector(state => state.controls.bindings.pause)
  const mapKey = useAppSelector(state => state.controls.bindings.map)
  const dispatch = useAppDispatch()

  // Separate effect for pause key handling
  useEffect(() => {
    const handlePauseKey = (e: KeyboardEvent): void => {
      // Don't allow pause toggle when map is showing
      if (e.code === pauseKey && !showMapState) {
        dispatch(togglePause())
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handlePauseKey)
    return (): void => window.removeEventListener('keydown', handlePauseKey)
  }, [pauseKey, showMapState, dispatch])

  // Separate effect for map key handling
  useEffect(() => {
    const handleMapKeyDown = (e: KeyboardEvent): void => {
      if (e.code === mapKey) {
        if (showMapState) {
          dispatch(hideMap())
          dispatch(unpause())
        } else {
          dispatch(showMap())
          dispatch(pause())
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleMapKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleMapKeyDown)
    }
  }, [mapKey, showMapState, dispatch])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up pixel-perfect rendering
    ctx.imageSmoothingEnabled = false

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent): void => {
      keysDownRef.current.add(e.code)
      // Prevent default browser behavior for game control keys
      if (Object.values(bindings).includes(e.code)) {
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
        // Prepare frame and key info
        const frameInfo: FrameInfo = {
          frameCount: frameCountRef.current,
          deltaTime: deltaTime,
          totalTime: currentTime - startTimeRef.current,
          targetDelta: frameIntervalMs
        }
        const keyInfo: KeyInfo = {
          keysDown: keysDownRef.current,
          keysPressed: new Set(),
          keysReleased: new Set()
        }
        // Skip rendering when paused but keep the loop running
        if (!paused) {
          // If map is showing, use blank controls (all false) to prevent game input
          const controls = showMapState
            ? {
                thrust: false,
                left: false,
                right: false,
                fire: false,
                shield: false,
                selfDestruct: false,
                pause: false,
                quit: false,
                nextLevel: false,
                extraLife: false,
                map: false
              }
            : getControls(keyInfo, bindings)
          // Render game and get the resulting bitmap
          const renderedBitmap = renderer(frameInfo, controls)

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
  }, [
    renderer,
    width,
    height,
    scale,
    fps,
    frameIntervalMs,
    bindings,
    paused,
    showMapState
  ])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
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
      {showMapState && <Map scale={scale} />}
    </div>
  )
}

export default GameRenderer
