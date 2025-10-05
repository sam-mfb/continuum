import React from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setFullscreen } from '../appSlice'
import { toggleFullscreen } from '../mobile/fullscreen'

type FullscreenButtonProps = {
  scale: number
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ scale }) => {
  const dispatch = useAppDispatch()
  const isFullscreen = useAppSelector(state => state.app.isFullscreen)

  const handleClick = async (): Promise<void> => {
    await toggleFullscreen()
    // Update Redux state after toggling
    dispatch(setFullscreen(!isFullscreen))
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${20 * scale}px`,
    left: `${20 * scale}px`,
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const buttonStyle: React.CSSProperties = {
    width: `${16 * scale}px`,
    height: `${16 * scale}px`,
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    padding: '0',
    boxShadow: 'none'
  }

  const iconStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: `${16 * scale}px`,
    lineHeight: '1',
    userSelect: 'none',
    transition: 'all 0.25s ease'
  }

  return (
    <div style={containerStyle}>
      <button
        onClick={handleClick}
        style={buttonStyle}
        onMouseEnter={e => {
          const icon = e.currentTarget.querySelector(
            '[data-icon]'
          ) as HTMLElement
          if (icon) {
            icon.style.color = 'rgba(255, 255, 255, 1)'
            icon.style.transform = 'scale(1.15)'
          }
        }}
        onMouseLeave={e => {
          const icon = e.currentTarget.querySelector(
            '[data-icon]'
          ) as HTMLElement
          if (icon) {
            icon.style.color = 'rgba(255, 255, 255, 0.95)'
            icon.style.transform = 'scale(1)'
          }
        }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        <span style={iconStyle} data-icon="true">
          {isFullscreen ? '⛶' : '⛶'}
        </span>
      </button>
    </div>
  )
}

export default FullscreenButton
