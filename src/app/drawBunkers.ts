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

    // Draw firing arcs for bunkers with guns
    const bunkersWithGuns = [
      BunkerKind.NORMAL_SIT_ON_WALL,
      BunkerKind.NORMAL_SIT_ON_GROUND,
      BunkerKind.TRACKING
    ]

    if (bunkersWithGuns.includes(bunker.kind)) {
      // Note: BunkerKind.DIFFERENT_AT_EACH_ORIENTATION has guns in certain
      // rotations. This needs to be implemented based on original game logic

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

        ctx.beginPath()
        ctx.arc(
          bunker.x,
          bunker.y,
          FIRING_ARC_RADIUS_BASE - FIRING_ARC_RADIUS_STEP * j,
          1.5 * Math.PI + (angles.start * Math.PI) / 180,
          1.5 * Math.PI + (angles.end * Math.PI) / 180
        )
        ctx.stroke()
      }
    }
  })

  ctx.restore()
}
