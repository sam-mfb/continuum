import React from 'react'
import { useAppDispatch, useAppSelector, getStoreServices } from '../store'
import { pauseReplay, resumeReplay, stopReplay } from '../replaySlice'
import { setMode } from '../appSlice'

type ReplayControlsProps = {
  scale: number
}

const ReplayControls: React.FC<ReplayControlsProps> = ({ scale }) => {
  const dispatch = useAppDispatch()
  const replayPaused = useAppSelector(state => state.replay.replayPaused)
  const currentReplayFrame = useAppSelector(
    state => state.replay.currentReplayFrame
  )
  const totalReplayFrames = useAppSelector(
    state => state.replay.totalReplayFrames
  )

  const handlePauseResume = (): void => {
    if (replayPaused) {
      dispatch(resumeReplay())
    } else {
      dispatch(pauseReplay())
    }
  }

  const handleQuit = (): void => {
    const recordingService = getStoreServices().recordingService
    recordingService.stopReplay()
    dispatch(stopReplay())
    dispatch(setMode('replaySelection'))
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${10 * scale}px`,
        padding: `${8 * scale}px`,
        backgroundColor: 'black',
        border: '1px solid white',
        fontFamily: 'monospace',
        fontSize: `${7 * scale}px`,
        color: 'white',
        marginTop: `${10 * scale}px`
      }}
    >
      <span>
        Frame {currentReplayFrame} / {totalReplayFrames}
      </span>
      <button
        onClick={handlePauseResume}
        style={{
          fontSize: `${8 * scale}px`,
          padding: `${4 * scale}px ${10 * scale}px`,
          cursor: 'pointer',
          backgroundColor: 'white',
          color: 'black',
          border: '1px solid white',
          fontFamily: 'monospace',
          letterSpacing: `${1 * scale}px`
        }}
      >
        {replayPaused ? 'RESUME' : 'PAUSE'}
      </button>
      <button
        onClick={handleQuit}
        style={{
          fontSize: `${8 * scale}px`,
          padding: `${4 * scale}px ${10 * scale}px`,
          cursor: 'pointer',
          backgroundColor: 'white',
          color: 'black',
          border: '1px solid white',
          fontFamily: 'monospace',
          letterSpacing: `${1 * scale}px`
        }}
      >
        QUIT
      </button>
    </div>
  )
}

export default ReplayControls
