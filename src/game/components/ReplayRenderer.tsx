import React, { useEffect, useRef } from 'react'
import type { FrameInfo } from '@lib/bitmap'
import { useAppDispatch, useAppSelector, getStoreServices } from '../store'
import { type ControlMatrix } from '@core/controls'
import { stopReplay, setReplayFrame } from '../replaySlice'
import { setMode } from '../appSlice'
import type { SpriteService } from '@/core/sprites'
import type { CollisionService } from '@/core/collision'
import type { Frame, SpriteRegistry } from '@/lib/frame/types'
import { drawFrameToCanvas } from '@/lib/frame/drawFrameToCanvas'
import ReplayControls from './ReplayControls'

type ReplayRendererProps = {
  rendererNew: (frame: FrameInfo, controls: ControlMatrix) => Frame
  collisionService: CollisionService
  spriteService: SpriteService
  spriteRegistry: SpriteRegistry<ImageData>
  width: number
  height: number
  scale: number
  fps: number
}

/**
 * Replay renderer component - handles canvas rendering and replay game loop
 * Similar to GameRenderer but reads controls from recording instead of user input
 * Always uses modern rendering and collision detection
 */
const ReplayRenderer: React.FC<ReplayRendererProps> = ({
  rendererNew,
  spriteRegistry,
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

        // Update frame counter in Redux
        dispatch(setReplayFrame(frameCountRef.current))

        // Skip updates when paused but keep the loop running
        if (!replayPaused) {
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
            dispatch(setMode('start'))
            return
          }

          // Check if replay is complete
          if (frameCountRef.current >= totalReplayFrames) {
            console.log('Replay complete')
            recordingService.stopReplay()
            dispatch(stopReplay())
            dispatch(setMode('start'))
            return
          }

          // Modern frame-based renderer (always use modern rendering for replay)
          const renderedFrame = rendererNew(frameInfo, controls)

          // Draw frame to canvas
          drawFrameToCanvas(renderedFrame, ctx, scale, spriteRegistry, false)

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
    rendererNew,
    width,
    height,
    scale,
    fps,
    frameIntervalMs,
    replayPaused,
    totalReplayFrames,
    dispatch,
    spriteRegistry
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
