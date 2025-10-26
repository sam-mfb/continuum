import { createSyncThunk } from '@/game/utils/createSyncThunk'
import {
  bitmapToCollisionItem,
  Collision,
  type CollisionType
} from '@/core/collision'
import { SCENTER } from '@/core/figs'

export const checkCollisions = createSyncThunk<CollisionType>(
  'game/checkCollisions',
  (_, { extra, getState }) => {
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
  }
)
