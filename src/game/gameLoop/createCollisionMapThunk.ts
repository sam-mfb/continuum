import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'
import { bitmapToCollisionItem, Collision } from '@/core/collision'
import { SCRWTH, VIEWHT } from '@/core/screen'

export const createCollisionMap = createAsyncThunk<
  void,
  undefined,
  { state: RootState; extra: GameServices }
>('game/createCollisionMap', async (_, { extra, getState }) => {
  const state = getState()
  const left = state.screen.screenx
  const right = left + SCRWTH
  const top = state.screen.screeny
  const bottom = top + VIEWHT

  const bunkers = state.planet.bunkers
  bunkers
    .filter(bunker => bunker.x)
    .forEach(bunker => {
      const sprite = extra.spriteService.getBunkerSprite(
        bunker.kind,
        bunker.rot,
        { variant: 'mask' }
      ).bitmap
      const item = bitmapToCollisionItem(sprite, Collision.LETHAL)
      extra.collisionService.addItem(item)
    })
})
