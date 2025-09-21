import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store'
import type { HighScoreState } from '@/core/highscore'
import { resetHighScores } from '@/core/highscore'
import { setAlignmentMode } from '../gameSlice'
import type { AlignmentMode } from '@/core/shared'

type StartScreenProps = {
  onStartGame: (level: number) => void
  totalLevels: number
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  totalLevels
}) => {
  const dispatch = useDispatch()
  const highScores = useSelector((state: RootState) => state.highscore)
  const alignmentMode = useSelector(
    (state: RootState) => state.game.alignmentMode
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(1)

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

  const handleResetScores = (): void => {
    if (showConfirm) {
      dispatch(resetHighScores())
      setShowConfirm(false)
    } else {
      setShowConfirm(true)
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000)
    }
  }

  const handleAlignmentToggle = (): void => {
    const newMode: AlignmentMode =
      alignmentMode === 'world-fixed' ? 'screen-fixed' : 'world-fixed'
    dispatch(setAlignmentMode(newMode))
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
        border: '2px solid #666'
      }}
    >
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
                Start at:
              </label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(Number(e.target.value))}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="originalBackground"
                checked={alignmentMode === 'world-fixed'}
                onChange={handleAlignmentToggle}
                style={{
                  cursor: 'pointer'
                }}
              />
              <label
                htmlFor="originalBackground"
                style={{
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Original Background
              </label>
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

            <button
              onClick={handleResetScores}
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                backgroundColor: 'black',
                color: 'white',
                border: '1px solid white',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              {showConfirm ? 'Confirm Reset' : 'Reset Scores'}
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'white',
            textAlign: 'center',
            lineHeight: '1.3',
            opacity: 0.8
          }}
        >
          <div>Controls:</div>
          <div>Z/X - Rotate | . - Thrust | / - Fire | Space - Shield</div>
          <div>A - Self destruct (use when stuck)</div>
        </div>
      </div>
    </div>
  )
}

export default StartScreen
