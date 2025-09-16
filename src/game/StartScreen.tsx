import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from './store'
import type { HighScoreState } from '@/core/highscore/highscoreSlice'
import { resetHighScores } from '@/core/highscore/highscoreSlice'

type StartScreenProps = {
  onStartGame: () => void
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const dispatch = useDispatch()
  const highScores = useSelector((state: RootState) => state.highscore)
  const [showConfirm, setShowConfirm] = useState(false)

  const formatHighScore = (slot: keyof HighScoreState): React.ReactElement | null => {
    const score = highScores[slot]
    if (!score.user) return null

    return (
      <div
        key={slot}
        style={{
          display: 'grid',
          gridTemplateColumns: '30px 150px 100px 60px',
          gap: '20px',
          fontSize: '18px',
          padding: '5px 0'
        }}
      >
        <span>{slot}.</span>
        <span>{score.user}</span>
        <span style={{ textAlign: 'right' }}>{score.score.toLocaleString()}</span>
        <span style={{ textAlign: 'center' }}>L{score.planet}</span>
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '684px',
        backgroundColor: 'white',
        fontFamily: 'monospace',
        color: 'black'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '40px'
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            margin: 0,
            letterSpacing: '4px',
            fontWeight: 'bold'
          }}
        >
          CONTINUUM
        </h1>

        <div
          style={{
            backgroundColor: '#f0f0f0',
            border: '2px solid black',
            borderRadius: '8px',
            padding: '30px',
            minWidth: '450px'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              margin: '0 0 20px 0',
              textAlign: 'center',
              borderBottom: '2px solid black',
              paddingBottom: '10px'
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
              .map(slot => formatHighScore(slot as keyof HighScoreState))
              .filter(Boolean)}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={onStartGame}
            style={{
              fontSize: '24px',
              padding: '15px 40px',
              backgroundColor: 'black',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              letterSpacing: '2px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            START GAME
          </button>

          <button
            onClick={handleResetScores}
            style={{
              fontSize: '14px',
              padding: '10px 20px',
              backgroundColor: showConfirm ? '#d00' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {showConfirm ? 'Confirm Reset' : 'Reset Scores'}
          </button>
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            lineHeight: '1.5'
          }}
        >
          <div>Controls:</div>
          <div>Z/X - Rotate | . - Thrust | / - Fire | Space - Shield</div>
        </div>
      </div>
    </div>
  )
}

export default StartScreen