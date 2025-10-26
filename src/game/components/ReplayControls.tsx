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
    dispatch(setMode('start'))
  }

  const fontSize = Math.floor(14 * scale)
  const buttonPadding = Math.floor(8 * scale)
  const gap = Math.floor(10 * scale)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${gap}px`,
        padding: `${buttonPadding}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: `${4 * scale}px`,
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: 'white',
        marginTop: `${gap}px`
      }}
    >
      <span>
        Frame {currentReplayFrame} / {totalReplayFrames}
      </span>
      <button
        onClick={handlePauseResume}
        style={{
          fontSize: `${fontSize}px`,
          padding: `${buttonPadding}px ${buttonPadding * 2}px`,
          cursor: 'pointer',
          backgroundColor: '#444',
          color: 'white',
          border: '1px solid #666',
          borderRadius: `${4 * scale}px`
        }}
      >
        {replayPaused ? 'Resume' : 'Pause'}
      </button>
      <button
        onClick={handleQuit}
        style={{
          fontSize: `${fontSize}px`,
          padding: `${buttonPadding}px ${buttonPadding * 2}px`,
          cursor: 'pointer',
          backgroundColor: '#444',
          color: 'white',
          border: '1px solid #666',
          borderRadius: `${4 * scale}px`
        }}
      >
        Quit
      </button>
    </div>
  )
}

export default ReplayControls
