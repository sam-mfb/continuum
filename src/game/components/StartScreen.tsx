import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, GameServices } from '../store'
import type { HighScoreTable } from '@/core/highscore'
import { getDefaultHighScoreTable } from '@/core/highscore'
import { allowHighScore, invalidateHighScore } from '../gameSlice'
import { openSettings } from '../appSlice'
import { loadGalaxy } from '../galaxyThunks'
import { GALAXIES } from '../galaxyConfig'
import type { MonochromeBitmap } from '@lib/bitmap/types'
import type { SpriteService } from '@core/sprites'
import type { ThunkDispatch } from '@reduxjs/toolkit'
import type { AnyAction } from 'redux'

type StartScreenProps = {
  scale: number
  onStartGame: (level: number) => void
}

const StartScreen: React.FC<StartScreenProps> = ({ scale, onStartGame }) => {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, GameServices, AnyAction>>()
  const currentGalaxyId = useSelector(
    (state: RootState) => state.app.currentGalaxyId
  )
  const totalLevels = useSelector((state: RootState) => state.app.totalLevels)
  const allHighScores = useSelector((state: RootState) => state.highscore)
  const highScores: HighScoreTable =
    allHighScores[currentGalaxyId] ?? getDefaultHighScoreTable()
  const mostRecentScore = useSelector(
    (state: RootState) => state.app.mostRecentScore
  )
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedGalaxyId, setSelectedGalaxyId] = useState(currentGalaxyId)
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

    // Set canvas size to scaled dimensions
    // Width and height scale with the display scale
    canvas.width = TITLE_PAGE_CONTENT_WIDTH * scale
    canvas.height = TITLE_PAGE_CONTENT_HEIGHT * scale

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

    // Now draw it scaled to the main canvas
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      TITLE_PAGE_CONTENT_WIDTH,
      TITLE_PAGE_CONTENT_HEIGHT,
      0,
      0,
      TITLE_PAGE_CONTENT_WIDTH * scale,
      TITLE_PAGE_CONTENT_HEIGHT * scale
    )
  }, [titlePage, scale])

  // Handle galaxy change
  const handleGalaxyChange = async (galaxyId: string): Promise<void> => {
    if (galaxyId === currentGalaxyId) return

    setSelectedGalaxyId(galaxyId)

    try {
      await dispatch(loadGalaxy(galaxyId)).unwrap()
      // Reset level selection to 1 when changing galaxies
      setSelectedLevel(1)
      dispatch(allowHighScore())
    } catch (error) {
      console.error('Failed to load galaxy:', error)
      // Revert selection on error
      setSelectedGalaxyId(currentGalaxyId)
    }
  }

  const formatHighScore = (slot: number, index: number): React.ReactElement => {
    const score = highScores[slot as keyof HighScoreTable]

    // Original positions at 1x scale: y=169, spacing=15
    // There's a -13px offset at 1x scale (becomes -26px at 2x)
    // Dynamic: use scale factor
    const baseY = 169
    const baseSpacing = 15
    const baseOffset = 13
    const yPos =
      baseY * scale - baseOffset * scale + index * baseSpacing * scale

    // Original positions at 1x scale: name=220, level=382, score=446
    // At 2x: name=440, level=764, score=892
    const nameX = 220 * scale
    const levelX = 382 * scale
    const scoreX = 446 * scale
    const fontSize = 12 * scale

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
          height: `${16 * scale}px`,
          fontFamily: 'Verdana, Geneva, sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: '500',
          color: 'black'
        }}
      >
        {/* Name */}
        <span
          style={{
            position: 'absolute',
            left: `${nameX}px`,
            width: `${90 * scale}px`
          }}
        >
          {score.user || ''}
        </span>

        {/* Level */}
        <span
          style={{
            position: 'absolute',
            left: `${levelX}px`,
            width: `${30 * scale}px`,
            textAlign: 'right'
          }}
        >
          {score.planet ? `${score.planet}` : ''}
        </span>

        {/* Score */}
        <span
          style={{
            position: 'absolute',
            left: `${scoreX}px`,
            width: `${45 * scale}px`,
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
        width: `${512 * scale}px`,
        height: `${342 * scale}px`,
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
          {/* Score - at 1x: top=163, left=33, width=101 */}
          <div
            style={{
              position: 'absolute',
              top: `${163 * scale}px`,
              left: `${33 * scale}px`,
              width: `${101 * scale}px`,
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: `${12 * scale}px`,
              fontWeight: '500',
              color: 'black'
            }}
          >
            {mostRecentScore.score.toLocaleString()}
          </div>

          {/* Fuel - at 1x: top=218, left=33, width=101 */}
          <div
            style={{
              position: 'absolute',
              top: `${218 * scale}px`,
              left: `${33 * scale}px`,
              width: `${101 * scale}px`,
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: `${12 * scale}px`,
              fontWeight: '500',
              color: 'black'
            }}
          >
            {mostRecentScore.fuel.toLocaleString()}
          </div>

          {/* Level - at 1x: top=273, left=33, width=101 */}
          <div
            style={{
              position: 'absolute',
              top: `${273 * scale}px`,
              left: `${33 * scale}px`,
              width: `${101 * scale}px`,
              textAlign: 'center',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: `${12 * scale}px`,
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
        .map((slot, index) => formatHighScore(slot, index))}

      {/* Bottom controls - in the space below game (at 1x: 31px, at 2x: 62px) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${31 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${10 * scale}px`
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${5 * scale}px`
          }}
        >
          <label style={{ color: 'white', fontSize: `${7 * scale}px` }}>
            Galaxy:
          </label>
          <select
            value={selectedGalaxyId}
            onChange={e => {
              void handleGalaxyChange(e.target.value)
            }}
            style={{
              padding: `${2 * scale}px ${4 * scale}px`,
              fontFamily: 'monospace',
              fontSize: `${7 * scale}px`,
              backgroundColor: 'black',
              color: 'white',
              border: '1px solid white',
              cursor: 'pointer'
            }}
          >
            {GALAXIES.map(galaxy => (
              <option key={galaxy.id} value={galaxy.id}>
                {galaxy.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${5 * scale}px`
          }}
        >
          <label style={{ color: 'white', fontSize: `${7 * scale}px` }}>
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
              padding: `${2 * scale}px ${4 * scale}px`,
              fontFamily: 'monospace',
              fontSize: `${7 * scale}px`,
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
            fontSize: `${8 * scale}px`,
            padding: `${4 * scale}px ${10 * scale}px`,
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: `${1 * scale}px`
          }}
        >
          START GAME
        </button>
      </div>

      {/* Settings Button - positioned at bottom right, aligned with START GAME button */}
      <button
        onClick={() => dispatch(openSettings())}
        style={{
          position: 'absolute',
          bottom: `${((31 - 16) / 2) * scale}px`,
          right: `${((31 - 16) / 2) * scale}px`,
          width: `${16 * scale}px`,
          height: `${16 * scale}px`,
          padding: `${4 * scale}px`,
          backgroundColor: 'black',
          color: 'white',
          border: '1px solid white',
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
          width={8.5 * scale}
          height={8.5 * scale}
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
