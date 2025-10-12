import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { xbcenter, ybcenter } from '@/core/planet'
import { BunkerKind, BUNKROTKINDS } from '@/core/figs'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { Bunker } from '@/core/planet'

/**
 * From doBunks() in orig/Sources/Bunkers.c at 213-245
 *
 * Draws all visible bunkers in the viewport.
 * Converted to Frame-based rendering using sprite drawables.
 *
 * IMPORTANT SPRITE MAPPING:
 * - WALL bunkers: 4 base sprites (bunker-wall-00 through 03), use rotation property for rotations 4-15
 * - DIFF bunkers: 4 base sprites (bunker-diff-00 through 03), use rotation property for rotations 4-15
 * - GROUND/FOLLOW/GENERATOR: 8 sprites each (00-07), bunker.rot IS the animation frame number
 */
export function drawBunkers(deps: {
  readonly bunkers: readonly Bunker[]
  screenX: number
  screenY: number
  viewport: { x: number; y: number; b: number; r: number }
}): (frame: Frame) => Frame {
  const { bunkers, screenX, screenY } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    // Calculate visible area bounds
    const left = screenX - 48
    const right = screenX + SCRWTH + 48

    // Process each bunker
    for (let i = 0; i < bunkers.length; i++) {
      const bp = bunkers[i]!

      // Check for end of bunker array (rot < 0 marks end)
      if (bp.rot < 0) break

      // Skip dead bunkers
      if (!bp.alive) continue

      // Check if bunker is within horizontal bounds
      if (bp.x > left && bp.x < right) {
        // Get bunker center offsets for this type and rotation
        const ycenter = ybcenter[bp.kind]![bp.rot]!
        const bunky = bp.y - screenY - ycenter

        // Check if bunker is within vertical bounds
        if (bunky > -48 && bunky < VIEWHT) {
          const xcenter = xbcenter[bp.kind]![bp.rot]!

          // Determine sprite ID and rotation based on bunker kind
          let spriteId: string
          let spriteRotation: number

          if (bp.kind < BUNKROTKINDS) {
            // WALL and DIFF - rotating bunkers with limited base sprites
            const kindName = bp.kind === BunkerKind.WALL ? 'wall' : 'diff'

            // Both WALL and DIFF have 4 base sprites (0-3) evenly distributed across 16 rotations
            const baseRotation = bp.rot % 4
            const rotationQuadrants = Math.floor(bp.rot / 4)

            // Each quadrant is 90 degrees (π/2 radians)
            spriteRotation = rotationQuadrants * (Math.PI / 2)

            const rotStr =
              baseRotation < 10 ? `0${baseRotation}` : `${baseRotation}`
            spriteId = `bunker-${kindName}-${rotStr}`
          } else {
            // GROUND, FOLLOW, GENERATOR - animated bunkers
            // bunker.rot IS the animation frame (0-7)
            let kindName: string
            switch (bp.kind) {
              case BunkerKind.GROUND:
                kindName = 'ground'
                break
              case BunkerKind.FOLLOW:
                kindName = 'follow'
                break
              case BunkerKind.GENERATOR:
                kindName = 'generator'
                break
              default:
                continue // Skip unknown kinds
            }

            // Use rotation as animation frame
            const frame = bp.rot % 8
            const frameStr = frame < 10 ? `0${frame}` : `${frame}`
            spriteId = `bunker-${kindName}-${frameStr}`
            spriteRotation = 0 // No rotation for animated bunkers
          }

          newFrame.drawables.push({
            id: `bunker-${i}`,
            type: 'sprite',
            spriteId: spriteId,
            z: Z.BUNKER,
            alpha: 1,
            topLeft: {
              x: bp.x - screenX - xcenter,
              y: bunky + SBARHT
            },
            rotation: spriteRotation
          })
        }
      }
    }

    return newFrame
  }
}
