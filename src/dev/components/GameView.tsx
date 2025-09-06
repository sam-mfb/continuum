import React, { useEffect, useRef, useState } from 'react'
import type {
  BitmapRenderer,
  BitmapToCanvasOptions,
  MonochromeBitmap
} from '@lib/bitmap'
import {
  createMonochromeBitmap,
  clearBitmap,
  bitmapToCanvas
} from '@lib/bitmap'
import {
  StatsOverlay,
  type StatsConfig,
  type CustomStats
} from './StatsOverlay'

/**
 * GameView Component
 *
 * This component recreates the display and input system from the original
 * Continuum game for the Macintosh (1986-88).
 *
 * Original Game Context (from orig/Sources/Play.c):
 * - Fixed 20 FPS game loop using Mac's 60Hz system timer
 * - Main loop: move_and_display() → wait_for_VR() → swap_screens()
 * - Polled keyboard input once per frame using GetKeys()
 * - Hardware double buffering on Mac Plus, software copying on Mac II
 *
 * Modern Implementation:
 * - Uses requestAnimationFrame but enforces 20 FPS timing (50ms/frame)
 * - Polls keyboard state each frame, tracking keysDown/Pressed/Released
 * - Single canvas with immediate mode rendering (no double buffering needed)
 * - Game logic passed as a pure function, allowing any state management
 *
 * Key Differences from Original:
 * - No screen swapping needed (browser handles this automatically)
 * - No vertical retrace synchronization (requestAnimationFrame handles this)
 * - Keyboard events instead of GetKeys() system call
 * - Canvas 2D context instead of direct pixel manipulation
 */

// Types
export type GameFrameInfo = {
  // Timing
  frameCount: number // Total frames since start
  deltaTime: number // Milliseconds since last frame
  totalTime: number // Total milliseconds since start
  targetDelta: number // Expected ms between frames (1000/fps)

  // Input
  keysDown: Set<string> // Currently pressed keys
  keysPressed: Set<string> // Keys pressed this frame
  keysReleased: Set<string> // Keys released this frame
}

export type GameEnvironment = {
  width: number
  height: number
  fps: number
}

export type GameLoopFunction = (
  ctx: CanvasRenderingContext2D,
  frame: GameFrameInfo,
  env: GameEnvironment
) => void

export type CanvasGameDefinition = {
  type: 'canvas'
  name: string
  gameLoop: GameLoopFunction
}

export type BitmapGameDefinition = {
  type: 'bitmap'
  name: string
  bitmapRenderer: BitmapRenderer
  bitmapOptions?: BitmapToCanvasOptions
}

export type GameDefinition = CanvasGameDefinition | BitmapGameDefinition

export type GameViewProps = {
  // Canvas configuration
  width?: number // Canvas width in pixels (default: 512)
  height?: number // Canvas height in pixels (default: 342)
  fps?: number // Target frames per second (default: 20)

  // Visual options
  backgroundColor?: string // Canvas background (default: '#000000')
  pixelated?: boolean // Enable pixel-perfect rendering (default: true)
  scale?: number // Display scale factor (default: 1)

  // Stats overlay
  statsConfig?: StatsConfig
  getCustomStats?: (
    frameInfo: GameFrameInfo,
    env: GameEnvironment
  ) => CustomStats

  // Game logic
  games: GameDefinition[]
  defaultGameIndex?: number

  // Stats control
  showGameStats?: boolean
  onShowGameStatsChange?: (show: boolean) => void

  // Optional lifecycle hooks
  onInit?: (ctx: CanvasRenderingContext2D, env: GameEnvironment) => void
  onCleanup?: () => void
}

