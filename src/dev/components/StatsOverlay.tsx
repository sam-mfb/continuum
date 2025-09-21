import React from 'react'
import type { GameFrameInfo } from '@lib/bitmap'

export type StatsPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type StatsConfig = {
  showFps?: boolean
  showFrameCount?: boolean
  showTime?: boolean
  showKeys?: boolean
  showCustomStats?: boolean
  position?: StatsPosition
  opacity?: number
  fontSize?: number
  fontColor?: string
  backgroundColor?: string
}

export type CustomStats = Record<string, string | number>

type StatsOverlayProps = {
  config: StatsConfig
  frameInfo: GameFrameInfo
  customStats?: CustomStats
  width: number
  height: number
  currentFps?: number
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  config,
  frameInfo,
  customStats,
  width: _width,
  height: _height,
  currentFps
}) => {
  const {
    showFps = false,
    showFrameCount = false,
    showTime = false,
    showKeys = false,
    showCustomStats = false,
    position = 'top-right',
    opacity = 0.8,
    fontSize = 12,
    fontColor = '#00FF00',
    backgroundColor = 'rgba(0, 0, 0, 0.7)'
  } = config

  // Determine position styles
  const getPositionStyles = (): React.CSSProperties => {
    const margin = 10
    const base: React.CSSProperties = {
      position: 'absolute'
    }

    switch (position) {
      case 'top-left':
        return { ...base, top: margin, left: margin }
      case 'top-right':
        return { ...base, top: margin, right: margin }
      case 'bottom-left':
        return { ...base, bottom: margin, left: margin }
      case 'bottom-right':
        return { ...base, bottom: margin, right: margin }
    }
  }

  // Collect all stats to display
  const stats: Array<{ label: string; value: string }> = []

  if (showFps && currentFps !== undefined) {
    stats.push({ label: 'FPS', value: currentFps.toFixed(1) })
  }

  if (showFrameCount) {
    stats.push({ label: 'Frame', value: frameInfo.frameCount.toString() })
  }

  if (showTime) {
    stats.push({
      label: 'Time',
      value: `${(frameInfo.totalTime / 1000).toFixed(1)}s`
    })
  }

  if (showKeys && frameInfo.keysDown.size > 0) {
    const keys = Array.from(frameInfo.keysDown)
    // Limit to first 3 keys and add "..." if more
    const displayKeys =
      keys.length > 3 ? keys.slice(0, 3).join(', ') + '...' : keys.join(', ')
    stats.push({ label: 'Keys', value: displayKeys })
  }

  if (showCustomStats && customStats) {
    Object.entries(customStats).forEach(([label, value]) => {
      stats.push({ label, value: value.toString() })
    })
  }

  // Don't render if no stats to show
  if (stats.length === 0) {
    return null
  }

  return (
    <div
      style={{
        ...getPositionStyles(),
        padding: '8px 12px',
        backgroundColor,
        color: fontColor,
        fontSize: `${fontSize}px`,
        fontFamily: 'monospace',
        borderRadius: '4px',
        opacity,
        pointerEvents: 'none', // Don't interfere with canvas interactions
        userSelect: 'none',
        zIndex: 10,
        minWidth: '200px', // Fixed minimum width to prevent resizing
        maxWidth: '300px' // Maximum width for very long content
      }}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <span style={{ fontWeight: 'bold' }}>{stat.label}:</span>{' '}
          <span>{stat.value}</span>
        </div>
      ))}
    </div>
  )
}
