import { createSyncThunk } from '../utils/createSyncThunk'
import {
  bitmapToCollisionItem,
  Collision,
  type CollisionItem
} from '@/core/collision'
import { xbcenter, ybcenter, type Bunker } from '@/core/planet'
import { LINE_KIND, type LineRec } from '@/core/shared'
import { SCRWTH } from '@/core/screen'

export const createCollisionMap = createSyncThunk<void>(
  'game/createCollisionMap',
  (_, { extra, getState }) => {
    extra.collisionService.reset()
    const state = getState()

    const on_right_side =
      state.screen.screenx > state.planet.worldwidth - SCRWTH
    const worldwrap = state.planet.worldwrap

    // Helper to add lines with optional wrapping
    const addLineCollision = (line: LineRec, screenOffsetX: number): void => {
      const startX = line.startx - screenOffsetX
      const startY = line.starty - state.screen.screeny
      const endX = line.endx - screenOffsetX
      const endY = line.endy - state.screen.screeny

      extra.collisionService.addLine({
        startPoint: { x: startX, y: startY, collision: Collision.LETHAL },
        endPoint: { x: endX, y: endY, collision: Collision.LETHAL },
        collision:
          line.kind === LINE_KIND.NORMAL
            ? Collision.LETHAL
            : line.kind === LINE_KIND.BOUNCE
              ? Collision.BOUNCE
              : Collision.NONE,
        width: 2
      })
    }

    // Add lines at normal position
    state.planet.lines.forEach(line =>
      addLineCollision(line, state.screen.screenx)
    )

    // Add lines at wrapped position
    if (on_right_side && worldwrap) {
      state.planet.lines.forEach(line =>
        addLineCollision(line, state.screen.screenx - state.planet.worldwidth)
      )
    }

    // Helper to add bunker collision with optional wrapping
    const addBunkerCollision = (
      bunker: Bunker,
      screenOffsetX: number
    ): void => {
      const sprite = extra.spriteService.getBunkerSprite(
        bunker.kind,
        bunker.rot,
        { variant: 'mask' }
      ).bitmap
      const xcenter = xbcenter[bunker.kind]![bunker.rot]!
      const ycenter = ybcenter[bunker.kind]![bunker.rot]!
      const item = bitmapToCollisionItem(
        sprite,
        Collision.LETHAL,
        bunker.x - xcenter - screenOffsetX,
        bunker.y - ycenter - state.screen.screeny
      )
      extra.collisionService.addItem(item)
    }

    // Add bunkers at normal position
    state.planet.bunkers
      .filter(bunker => bunker.alive)
      .forEach(bunker => addBunkerCollision(bunker, state.screen.screenx))

    // Add bunkers at wrapped position
    if (on_right_side && worldwrap) {
      state.planet.bunkers
        .filter(bunker => bunker.alive)
        .forEach(bunker =>
          addBunkerCollision(
            bunker,
            state.screen.screenx - state.planet.worldwidth
          )
        )
    }

    // only add bunker shots to collision map if ship is not shielding
    if (!state.ship.shielding) {
      // Helper to add shot collision with optional wrapping
      const addShotCollision = (
        shot: (typeof state.shots.bunkshots)[0],
        screenOffsetX: number
      ): void => {
        const shotX = shot.x - screenOffsetX
        const shotY = shot.y - state.screen.screeny
        const shotItem: CollisionItem = [
          { x: shotX, y: shotY, collision: Collision.LETHAL },
          { x: shotX + 1, y: shotY, collision: Collision.LETHAL },
          { x: shotX, y: shotY + 1, collision: Collision.LETHAL },
          { x: shotX + 1, y: shotY + 1, collision: Collision.LETHAL }
        ]
        extra.collisionService.addItem(shotItem)
      }

      // Add bunker shots at normal position
      state.shots.bunkshots
        .filter(shot => shot.lifecount > 0)
        .forEach(shot => addShotCollision(shot, state.screen.screenx))

      // Add bunker shots at wrapped position
      if (on_right_side && worldwrap) {
        state.shots.bunkshots
          .filter(shot => shot.lifecount > 0)
          .forEach(shot =>
            addShotCollision(
              shot,
              state.screen.screenx - state.planet.worldwidth
            )
          )
      }
    }
  }
)