const GameView: React.FC<GameViewProps> = ({
  width = 512,
  height = 342,
  fps = 20,
  backgroundColor = '#000000',
  pixelated = true,
  scale = 1,
  statsConfig,
  getCustomStats,
  games,
  defaultGameIndex = 0,
  showGameStats,
  onShowGameStatsChange,
  onInit,
  onCleanup
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const [selectedGameIndex, setSelectedGameIndex] = useState(defaultGameIndex)
  const [currentFps, setCurrentFps] = useState(0)
  const [currentFrameInfo, setCurrentFrameInfo] = useState<GameFrameInfo>({
    frameCount: 0,
    deltaTime: 0,
    totalTime: 0,
    targetDelta: 1000 / fps,
    keysDown: new Set(),
    keysPressed: new Set(),
    keysReleased: new Set()
  })

  // Bitmap ref for bitmap games
  const bitmapRef = useRef<MonochromeBitmap | null>(null)

  // Timing refs
  const startTimeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)

  // Input tracking refs
  const keysDownRef = useRef<Set<string>>(new Set())
  const keysPressedRef = useRef<Set<string>>(new Set())
  const keysReleasedRef = useRef<Set<string>>(new Set())

  // FPS tracking for debug display
  const fpsHistoryRef = useRef<number[]>([])

  // Reset frame count and timing when game changes
  useEffect(() => {
    frameCountRef.current = 0
    startTimeRef.current = Date.now()
    lastFrameTimeRef.current = startTimeRef.current
    setCurrentFrameInfo(prev => ({
      ...prev,
      frameCount: 0,
      totalTime: 0,
      deltaTime: 0
    }))
  }, [selectedGameIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Create environment object
    const env: GameEnvironment = { width, height, fps }

    // Calculate target milliseconds per frame
    const targetDelta = 1000 / fps

    // Set up keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent): void => {
      const code = e.code
      if (!keysDownRef.current.has(code)) {
        keysDownRef.current.add(code)
        keysPressedRef.current.add(code)
      }
      // Prevent default for common game keys
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          code
        )
      ) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      const code = e.code
      if (keysDownRef.current.has(code)) {
        keysDownRef.current.delete(code)
        keysReleasedRef.current.add(code)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Initialize timing
    startTimeRef.current = Date.now()
    lastFrameTimeRef.current = startTimeRef.current

    // Track next frame time for fixed-step timing
    let nextFrameTime = startTimeRef.current + targetDelta

    // Call init hook if provided
    if (onInit) {
      onInit(ctx, env)
    }

    const renderLoop = (_timestamp: DOMHighResTimeStamp): void => {
      const now = Date.now()

      // Check if it's time for a new frame using fixed-step timing
      if (now >= nextFrameTime) {
        // Calculate actual delta from last frame execution
        const deltaTime = now - lastFrameTimeRef.current
        const totalTime = now - startTimeRef.current

        // Update FPS tracking
        if (statsConfig?.showFps) {
          fpsHistoryRef.current.push(1000 / deltaTime)
          if (fpsHistoryRef.current.length > 30) {
            fpsHistoryRef.current.shift()
          }
          // Calculate average FPS
          const avgFps =
            fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
            fpsHistoryRef.current.length
          setCurrentFps(avgFps)
        }

        // Create frame info
        const frameInfo: GameFrameInfo = {
          frameCount: frameCountRef.current,
          deltaTime,
          totalTime,
          targetDelta,
          keysDown: new Set(keysDownRef.current),
          keysPressed: new Set(keysPressedRef.current),
          keysReleased: new Set(keysReleasedRef.current)
        }

        // Update frame info state for overlay
        setCurrentFrameInfo(frameInfo)

        // Clear background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, width, height)

        // Call selected game loop
        if (games[selectedGameIndex]) {
          const game = games[selectedGameIndex]

          switch (game.type) {
            case 'canvas':
              // Direct canvas rendering
              game.gameLoop(ctx, frameInfo, env)
              break

            case 'bitmap':
              // Bitmap rendering with conversion
              // Lazy initialize bitmap
              if (
                !bitmapRef.current ||
                bitmapRef.current.width !== width ||
                bitmapRef.current.height !== height
              ) {
                bitmapRef.current = createMonochromeBitmap(width, height)
              }

              // Clear bitmap
              clearBitmap(bitmapRef.current)

              // Call bitmap renderer
              game.bitmapRenderer(bitmapRef.current, frameInfo, env)

              // Convert to canvas
              bitmapToCanvas(bitmapRef.current, ctx, game.bitmapOptions)
              break
          }
        }

        // No longer draw FPS counter here - handled by StatsOverlay

        // Clear per-frame key events
        keysPressedRef.current.clear()
        keysReleasedRef.current.clear()

        // Update timing with fixed-step
        lastFrameTimeRef.current = now
        frameCountRef.current++

        // Schedule next frame at fixed interval
        // This prevents drift and maintains exact FPS
        nextFrameTime += targetDelta

        // Handle case where we're running behind
        // Skip frames if we're more than one frame behind
        if (now > nextFrameTime) {
          nextFrameTime = now + targetDelta
        }
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(renderLoop)

    // Cleanup
    return (): void => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (onCleanup) {
        onCleanup()
      }
    }
  }, [
    width,
    height,
    fps,
    backgroundColor,
    pixelated,
    scale,
    statsConfig,
    games,
    selectedGameIndex,
    onInit,
    onCleanup
  ])

  // Calculate display dimensions
  const displayWidth = width * scale
  const displayHeight = height * scale

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#333',
        gap: '20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <label style={{ color: '#fff', fontFamily: 'monospace' }}>
            Select Game:
          </label>
          <select
            value={selectedGameIndex}
            onChange={e => setSelectedGameIndex(Number(e.target.value))}
            style={{
              padding: '5px 10px',
              fontFamily: 'monospace',
              fontSize: '14px',
              backgroundColor: '#222',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '4px'
            }}
          >
            {games.map((game, index) => (
              <option key={index} value={index}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
        {onShowGameStatsChange && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={showGameStats || false}
              onChange={e => onShowGameStatsChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show Stats
          </label>
        )}
      </div>
      <div
        style={{
          position: 'relative',
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          border: '1px solid #666'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            imageRendering: pixelated ? 'pixelated' : 'auto',
            background: backgroundColor
          }}
        />
        {statsConfig && (
          <StatsOverlay
            config={statsConfig}
            frameInfo={currentFrameInfo}
            customStats={
              getCustomStats
                ? getCustomStats(currentFrameInfo, { width, height, fps })
                : undefined
            }
            width={displayWidth}
            height={displayHeight}
            currentFps={currentFps}
          />
        )}
      </div>
    </div>
  )
}

export default GameView
