import React, { useEffect } from 'react'

type GameOverScreenProps = {
  onContinue: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ onContinue }): React.ReactElement => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onContinue()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return (): void => window.removeEventListener('keydown', handleKeyPress)
  }, [onContinue])

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
            fontSize: '64px',
            margin: 0,
            letterSpacing: '4px',
            fontWeight: 'bold',
            animation: 'blink 1s infinite'
          }}
        >
          GAME OVER
        </h1>

        <div
          style={{
            fontSize: '20px',
            color: '#666',
            animation: 'fadeIn 2s'
          }}
        >
          Press SPACE or ENTER to continue
        </div>

        <button
          onClick={onContinue}
          style={{
            fontSize: '18px',
            padding: '12px 30px',
            backgroundColor: 'black',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            animation: 'fadeIn 3s'
          }}
        >
          CONTINUE
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50%, 100% {
            opacity: 1;
          }
          25%, 75% {
            opacity: 0.5;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default GameOverScreen