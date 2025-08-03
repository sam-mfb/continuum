import type { Bunker } from './drawTypes'
import { BunkerKind, BUNKER_COLORS } from './drawTypes'
import { getBunkerAngles } from './getBunkerAngles'

const BUNKER_RADIUS = 24
const FIRING_ARC_RADIUS_BASE = 50
const FIRING_ARC_RADIUS_STEP = 10

/**
 * Draw bunkers on the canvas
 * Each bunker type has a different color and some have firing arcs
 */
export const drawBunkers = (
  ctx: CanvasRenderingContext2D,
  bunkers: Bunker[]
): void => {
  ctx.save()
  ctx.lineWidth = 1

  bunkers.forEach(bunker => {
    // Determine bunker color based on type
    const color = BUNKER_COLORS[bunker.kind as BunkerKind] ?? 'white'
    ctx.strokeStyle = color
    ctx.fillStyle = color

    // Draw bunker circle
    ctx.beginPath()
    ctx.arc(bunker.x, bunker.y, BUNKER_RADIUS, 0, 2 * Math.PI)
    ctx.stroke()

    // Draw rotation indicator for WALL and DIFF bunkers
    if (
      bunker.kind === BunkerKind.NORMAL_SIT_ON_WALL ||
      bunker.kind === BunkerKind.DIFFERENT_AT_EACH_ORIENTATION
    ) {
      // Draw a line from center to edge to show rotation
      // WALL/DIFF have 16 rotations (0-15), each is 22.5 degrees
      const rotationAngle = bunker.rot * 22.5
      // Convert to radians, adjusting for canvas coordinates (0 = East)
      const rotationRad = ((rotationAngle - 90) * Math.PI) / 180

      ctx.beginPath()
      ctx.moveTo(bunker.x, bunker.y)
      ctx.lineTo(
        bunker.x + Math.cos(rotationRad) * BUNKER_RADIUS,
        bunker.y + Math.sin(rotationRad) * BUNKER_RADIUS
      )
      ctx.stroke()
    }

    // Draw firing arcs for bunkers that can shoot
    // Based on original game logic in Bunkers.c
    let canShoot = false

    if (bunker.kind === BunkerKind.GENERATOR) {
      // Generators never shoot
      canShoot = false
    } else if (bunker.kind === BunkerKind.DIFFERENT_AT_EACH_ORIENTATION) {
      // DIFF bunkers only shoot in certain rotations
      // From original: switch(bp->rot & 3) { case 0: c = 0; break; ...
      const rotMod4 = bunker.rot & 3
      canShoot = rotMod4 !== 0 // Doesn't shoot when rotation % 4 == 0
    } else {
      // WALL, GROUND, and TRACKING bunkers always shoot
      canShoot = true
    }

    if (canShoot) {
      // Draw two firing arcs (inner and outer)
      for (let j = 0; j < Math.min(2, bunker.ranges.length); j++) {
        const range = bunker.ranges[j]
        if (!range) continue

        const angles = getBunkerAngles(
          range.low,
          range.high,
          bunker.kind,
          bunker.rot
        )

        // Convert angles to radians
        // Canvas arc() uses: 0 = East, PI/2 = South, PI = West, 3PI/2 = North
        // Our angles use: 0 = North, 90 = East, 180 = South, 270 = West
        // So we need to subtract 90 degrees (PI/2 radians) to convert
        const startRad = ((angles.start - 90) * Math.PI) / 180
        const endRad = ((angles.end - 90) * Math.PI) / 180

        ctx.beginPath()
        ctx.arc(
          bunker.x,
          bunker.y,
          FIRING_ARC_RADIUS_BASE - FIRING_ARC_RADIUS_STEP * j,
          startRad,
          endRad
        )
        ctx.stroke()
      }
    }
  })

  ctx.restore()
}
