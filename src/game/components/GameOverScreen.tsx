import React, { useEffect } from 'react'

type GameOverScreenProps = {
  scale: number
  onContinue: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  scale,
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
        width: `${512 * scale}px`,
        height: `${342 * scale}px`,
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
          gap: `${20 * scale}px`
        }}
      >
        <h1
          style={{
            fontSize: `${24 * scale}px`,
            margin: 0,
            letterSpacing: `${2 * scale}px`,
            fontWeight: 'bold'
          }}
        >
          GAME OVER
        </h1>

        <div
          style={{
            fontSize: `${8 * scale}px`,
            color: 'white',
            marginTop: `${10 * scale}px`
          }}
        >
          Press SPACE or ENTER to continue
        </div>

        <button
          onClick={onContinue}
          style={{
            fontSize: `${8 * scale}px`,
            padding: `${5 * scale}px ${12 * scale}px`,
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid white',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: `${0.5 * scale}px`,
            marginTop: `${10 * scale}px`
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}

export default GameOverScreen
