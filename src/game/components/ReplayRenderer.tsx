import React, { useEffect, useRef } from 'react'
import type { FrameInfo, MonochromeBitmap } from '@lib/bitmap'
import {
  useAppDispatch,
  useAppSelector,
  getStoreServices,
  type RootState
} from '../store'
import { type ControlMatrix } from '@core/controls'
import { stopReplay, setReplayFrame } from '../replaySlice'
import { setMode } from '../appSlice'
import type { SpriteService } from '@/core/sprites'
import type { CollisionService } from '@/core/collision'
import type { Frame, SpriteRegistry } from '@/lib/frame/types'
import { drawFrameToCanvas } from '@/lib/frame/drawFrameToCanvas'
import ReplayControls from './ReplayControls'
import { getDebug } from '../debug'
import { useStore } from 'react-redux'
import { applyCollisionMapOverlay } from '../utils/collisionMapOverlay'

type ReplayRendererProps = {
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
 * Replay renderer component - handles canvas rendering and replay game loop
 * Similar to GameRenderer but reads controls from recording instead of user input
 */
const ReplayRenderer: React.FC<ReplayRendererProps> = ({
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
  const frameCountRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const replayPaused = useAppSelector(state => state.replay.replayPaused)
  const totalReplayFrames = useAppSelector(
    state => state.replay.totalReplayFrames
  )
  const dispatch = useAppDispatch()
  const store = useStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up pixel-perfect rendering
    ctx.imageSmoothingEnabled = false

    // Initialize start time
    startTimeRef.current = performance.now()

    const recordingService = getStoreServices().recordingService

    // Game loop
    const gameLoop = (currentTime: number): void => {
      const deltaTime = currentTime - lastFrameTimeRef.current

      if (deltaTime >= frameIntervalMs) {
        // Prepare frame info
        const frameInfo: FrameInfo = {
          frameCount: frameCountRef.current,
          deltaTime: deltaTime,
          totalTime: currentTime - startTimeRef.current,
          targetDelta: frameIntervalMs
        }

        // Skip updates when paused but keep the loop running
        if (!replayPaused) {
          // Update frame counter in Redux
          dispatch(setReplayFrame(frameCountRef.current))

          // Get controls from recording for this frame
          const controls = recordingService.getReplayControls(
            frameCountRef.current
          )

          if (controls === null) {
            console.warn(
              `No replay controls for frame ${frameCountRef.current}`
            )
            // Stop replay on missing controls
            recordingService.stopReplay()
            dispatch(stopReplay())
            dispatch(setMode('replaySelection'))
            return
          }

          // Check if replay is complete
          if (frameCountRef.current >= totalReplayFrames) {
            console.log('Replay complete')
            recordingService.stopReplay()
            dispatch(stopReplay())
            dispatch(setMode('replaySelection'))
            return
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

            // Draw frame to canvas
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
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    // Cleanup
    return (): void => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [
    renderer,
    rendererNew,
    renderMode,
    collisionService,
    spriteService,
    width,
    height,
    scale,
    fps,
    frameIntervalMs,
    replayPaused,
    totalReplayFrames,
    dispatch,
    spriteRegistry,
    store
  ])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
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
      <ReplayControls scale={scale} />
    </div>
  )
}

export default ReplayRenderer
