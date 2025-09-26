import React from 'react'
import { SBARHT, VIEWHT } from '@core/screen'

type MapProps = {
  scale: number
}

/**
 * Map overlay component - displays a square map sized to the game view area
 * Will eventually show a minimap of the game world
 */
export const Map: React.FC<MapProps> = ({ scale }) => {
  // Size the map as a square based on the viewable height (without status bar)
  const mapSize = (VIEWHT - 8) * scale // 290px at scale=1, 580px at scale=2

  // Center in the view area (game area without status bar)
  // VIEWHT is 318px, center is at 159px (at scale=1)
  const centerY = (VIEWHT / 2 + SBARHT) * scale

  return (
    <div
      style={{
        position: 'absolute',
        top: `${centerY}px`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${mapSize}px`,
        height: `${mapSize}px`,
        backgroundColor: 'white',
        border: '2px solid black',
        zIndex: 1000
      }}
    />
  )
}
