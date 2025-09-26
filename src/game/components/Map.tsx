import React, { useRef, useEffect } from 'react'
import { SBARHT, VIEWHT, SCRWTH } from '@core/screen'
import { useAppSelector } from '../store'
import { LINE_KIND } from '@core/shared/types/line'
import type { LineRec } from '@core/shared/types/line'
import type { Fuel, Bunker } from '@core/planet/types'

type MinimapProps = {
  scale: number
}

/**
 * Draw planet lines on the map canvas with appropriate scaling
 * Normal lines are solid black, bounce lines are dotted, ghost and explode lines are skipped
 */
const drawMapLines = (
  ctx: CanvasRenderingContext2D,
  lines: LineRec[],
  scaleX: number,
  scaleY: number
): void => {
  ctx.save()
  ctx.lineWidth = 1 * scaleX

  for (const line of lines) {
    // Skip ghost and explode lines
    if (line.kind === LINE_KIND.GHOST || line.kind === LINE_KIND.EXPLODE)
      continue

    // Draw the line with scaling applied
    if (line.kind === LINE_KIND.BOUNCE) {
      // For bounce lines, manually draw dashed pattern with opaque white gaps
      const x1 = line.startx * scaleX
      const y1 = line.starty * scaleY
      const x2 = line.endx * scaleX
      const y2 = line.endy * scaleY

      // Calculate line length and direction
      const dx = x2 - x1
      const dy = y2 - y1
      const length = Math.sqrt(dx * dx + dy * dy)

      // Dash and gap size (scaled)
      const dashSize = 2 * Math.max(scaleX, scaleY)
      const gapSize = 2 * Math.max(scaleX, scaleY)
      const patternLength = dashSize + gapSize

      // Normalize direction
      const dirX = dx / length
      const dirY = dy / length

      // Draw dashes along the line
      let currentPos = 0
      while (currentPos < length) {
        // Draw dash (black)
        const dashEnd = Math.min(currentPos + dashSize, length)
        ctx.strokeStyle = 'black'
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(x1 + dirX * currentPos, y1 + dirY * currentPos)
        ctx.lineTo(x1 + dirX * dashEnd, y1 + dirY * dashEnd)
        ctx.stroke()

        // Draw gap (white) if not at the end
        const gapEnd = Math.min(currentPos + patternLength, length)
        if (dashEnd < length && gapEnd > dashEnd) {
          ctx.strokeStyle = 'white'
          ctx.beginPath()
          ctx.moveTo(x1 + dirX * dashEnd, y1 + dirY * dashEnd)
          ctx.lineTo(x1 + dirX * gapEnd, y1 + dirY * gapEnd)
          ctx.stroke()
        }

        currentPos += patternLength
      }
    } else {
      // Solid line for normal
      ctx.strokeStyle = 'black'
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(line.startx * scaleX, line.starty * scaleY)
      ctx.lineTo(line.endx * scaleX, line.endy * scaleY)
      ctx.stroke()
    }
  }

  ctx.restore()
}

/**
 * Draw fuel cells on the map as 4x4 black squares (scaled)
 * Only draws fuel cells that are alive and visible
 */
const drawFuelCells = (
  ctx: CanvasRenderingContext2D,
  fuels: Fuel[],
  scaleX: number,
  scaleY: number,
  visibilityMap: globalThis.Map<number, boolean>,
  displayScale: number
): void => {
  ctx.save()
  ctx.fillStyle = 'black'

  fuels.forEach((fuel, index) => {
    // Check for end marker
    if (!fuel || fuel.x >= 10000) return
    // Skip dead fuel cells
    if (!fuel.alive) return
    // Skip invisible fuel cells
    if (!visibilityMap.get(index)) return

    // Draw 4x4 black square at scaled position (multiply size by display scale)
    const size = 4 * displayScale
    const x = fuel.x * scaleX - size / 2 // Center the square
    const y = fuel.y * scaleY - size / 2
    ctx.fillRect(x, y, size, size)
  })

  ctx.restore()
}

/**
 * Draw bunkers on the map as 4x4 black filled circles (scaled)
 * Only draws bunkers that are alive
 */
