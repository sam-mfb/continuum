import { createSyncThunk } from '@/game/utils/createSyncThunk'
import { bunkShoot as bunkShootFn } from './bunkShoot'
import type { Bunker } from '@core/planet'
import type { LineRec } from '@core/shared'
import type { ShotRec } from './types'

/**
 * Thunk to handle bunker shooting with random service from extra
 */
export const bunkShootThunk = createSyncThunk<
  { bunkshots: ShotRec[] },
  {
    screenx: number
    screenr: number
    screeny: number
    screenb: number
    readonly bunkrecs: readonly Bunker[]
    readonly walls: readonly LineRec[]
    worldwidth: number
    worldwrap: boolean
    globalx: number
    globaly: number
  }
>('shots/bunkShoot', (args, { extra, getState }) => {
  const state = getState()
  const newBunkshots = bunkShootFn({
    ...args,
    randomService: extra.randomService
  })(state.shots.bunkshots)

  return { bunkshots: newBunkshots }
})
