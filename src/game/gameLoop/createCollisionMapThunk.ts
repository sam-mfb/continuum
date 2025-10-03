import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'
import { bitmapToCollisionItem, Collision } from '@/core/collision'

export const createCollisionMap = createAsyncThunk<
  void,
  undefined,
  { state: RootState; extra: GameServices }
>('game/createCollisionMap', async (_, { extra, getState }) => {
  extra.collisionService.reset()
  const state = getState()

  const bunkers = state.planet.bunkers
  bunkers
    .filter(bunker => bunker.alive)
    .forEach(bunker => {
      const sprite = extra.spriteService.getBunkerSprite(
        bunker.kind,
        bunker.rot,
        { variant: 'mask' }
      ).bitmap
      const item = bitmapToCollisionItem(
        sprite,
        Collision.LETHAL,
        bunker.x - state.screen.screenx,
        bunker.y - state.screen.screeny
      )
      extra.collisionService.addItem(item)
    })
})
