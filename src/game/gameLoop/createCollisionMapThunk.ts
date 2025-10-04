import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'
import {
  bitmapToCollisionItem,
  Collision,
  type CollisionItem
} from '@/core/collision'
import { xbcenter, ybcenter } from '@/core/planet'

export const createCollisionMap = createAsyncThunk<
  void,
  undefined,
  { state: RootState; extra: GameServices }
>('game/createCollisionMap', async (_, { extra, getState }) => {
  extra.collisionService.reset()
  const state = getState()

  state.planet.bunkers
    .filter(bunker => bunker.alive)
    .forEach(bunker => {
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
        bunker.x - xcenter - state.screen.screenx,
        bunker.y - ycenter - state.screen.screeny
      )
      extra.collisionService.addItem(item)
    })

  state.shots.bunkshots
    .filter(shot => shot.lifecount > 0)
    .forEach(shot => {
      const shotX = shot.x - state.screen.screenx
      const shotY = shot.y - state.screen.screeny
      const shotItem: CollisionItem = [
        { x: shotX, y: shotY, collision: Collision.LETHAL },
        { x: shotX + 1, y: shotY, collision: Collision.LETHAL },
        { x: shotX, y: shotY + 1, collision: Collision.LETHAL },
        { x: shotX + 1, y: shotY + 1, collision: Collision.LETHAL }
      ]
      extra.collisionService.addItem(shotItem)
    })
})
