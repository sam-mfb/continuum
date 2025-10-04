import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'
import {
  bitmapToCollisionItem,
  Collision,
  type CollisionType
} from '@/core/collision'
import { SCENTER } from '@/core/figs'

export const checkCollisions = createAsyncThunk<
  CollisionType,
  undefined,
  { state: RootState; extra: GameServices }
>('game/checkCollisions', async (_, { extra, getState }) => {
  const state = getState()
  const ship = state.ship
  const shipBitmap = extra.spriteService.getShipSprite(ship.shiprot, {
    variant: 'mask'
  }).bitmap
  const shipItem = bitmapToCollisionItem(
    shipBitmap,
    Collision.NONE,
    ship.shipx - SCENTER,
    ship.shipy - SCENTER
  )
  return extra.collisionService.checkItem(shipItem)
})