const drawBunkers = (
  ctx: CanvasRenderingContext2D,
  bunkers: Bunker[],
  scaleX: number,
  scaleY: number,
  displayScale: number
): void => {
  ctx.save()
  ctx.fillStyle = 'black'

  for (const bunker of bunkers) {
    // Check for end marker
    if (bunker.rot < 0) break
    // Skip dead bunkers
    if (!bunker.alive) continue

    // Draw 4x4 filled circle at scaled position (multiply radius by display scale)
    const x = bunker.x * scaleX
    const y = bunker.y * scaleY
    const radius = 2 * displayScale // radius of 2 for 4x4 circle, scaled
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draw ship position on the map as concentric filled circles (scaled)
 * Creates a target-like appearance with colors that can be inverted for animation
 */
const drawShipPosition = (
  ctx: CanvasRenderingContext2D,
  shipX: number,
  shipY: number,
  scaleX: number,
  scaleY: number,
  displayScale: number,
  inverted: boolean = false
): void => {
  ctx.save()

  // Transform ship coordinates to map coordinates
  const mapX = shipX * scaleX
  const mapY = shipY * scaleY

  // Determine colors based on inverted state
  const outerColor = inverted ? 'white' : 'black'
  const middleColor = inverted ? 'black' : 'white'
  const innerColor = inverted ? 'white' : 'black'

  // Draw from largest to smallest (multiply radii by display scale)
  // Outermost circle (12px diameter)
  ctx.fillStyle = outerColor
  ctx.beginPath()
  ctx.arc(mapX, mapY, 6 * displayScale, 0, Math.PI * 2)
  ctx.fill()

  // Middle circle (8px diameter) - creates a ring effect
  ctx.fillStyle = middleColor
  ctx.beginPath()
  ctx.arc(mapX, mapY, 4 * displayScale, 0, Math.PI * 2)
  ctx.fill()

  // Center circle (4px diameter)
  ctx.fillStyle = innerColor
  ctx.beginPath()
  ctx.arc(mapX, mapY, 2 * displayScale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/**
 * Map overlay component - displays a minimap of the planet terrain
 * Height is fixed, width adjusts based on planet aspect ratio but constrained to screen
 */
export const Map: React.FC<MinimapProps> = ({ scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Track fuel visibility state
  const visibleFuelsRef = useRef<globalThis.Map<number, boolean>>(
    new globalThis.Map()
  )

  // Get planet data from Redux store
  const worldwidth = useAppSelector(state => state.planet.worldwidth)
  const worldheight = useAppSelector(state => state.planet.worldheight)
  const lines = useAppSelector(state => state.planet.lines)
  const fuels = useAppSelector(state => state.planet.fuels)
  const bunkers = useAppSelector(state => state.planet.bunkers)

  // Get ship position from Redux store
  const shipGlobalX = useAppSelector(state => state.ship.globalx)
  const shipGlobalY = useAppSelector(state => state.ship.globaly)

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

  // Initialize fuel visibility map when fuels change
  useEffect(() => {
    const visibilityMap = new globalThis.Map<number, boolean>()
    fuels.forEach((fuel, index) => {
      if (fuel && fuel.alive && fuel.x < 10000) {
        visibilityMap.set(index, true)
      }
    })
    visibleFuelsRef.current = visibilityMap
  }, [fuels])

  // Render the planet lines and animate ship position on the canvas
  useEffect(() => {
    if (!canvasRef.current || worldwidth === 0 || worldheight === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate scaling to fit planet in map
    const scaleX = mapWidth / worldwidth
    const scaleY = mapHeight / worldheight

    // Track animation start time and fuel toggle timing
    const startTime = Date.now()
    let lastToggleTime = Date.now()
    let animationId: number

    // Animation loop using requestAnimationFrame
    const animate = (): void => {
      const now = Date.now()

      // Toggle one random fuel cell visibility every ~16.67ms (60fps)
      if (now - lastToggleTime >= 1000 / 3) {
        const aliveFuelIndices = Array.from(visibleFuelsRef.current.keys())
        if (aliveFuelIndices.length > 0) {
          const randomIdx = Math.floor(Math.random() * aliveFuelIndices.length)
          const randomIndex = aliveFuelIndices[randomIdx]
          if (randomIndex !== undefined) {
            const currentVisibility =
              visibleFuelsRef.current.get(randomIndex) ?? true
            visibleFuelsRef.current.set(randomIndex, !currentVisibility)
          }
        }
        lastToggleTime = now
      }

      // Calculate if colors should be inverted (toggles every 500ms for 2 blinks per second)
      const elapsed = now - startTime
      const inverted = Math.floor(elapsed / 500) % 2 === 1

      // Clear canvas with white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the fuel cells with visibility map
      drawFuelCells(ctx, fuels, scaleX, scaleY, visibleFuelsRef.current, scale)

      // Draw the bunkers
      drawBunkers(ctx, bunkers, scaleX, scaleY, scale)

      // Draw the planet lines
      drawMapLines(ctx, lines, scaleX, scaleY)

      // Draw the ship position with current inverted state
      drawShipPosition(
        ctx,
        shipGlobalX,
        shipGlobalY,
        scaleX,
        scaleY,
        scale,
        inverted
      )

      // Continue animation
      animationId = requestAnimationFrame(animate)
    }

    // Start animation
    animationId = requestAnimationFrame(animate)

    // Cleanup function to cancel animation
    return (): void => {
      cancelAnimationFrame(animationId)
    }
  }, [
    lines,
    fuels,
    bunkers,
    worldwidth,
    worldheight,
    mapWidth,
    mapHeight,
    shipGlobalX,
    shipGlobalY,
    scale
  ])

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
