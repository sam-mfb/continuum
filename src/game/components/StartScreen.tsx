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
  const [selectedLevel, setSelectedLevel] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [titlePage, setTitlePage] = useState<MonochromeBitmap | null>(null)

  // Find the most recent score with a valid date (within last 5 minutes)
  const getMostRecentSlot = (): keyof HighScoreState | null => {
    let mostRecentSlot: keyof HighScoreState | null = null
    let mostRecentDate: Date | null = null
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes in milliseconds

    Object.keys(highScores).forEach(key => {
      const slot = Number(key) as keyof HighScoreState
      const score = highScores[slot]
      if (score.date && score.date !== '') {
        try {
          const date = new Date(score.date)
          // Check if it's a valid date and within last 5 minutes
          if (!isNaN(date.getTime()) && date >= fiveMinutesAgo) {
            if (!mostRecentDate || date > mostRecentDate) {
              mostRecentDate = date
              mostRecentSlot = slot
            }
          }
        } catch {
          // Invalid date format, skip
        }
      }
    })

    return mostRecentSlot
  }

  const mostRecentSlot = getMostRecentSlot()

  // Load title page from sprite service
  useEffect(() => {
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

  // Render title page to canvas
  useEffect(() => {
    if (!titlePage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to pixel-doubled (matching game display)
    canvas.width = 1024
    canvas.height = 684

    // Create ImageData at original size
    const imageData = ctx.createImageData(512, 342)
    const data = imageData.data

    // Convert monochrome bitmap to RGBA
    for (let y = 0; y < 342; y++) {
      for (let x = 0; x < 512; x++) {
        const byteIndex = y * 64 + Math.floor(x / 8)
        const bitIndex = 7 - (x % 8)
        const byte = titlePage.data[byteIndex]
        const bit = byte !== undefined ? (byte >> bitIndex) & 1 : 0

        const pixelIndex = (y * 512 + x) * 4
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
    tempCanvas.width = 512
    tempCanvas.height = 342
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCtx.putImageData(imageData, 0, 0)

    // Now draw it scaled 2x on the main canvas
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tempCanvas, 0, 0, 512, 342, 0, 0, 1024, 684)
  }, [titlePage])

  const formatHighScore = (slot: keyof HighScoreState): React.ReactElement => {
    const score = highScores[slot]
    const isRecent = slot === mostRecentSlot

    return (
      <div
        key={slot}
        style={{
          display: 'grid',
          gridTemplateColumns: '30px 150px 100px 60px',
          gap: '20px',
          fontSize: '16px',
          padding: '4px 10px',
          backgroundColor: isRecent ? 'white' : 'transparent',
          color: isRecent ? 'black' : 'white',
          margin: '0 -10px'
        }}
      >
        <span>{slot}.</span>
        <span>{score.user || '---'}</span>
        <span style={{ textAlign: 'right' }}>
          {score.score ? score.score.toLocaleString() : '---'}
        </span>
        <span style={{ textAlign: 'center' }}>
          {score.planet ? `L${score.planet}` : '---'}
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
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '1024px',
            height: '684px',
            opacity: 0.3,
            pointerEvents: 'none',
            imageRendering: 'pixelated'
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '30px'
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            margin: 0,
            letterSpacing: '3px',
            fontWeight: 'bold'
          }}
        >
          CONTINUUM
        </h1>

        <div
          style={{
            backgroundColor: 'black',
            border: '1px solid white',
            padding: '15px',
            minWidth: '400px'
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              margin: '0 0 10px 0',
              textAlign: 'center',
              borderBottom: '1px solid white',
              paddingBottom: '6px'
            }}
          >
            HIGH SCORES
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {Object.keys(highScores)
              .map(Number)
              .sort((a, b) => a - b)
              .map(slot => formatHighScore(slot as keyof HighScoreState))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center'
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
                {Array.from({ length: totalLevels }, (_, i) => i + 1).map(
                  level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}
          >
            <button
              onClick={() => onStartGame(selectedLevel)}
              style={{
                fontSize: '18px',
                padding: '10px 24px',
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
        </div>
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
