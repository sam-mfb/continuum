import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'
import { bitmapToCollisionItem, Collision } from '@/core/collision'
import { SBARHT } from '@/core/screen'

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
        // NB: collision map doesn't include status bar
        bunker.y - state.screen.screeny - SBARHT
      )
      extra.collisionService.addItem(item)
    })
})
