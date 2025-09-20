import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { BitmapRenderer } from '@lib/bitmap'
import { createMonochromeBitmap } from '@lib/bitmap'
import { startGame, setMode } from '../gameSlice'
import type { RootState } from '../store'
import { setHighScore } from '@/core/highscore/highscoreSlice'
import { shipSlice } from '@/core/ship/shipSlice'
import { invalidateHighScore } from '@/core/status/statusSlice'
import { initializeSoundService } from '@/core/sound/service'
import { resetSounds } from '@/core/sound/soundSlice'
import StartScreen from './StartScreen'
import HighScoreEntry from './HighScoreEntry'
import GameOverScreen from './GameOverScreen'

type GameCanvasProps = {
  renderer: BitmapRenderer
  width: number
  height: number
  scale: number
  fps: number
  totalLevels: number
  onLevelSelect: (level: number) => void
}

/**
 * Simple game canvas component without any UI controls
 * Perfect for the production game
 */
const GameCanvas: React.FC<GameCanvasProps> = ({
  renderer,
  width,
  height,
  scale,
  fps,
  totalLevels,
  onLevelSelect
}) => {
  const dispatch = useDispatch()
  const gameMode = useSelector((state: RootState) => state.game.mode)
  const pendingHighScore = useSelector(
    (state: RootState) => state.game.pendingHighScore
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const frameIntervalMs = 1000 / fps
  const keysDownRef = useRef<Set<string>>(new Set())
  const frameCountRef = useRef<number>(0)

  useEffect(() => {
    // Only run game loop when in playing mode
    if (gameMode !== 'playing') return

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
        // Render game and get the resulting bitmap
        const renderedBitmap = renderer(
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

        // Update bitmap reference for next frame
        bitmap = renderedBitmap

        // Create offscreen canvas at native resolution
        const offscreen = document.createElement('canvas')
        offscreen.width = renderedBitmap.width
        offscreen.height = renderedBitmap.height
        const offCtx = offscreen.getContext('2d')!

        // Convert bitmap to ImageData
        const imageData = new ImageData(renderedBitmap.width, renderedBitmap.height)
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
  }, [renderer, width, height, scale, fps, frameIntervalMs, gameMode])

  // Render different screens based on game mode
  if (gameMode === 'start') {
    return (
      <StartScreen
        onStartGame={(level: number) => {
          // Reset ship and sound to clean state
          dispatch(shipSlice.actions.resetShip())
          dispatch(resetSounds())

          // Invalidate high score if starting at level > 1
          if (level > 1) {
            dispatch(invalidateHighScore())
          }

          // Reinitialize sound service for new game
          initializeSoundService()

          // Start the game
          dispatch(startGame())
          onLevelSelect(level)
        }}
        totalLevels={totalLevels}
      />
    )
  }

  if (gameMode === 'highScoreEntry' && pendingHighScore) {
    return (
      <HighScoreEntry
        score={pendingHighScore.score}
        planet={pendingHighScore.planet}
        fuel={pendingHighScore.fuel}
        onSubmit={(name: string) => {
          dispatch(
            setHighScore({
              user: name,
              score: pendingHighScore.score,
              planet: pendingHighScore.planet,
              fuel: pendingHighScore.fuel,
              date: new Date().toISOString()
            })
          )
          dispatch(setMode('start'))
        }}
      />
    )
  }

  if (gameMode === 'gameOver') {
    return <GameOverScreen onContinue={() => dispatch(setMode('start'))} />
  }

  // Playing mode - render just the game canvas
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

export default GameCanvas
