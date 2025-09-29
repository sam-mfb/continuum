import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, GameServices } from '../store'
import type { HighScoreState } from '@/core/highscore'
import { allowHighScore, invalidateHighScore } from '../gameSlice'
import { openSettings } from '../appSlice'
import type { MonochromeBitmap } from '@lib/bitmap/types'
import type { SpriteService } from '@core/sprites'
import type { ThunkDispatch } from '@reduxjs/toolkit'
import type { AnyAction } from 'redux'

type StartScreenProps = {
  onStartGame: (level: number) => void
  totalLevels: number
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  totalLevels
}) => {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, GameServices, AnyAction>>()
  const highScores = useSelector((state: RootState) => state.highscore)
  const mostRecentScore = useSelector(
    (state: RootState) => state.app.mostRecentScore
  )
  const [selectedLevel, setSelectedLevel] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [titlePage, setTitlePage] = useState<MonochromeBitmap | null>(null)

  // Load title page from sprite service
  useEffect(() => {
    dispatch(allowHighScore())
    // Create a thunk to access the sprite service
    const loadTitlePage =
      () =>
      (
        _dispatch: ThunkDispatch<RootState, GameServices, AnyAction>,
        _getState: () => RootState,
        services: GameServices
      ): void => {
        const spriteService = services?.spriteService as
          | SpriteService
          | undefined
        if (spriteService) {
          const titlePageBitmap = spriteService.getTitlePage()
          if (titlePageBitmap) {
            setTitlePage(titlePageBitmap)
          }
        }
      }

    // Dispatch the thunk
    dispatch(loadTitlePage())
  }, [dispatch])

  // Title page content dimensions (hardcoded for deterministic behavior)
  const TITLE_PAGE_CONTENT_WIDTH = 501
  const TITLE_PAGE_CONTENT_HEIGHT = 311

  // Render title page to canvas
  useEffect(() => {
    if (!titlePage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to pixel-doubled dimensions
    // Width and height are fixed for consistent layout
    canvas.width = TITLE_PAGE_CONTENT_WIDTH * 2 // 1002px (501 * 2)
    canvas.height = 622 // 622px (311 * 2)

    // Create ImageData at original cropped size
    const imageData = ctx.createImageData(
      TITLE_PAGE_CONTENT_WIDTH,
      TITLE_PAGE_CONTENT_HEIGHT
    )
    const data = imageData.data

    // Convert monochrome bitmap to RGBA (only the content area)
    for (let y = 0; y < TITLE_PAGE_CONTENT_HEIGHT; y++) {
      for (let x = 0; x < TITLE_PAGE_CONTENT_WIDTH; x++) {
        const byteIndex = y * 64 + Math.floor(x / 8)
        const bitIndex = 7 - (x % 8)
        const byte = titlePage.data[byteIndex]
        const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

        const pixelIndex = (y * TITLE_PAGE_CONTENT_WIDTH + x) * 4
        const color = bit ? 0 : 255 // Black for 1, white for 0
        data[pixelIndex] = color // R
        data[pixelIndex + 1] = color // G
        data[pixelIndex + 2] = color // B
        data[pixelIndex + 3] = 255 // A
      }
    }

    // Enable image smoothing off for crisp pixels
    ctx.imageSmoothingEnabled = false

    // First put the image data on a temporary canvas at original size
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = TITLE_PAGE_CONTENT_WIDTH
    tempCanvas.height = TITLE_PAGE_CONTENT_HEIGHT
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCtx.putImageData(imageData, 0, 0)

    // Now draw it pixel-doubled to the main canvas
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      TITLE_PAGE_CONTENT_WIDTH,
      TITLE_PAGE_CONTENT_HEIGHT,
      0,
      0,
      TITLE_PAGE_CONTENT_WIDTH * 2,
      TITLE_PAGE_CONTENT_HEIGHT * 2
    )
  }, [titlePage])

  const formatHighScore = (
    slot: keyof HighScoreState,
    index: number
  ): React.ReactElement => {
    const score = highScores[slot]

    // Original positions scaled by 2x, adjusted up by 26px
    const yPos = 312 + index * 30 // (169 * 2) - 26 + index * 15 * 2

    return (
      <div
        key={slot}
        style={{
          position: 'absolute',
          top: `${yPos}px`,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          fontFamily: 'Verdana, Geneva, sans-serif',
          fontSize: '24px', // 12pt * 2 for pixel doubling
          fontWeight: '500', // Medium weight
          color: 'black'
        }}
      >
        {/* Name at x=440px (428 + 12) */}
        <span
          style={{
            position: 'absolute',
            left: '440px',
            width: '180px'
          }}
        >
          {score.user || ''}
        </span>

        {/* Level at x=764px (776 - 12) */}
        <span
          style={{
            position: 'absolute',
            left: '764px',
            width: '60px',
            textAlign: 'right'
          }}
        >
          {score.planet ? `${score.planet}` : ''}
        </span>

        {/* Score at x=892px (900 - 8) */}
        <span
          style={{
            position: 'absolute',
            left: '892px',
            width: '90px',
            textAlign: 'right'
          }}
        >
          {score.score ? score.score.toLocaleString() : ''}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1024px',
        height: '684px',
        backgroundColor: 'black',
        fontFamily: 'monospace',
        color: 'white',
        position: 'relative'
      }}
    >
      {/* Title page background */}
      {titlePage && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            imageRendering: 'pixelated'
          }}
        />
      )}

      {/* Last score display on the left side */}
      {mostRecentScore && (
        <>
          {/* Score - centered in box with center shifted 36px right */}
          <div
            style={{
              position: 'absolute',
              top: '326px',
              left: '66px',
              width: '202px',
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: '24px',
              fontWeight: '500',
              color: 'black'
            }}
          >
            {mostRecentScore.score.toLocaleString()}
          </div>

          {/* Fuel - centered in box with center shifted 36px right */}
          <div
            style={{
              position: 'absolute',
              top: '436px',
              left: '66px',
              width: '202px',
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: '24px',
              fontWeight: '500',
              color: 'black'
            }}
          >
            {mostRecentScore.fuel.toLocaleString()}
          </div>

          {/* Level - centered in same width box with center shifted 36px right */}
          <div
            style={{
              position: 'absolute',
              top: '546px',
              left: '66px',
              width: '202px',
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: '24px',
              fontWeight: '500',
              color: 'black'
            }}
          >
            {mostRecentScore.planet}
          </div>
        </>
      )}

      {/* High scores positioned on title page */}
      {Object.keys(highScores)
        .map(Number)
        .sort((a, b) => a - b)
        .map((slot, index) =>
          formatHighScore(slot as keyof HighScoreState, index)
        )}

      {/* Bottom controls - in the 62px space below canvas */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: 'white', fontSize: '14px' }}>
            Start at Level:
          </label>
          <select
            value={selectedLevel}
            onChange={e => {
              const level = parseInt(e.target.value)
              setSelectedLevel(level)
              if (level > 1) {
                dispatch(invalidateHighScore())
              } else {
                dispatch(allowHighScore())
              }
            }}
            style={{
              padding: '4px 8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              backgroundColor: 'black',
              color: 'white',
              border: '1px solid white',
              cursor: 'pointer'
            }}
          >
            {Array.from({ length: totalLevels }, (_, i) => i + 1).map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onStartGame(selectedLevel)}
          style={{
            fontSize: '16px',
            padding: '8px 20px',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }}
        >
          START GAME
        </button>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => dispatch(openSettings())}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '8px',
          backgroundColor: 'black',
          color: 'white',
          border: '1px solid #666',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#333'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'black'
        }}
        aria-label="Settings"
      >
        {/* Pixelated Gear Icon */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 17 17"
          xmlns="http://www.w3.org/2000/svg"
          style={{ fill: 'white' }}
        >
          {/* Draw gear teeth and body with individual rectangles */}

          {/* Top tooth */}
          <rect x="7" y="0" width="3" height="3" />

          {/* Top-left diagonal */}
          <rect x="3" y="3" width="2" height="2" />

          {/* Left tooth */}
          <rect x="0" y="7" width="3" height="3" />

          {/* Bottom-left diagonal */}
          <rect x="3" y="12" width="2" height="2" />

          {/* Bottom tooth */}
          <rect x="7" y="14" width="3" height="3" />

          {/* Bottom-right diagonal */}
          <rect x="12" y="12" width="2" height="2" />

          {/* Right tooth */}
          <rect x="14" y="7" width="3" height="3" />

          {/* Top-right diagonal */}
          <rect x="12" y="3" width="2" height="2" />

          {/* Main circular body */}
          <rect x="5" y="3" width="7" height="11" />
          <rect x="3" y="5" width="11" height="7" />

          {/* Center hole */}
          <rect x="7" y="7" width="3" height="3" fill="black" />
        </svg>
      </button>
    </div>
  )
}

export default StartScreen
