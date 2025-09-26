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
          gap: '25px',
          backgroundColor: 'black',
          border: '1px solid white',
          padding: '30px'
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            margin: 0,
            color: 'white',
            letterSpacing: '2px',
            textAlign: 'center'
          }}
        >
          NEW HIGH SCORE!
        </h1>

        <div
          style={{
            fontSize: '18px',
            textAlign: 'center',
            lineHeight: '1.5',
            color: 'white'
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
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            Enter Your Name:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={10}
            style={{
              fontSize: '18px',
              padding: '8px',
              width: '200px',
              textAlign: 'center',
              fontFamily: 'monospace',
              border: '1px solid white',
              backgroundColor: 'black',
              color: 'white'
            }}
            placeholder="Enter name"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              fontSize: '16px',
              padding: '8px 24px',
              backgroundColor: name.trim() ? 'white' : 'black',
              color: name.trim() ? 'black' : 'white',
              border: '1px solid white',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              opacity: name.trim() ? 1 : 0.5
            }}
          >
            SUBMIT
          </button>
        </form>
      </div>
    </div>
  )
}

export default HighScoreEntry
