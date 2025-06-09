import React, { useEffect, useRef, useState } from 'react'

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

export type GameDefinition = {
  name: string
  gameLoop: GameLoopFunction
}

export type GameViewProps = {
  // Canvas configuration
  width?: number // Canvas width in pixels (default: 512)
  height?: number // Canvas height in pixels (default: 342)
  fps?: number // Target frames per second (default: 20)

  // Visual options
  backgroundColor?: string // Canvas background (default: '#000000')
  pixelated?: boolean // Enable pixel-perfect rendering (default: true)
  scale?: number // Display scale factor (default: 1)
  showFps?: boolean // Show FPS counter overlay (default: false)

  // Game logic
  games: GameDefinition[]
  defaultGameIndex?: number

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
  showFps = false,
  games,
  defaultGameIndex = 0,
  onInit,
  onCleanup
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const [selectedGameIndex, setSelectedGameIndex] = useState(defaultGameIndex)

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
  const lastFpsUpdateRef = useRef<number>(0)

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
    const handleKeyDown = (e: KeyboardEvent) => {
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

    const handleKeyUp = (e: KeyboardEvent) => {
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

    // Call init hook if provided
    if (onInit) {
      onInit(ctx, env)
    }

    const renderLoop = (_timestamp: DOMHighResTimeStamp) => {
      const now = Date.now()
      const elapsed = now - lastFrameTimeRef.current

      // Check if it's time for a new frame
      if (elapsed >= targetDelta) {
        const deltaTime = now - lastFrameTimeRef.current
        const totalTime = now - startTimeRef.current

        // Update FPS tracking for debug display
        if (showFps) {
          fpsHistoryRef.current.push(1000 / deltaTime)
          if (fpsHistoryRef.current.length > 30) {
            fpsHistoryRef.current.shift()
          }
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

        // Clear background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, width, height)

        // Call selected game loop
        if (games[selectedGameIndex]) {
          games[selectedGameIndex].gameLoop(ctx, frameInfo, env)
        }

        // Draw FPS counter if enabled
        if (showFps && now - lastFpsUpdateRef.current > 500) {
          lastFpsUpdateRef.current = now
          const avgFps =
            fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
            fpsHistoryRef.current.length
          ctx.save()
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.fillRect(width - 100, 0, 100, 30)
          ctx.fillStyle = '#00FF00'
          ctx.font = '12px monospace'
          ctx.textAlign = 'right'
          ctx.fillText(`FPS: ${avgFps.toFixed(1)}`, width - 5, 20)
          ctx.restore()
        }

        // Clear per-frame key events
        keysPressedRef.current.clear()
        keysReleasedRef.current.clear()

        // Update timing
        lastFrameTimeRef.current = now
        frameCountRef.current++
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(renderLoop)

    // Cleanup
    return () => {
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
    showFps,
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
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <label style={{ color: '#fff', fontFamily: 'monospace' }}>
          Select Game:
        </label>
        <select
          value={selectedGameIndex}
          onChange={(e) => setSelectedGameIndex(Number(e.target.value))}
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
      <canvas
        ref={canvasRef}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          border: '1px solid #666',
          imageRendering: pixelated ? 'pixelated' : 'auto',
          background: backgroundColor
        }}
      />
    </div>
  )
}

export default GameView
