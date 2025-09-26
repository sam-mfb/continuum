import React, { useEffect } from 'react'

type GameOverScreenProps = {
  onContinue: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  onContinue
}): React.ReactElement => {
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
        width: '1024px',
        height: '684px',
        backgroundColor: 'black',
        fontFamily: 'monospace',
        color: 'white'
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
          GAME OVER
        </h1>

        <div
          style={{
            fontSize: '16px',
            color: 'white',
            marginTop: '20px'
          }}
        >
          Press SPACE or ENTER to continue
        </div>

        <button
          onClick={onContinue}
          style={{
            fontSize: '16px',
            padding: '10px 24px',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            marginTop: '20px'
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}

export default GameOverScreen
