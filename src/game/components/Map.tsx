import React from 'react'
import { SBARHT, VIEWHT, SCRWTH } from '@core/screen'
import { useAppSelector } from '../store'

type MapProps = {
  scale: number
}

/**
 * Map overlay component - displays a map proportional to the planet dimensions
 * Height is fixed, width adjusts based on planet aspect ratio but constrained to screen
 */
export const Map: React.FC<MapProps> = ({ scale }) => {
  // Get planet dimensions from Redux store
  const worldwidth = useAppSelector(state => state.planet.worldwidth)
  const worldheight = useAppSelector(state => state.planet.worldheight)

  // Fixed map height based on the viewable height (without status bar)
  const mapHeight = (VIEWHT - 8) * scale // 290px at scale=1, 580px at scale=2

  // Maximum map width to stay within screen boundaries with 4px margins on each side
  const maxMapWidth = (SCRWTH - 8) * scale // 504px at scale=1, 1008px at scale=2

  // Calculate map width based on planet aspect ratio
  // If planet is not loaded yet (dimensions are 0), default to square
  let mapWidth = mapHeight // Default to square
  if (worldheight > 0) {
    const aspectRatio = worldwidth / worldheight
    mapWidth = mapHeight * aspectRatio
  }

  // Constrain width to screen boundaries
  mapWidth = Math.min(mapWidth, maxMapWidth)

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
        width: `${mapWidth}px`,
        height: `${mapHeight}px`,
        backgroundColor: 'white',
        border: '2px solid black',
        zIndex: 1000
      }}
    />
  )
}
