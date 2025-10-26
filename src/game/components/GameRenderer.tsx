import React, { useEffect, useRef, useState } from 'react'
import type { FrameInfo, KeyInfo, MonochromeBitmap } from '@lib/bitmap'
import {
  useAppDispatch,
  useAppSelector,
  getStoreServices,
  type RootState
} from '../store'
import { togglePause, showMap, hideMap, pause, unpause } from '../gameSlice'
import {
  getControls,
  mergeControls,
  blankControls,
  type ControlMatrix
} from '@core/controls'
import { Map } from './Map'
import { type CollisionService } from '@/core/collision'
import { getDebug } from '../debug'
import type { SpriteService } from '@/core/sprites'
import { useStore } from 'react-redux'
import { TouchControlsOverlay } from '../mobile/TouchControlsOverlay'
import type { Frame, SpriteRegistry } from '@/lib/frame/types'
import { drawFrameToCanvas } from '@/lib/frame/drawFrameToCanvas'
import { applyCollisionMapOverlay } from '../utils/collisionMapOverlay'

type GameRendererProps = {
  renderer: (frame: FrameInfo, controls: ControlMatrix) => MonochromeBitmap
  rendererNew: (frame: FrameInfo, controls: ControlMatrix) => Frame
  collisionService: CollisionService
  spriteService: SpriteService
  spriteRegistry: SpriteRegistry<ImageData>
  renderMode: 'original' | 'modern'
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
  rendererNew,
  collisionService,
  spriteService,
  spriteRegistry,
  renderMode,
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
  const previousKeysDownRef = useRef<Set<string>>(new Set())
  const frameCountRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const paused = useAppSelector(state => state.game.paused)
  const showMapState = useAppSelector(state => state.game.showMap)
  const bindings = useAppSelector(state => state.controls.bindings)
  const touchControlsEnabled = useAppSelector(
    state => state.app.touchControlsEnabled
  )
  const collisionMode = useAppSelector(state => state.app.collisionMode)
  const store = useStore()
  const dispatch = useAppDispatch()

  // Track touch controls state
  const [touchControls, setTouchControls] = useState<ControlMatrix>({
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
  })

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

        // Calculate keys that were just pressed this frame
        const keysPressed = new Set<string>()
        for (const key of keysDownRef.current) {
          if (!previousKeysDownRef.current.has(key)) {
            keysPressed.add(key)
          }
        }

        // Calculate keys that were just released this frame
        const keysReleased = new Set<string>()
        for (const key of previousKeysDownRef.current) {
          if (!keysDownRef.current.has(key)) {
            keysReleased.add(key)
          }
        }

        const keyInfo: KeyInfo = {
          keysDown: keysDownRef.current,
          keysPressed: keysPressed,
          keysReleased: keysReleased
        }
        // Get keyboard controls
        const keyboardControls = getControls(keyInfo, bindings)

        // Merge keyboard and touch controls (OR logic for each control)
        const mergedControls = mergeControls(keyboardControls, touchControls)

        // If map is showing, use blank controls (all false) to prevent game input
        const controls = showMapState
          ? blankControls(mergedControls, {
              // need to still detect the map key
              map: mergedControls.map
            })
          : mergedControls

        if (controls.map) {
          if (showMapState) {
            dispatch(hideMap())
            dispatch(unpause())
          } else {
            dispatch(showMap())
            dispatch(pause())
          }
        }

        if (controls.pause && !showMapState) {
          dispatch(togglePause())
        }
        // Check collision mode and stop recording if it changed
        const recordingService = getStoreServices().recordingService
        if (recordingService.isRecording() && collisionMode !== 'modern') {
          console.warn(
            'Collision mode changed to original - stopping recording'
          )
          recordingService.stopRecording()
        }

        // Skip rendering when paused but keep the loop running
        if (!paused) {
          // Record frame if recording is active
          if (recordingService.isRecording()) {
            recordingService.recordFrame(
              frameCountRef.current,
              controls,
              store.getState() as RootState
            )
          }

          if (renderMode === 'original') {
            // Original bitmap renderer
            const renderedBitmap = renderer(frameInfo, controls)
            const collisionMap = collisionService.getMap()

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
                const byteIndex =
                  y * renderedBitmap.rowBytes + Math.floor(x / 8)
                const bitMask = 0x80 >> x % 8
                const isSet = (renderedBitmap.data[byteIndex]! & bitMask) !== 0

                const pixelIndex = (y * renderedBitmap.width + x) * 4
                const value = isSet ? 0 : 255 // Black on white

                // Set base pixel color
                pixels[pixelIndex] = value // R
                pixels[pixelIndex + 1] = value // G
                pixels[pixelIndex + 2] = value // B
                pixels[pixelIndex + 3] = 255 // A
              }
            }

            if (getDebug()?.SHOW_COLLISION_MAP) {
              const ship = (store.getState() as RootState).ship
              applyCollisionMapOverlay(
                pixels,
                collisionMap,
                ship,
                spriteService,
                renderedBitmap.width,
                renderedBitmap.height
              )
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
          } else {
            // Modern frame-based renderer
            const renderedFrame = rendererNew(frameInfo, controls)

            // Draw frame to canvas (background clearing is handled by viewClear in renderingNew.ts)
            drawFrameToCanvas(renderedFrame, ctx, scale, spriteRegistry, false)

            if (getDebug()?.SHOW_COLLISION_MAP) {
              const collisionMap = collisionService.getMap()
              const ship = (store.getState() as RootState).ship

              // Create a temporary canvas for unscaled overlay
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = width
              tempCanvas.height = height
              const tempCtx = tempCanvas.getContext('2d')!

              // Draw scaled image to temp canvas at original size
              tempCtx.drawImage(ctx.canvas, 0, 0, width, height)

              // Get unscaled pixels
              const unscaledImageData = tempCtx.getImageData(
                0,
                0,
                width,
                height
              )

              // Apply overlay at original scale
              applyCollisionMapOverlay(
                unscaledImageData.data,
                collisionMap,
                ship,
                spriteService,
                width,
                height
              )

              // Put back to temp canvas
              tempCtx.putImageData(unscaledImageData, 0, 0)

              // Scale back up to main canvas
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(tempCanvas, 0, 0, width * scale, height * scale)
            }
          }

          lastFrameTimeRef.current = currentTime
          frameCountRef.current++
        }

        // Update previous keys for next frame
        previousKeysDownRef.current = new Set(keysDownRef.current)
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
    rendererNew,
    renderMode,
    width,
    height,
    scale,
    fps,
    frameIntervalMs,
    bindings,
    paused,
    showMapState,
    dispatch,
    collisionService,
    spriteService,
    spriteRegistry,
    store,
    touchControls,
    collisionMode
  ])

  return (
    <>
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
            display: 'block'
          }}
        />
        {showMapState && <Map scale={scale} />}
      </div>
      {touchControlsEnabled && (
        <TouchControlsOverlay
          scale={scale}
          onControlsChange={setTouchControls}
        />
      )}
    </>
  )
}

export default GameRenderer
