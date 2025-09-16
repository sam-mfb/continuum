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
          gap: '40px'
        }}
      >
        <h1
          style={{
            fontSize: '36px',
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
            padding: '20px',
            minWidth: '400px'
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              margin: '0 0 15px 0',
              textAlign: 'center',
              borderBottom: '1px solid white',
              paddingBottom: '8px'
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
            gap: '15px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={onStartGame}
            style={{
              fontSize: '20px',
              padding: '12px 30px',
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
              fontSize: '12px',
              padding: '8px 16px',
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

        <div
          style={{
            fontSize: '12px',
            color: 'white',
            textAlign: 'center',
            lineHeight: '1.5',
            opacity: 0.8
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