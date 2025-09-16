import React, { useState, useEffect, useRef } from 'react'

type HighScoreEntryProps = {
  score: number
  planet: number
  fuel: number
  onSubmit: (name: string) => void
}

const HighScoreEntry: React.FC<HighScoreEntryProps> = ({
  score,
  planet,
  fuel,
  onSubmit
}) => {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    // Only allow alphanumeric and basic characters
    if (e.key === 'Enter') {
      handleSubmit(e)
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
          gap: '30px',
          backgroundColor: '#f0f0f0',
          border: '3px solid black',
          borderRadius: '12px',
          padding: '40px',
          animation: 'pulse 2s infinite'
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            margin: 0,
            color: '#ff0000',
            letterSpacing: '3px',
            textAlign: 'center'
          }}
        >
          NEW HIGH SCORE!
        </h1>

        <div
          style={{
            fontSize: '24px',
            textAlign: 'center',
            lineHeight: '1.5'
          }}
        >
          <div>Score: {score.toLocaleString()}</div>
          <div>Planet: {planet}</div>
          <div>Fuel: {fuel}</div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}
        >
          <label
            style={{
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            Enter Your Name:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            maxLength={10}
            style={{
              fontSize: '24px',
              padding: '10px',
              width: '250px',
              textAlign: 'center',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              border: '2px solid black',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
            placeholder="AAA"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              fontSize: '20px',
              padding: '10px 30px',
              backgroundColor: name.trim() ? 'black' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}
          >
            SUBMIT
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  )
}

export default HighScoreEntry