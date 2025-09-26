import React, { useRef, useEffect } from 'react'
import { SBARHT, VIEWHT, SCRWTH } from '@core/screen'
import { useAppSelector } from '../store'
import { LINE_KIND } from '@core/shared/types/line'
import type { LineRec } from '@core/shared/types/line'

type MapProps = {
  scale: number
}

/**
 * Draw planet lines on the map canvas with appropriate scaling
 * Normal and ghost lines are solid black, bounce lines are dotted, explode lines are skipped
 */
const drawMapLines = (
  ctx: CanvasRenderingContext2D,
  lines: LineRec[],
  scaleX: number,
  scaleY: number
): void => {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'black'

  for (const line of lines) {
    // Skip explode lines
    if (line.kind === LINE_KIND.EXPLODE) continue

    // Set line style based on type
    if (line.kind === LINE_KIND.BOUNCE) {
      ctx.setLineDash([2, 2]) // Dotted line for bounce
    } else {
      ctx.setLineDash([]) // Solid line for normal and ghost
    }

    // Draw the line with scaling applied
    ctx.beginPath()
    ctx.moveTo(line.startx * scaleX, line.starty * scaleY)
    ctx.lineTo(line.endx * scaleX, line.endy * scaleY)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Map overlay component - displays a minimap of the planet terrain
 * Height is fixed, width adjusts based on planet aspect ratio but constrained to screen
 */
export const Map: React.FC<MapProps> = ({ scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get planet data from Redux store
  const worldwidth = useAppSelector(state => state.planet.worldwidth)
  const worldheight = useAppSelector(state => state.planet.worldheight)
  const lines = useAppSelector(state => state.planet.lines)

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

  // Render the planet lines on the canvas
  useEffect(() => {
    if (!canvasRef.current || worldwidth === 0 || worldheight === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calculate scaling to fit planet in map
    const scaleX = mapWidth / worldwidth
    const scaleY = mapHeight / worldheight

    // Draw the planet lines
    drawMapLines(ctx, lines, scaleX, scaleY)
  }, [lines, worldwidth, worldheight, mapWidth, mapHeight])

  return (
    <canvas
      ref={canvasRef}
      width={mapWidth}
      height={mapHeight}
      style={{
        position: 'absolute',
        top: `${centerY}px`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid black',
        imageRendering: 'pixelated',
        zIndex: 1000
      }}
    />
  )
}
