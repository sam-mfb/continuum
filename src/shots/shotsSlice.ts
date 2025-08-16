import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShotRec, ShotsState } from './types'
import { SHOT, NUMSTRAFES, STRAFE_LIFE } from './constants'
import type { Bunker } from '@/planet/types'
import type { LineRec } from '@/shared/types/line'
import { bunkShoot as bunkShootFn } from './bunkShoot'
import { setLife } from './setLife'

const initializeShot = (): ShotRec => ({
  x: 0,
  y: 0,
  x8: 0,
  y8: 0,
  lifecount: 0,
  v: 0,
  h: 0,
  strafedir: 0,
  btime: 0,
  hitlineId: ''
})

const initialState: ShotsState = {
  shipshots: Array.from({ length: SHOT.NUMBULLETS }, initializeShot),
  bunkshots: Array.from({ length: SHOT.NUMSHOTS }, initializeShot),
  strafes: Array.from({ length: NUMSTRAFES }, () => ({
    x: 0,
    y: 0,
    lifecount: 0,
    rot: 0
  }))
}

export const shotsSlice = createSlice({
  name: 'shots',
  initialState,
  reducers: {
    // based on Play.c:531-552
    initShipshot: (
      state,
      action: PayloadAction<{
        shielding: boolean
        shiprot: number
        dx: number
        dy: number
        globalx: number
        globaly: number
        walls: LineRec[]
        worldwidth: number
        worldwrap: boolean
      }>
    ) => {
      const {
        shielding,
        shiprot,
        dx,
        dy,
        globalx,
        globaly,
        walls,
        worldwidth,
        worldwrap
      } = action.payload
      let i = 0
      for (i = 0; i < SHOT.NUMBULLETS && state.shipshots[i]!.lifecount; i++) {}

      if (i < SHOT.NUMBULLETS && !shielding) {
        const yrot = (shiprot + 24) & 31

        // Create new shot object
        let newShot: ShotRec = {
          ...state.shipshots[i]!,
          h: SHOT.shotvecs[shiprot]! + (dx >> 5),
          v: SHOT.shotvecs[yrot]! + (dy >> 5),
          x8: globalx << 3,
          y8: globaly << 3,
          lifecount: SHOT.SHOTLEN,
          btime: 0,
          strafedir: -1,
          hitlineId: ''
        }

        // Calculate collision parameters using setLife
        // Pass undefined for ignoreWallId since it's a new shot
        newShot = setLife(
          newShot,
          walls,
          SHOT.SHOTLEN,
          undefined,
          worldwidth,
          worldwrap
        )

        if (newShot.lifecount > 0) {
          // Advance shot by one frame
          newShot = {
            ...newShot,
            x8: newShot.x8 + SHOT.shotvecs[shiprot]!,
            y8: newShot.y8 + SHOT.shotvecs[yrot]!,
            lifecount: newShot.lifecount - 1
          }
        }

        // Handle immediate wall collision if lifecount == 0
        // In the original, this would trigger bounce_shot if btime > 0

        // Create new array with updated shot
        state.shipshots = state.shipshots.map((shot, index) =>
          index === i ? newShot : shot
        )
      }
    },
    // Based on Terrain.c:398-407 - do_strafes()
    doStrafes: state => {
      state.strafes = state.strafes.map(strafe => {
        if (strafe.lifecount > 0) {
          return { ...strafe, lifecount: strafe.lifecount - 1 }
        }
        return strafe
      })
    },

    // Based on Terrain.c:379-394 - start_strafe()
    startStrafe: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        dir: number
      }>
    ) => {
      const { x, y, dir } = action.payload

      // Find strafe with lowest lifecount (oldest) to reuse
      let oldestIndex = 0
      let lowestLife = state.strafes[0]!.lifecount

      for (let i = 1; i < NUMSTRAFES; i++) {
        if (state.strafes[i]!.lifecount < lowestLife) {
          lowestLife = state.strafes[i]!.lifecount
          oldestIndex = i
        }
      }

      // Initialize the strafe at the chosen slot
      state.strafes[oldestIndex] = {
        x,
        y,
        lifecount: STRAFE_LIFE, // 4 frames
        rot: dir
      }
    },
    moveShipshots: (
      state,
      action: PayloadAction<{ worldwidth: number; worldwrap: boolean }>
    ) => {
      state.shipshots = state.shipshots.map(s => moveShot(s, action.payload))
    },
    moveBullets: (
      state,
      action: PayloadAction<{ worldwidth: number; worldwrap: boolean }>
    ) => {
      state.bunkshots = state.bunkshots.map(s => moveShot(s, action.payload))
    },
    bunkShoot: (
      state,
      action: PayloadAction<{
        screenx: number
        screenr: number
        screeny: number
        screenb: number
        readonly bunkrecs: readonly Bunker[]
        worldwidth: number
        worldwrap: boolean
        globalx: number
        globaly: number
      }>
    ) => {
      state.bunkshots = bunkShootFn(action.payload)(state.bunkshots)
    },
    // Based on Play.c:926-948 - bounce_shot()
    bounceShot: (
      state,
      action: PayloadAction<{
        shotIndex: number
        isShipShot: boolean
        wall: LineRec
        walls: LineRec[]
        worldwidth: number
        worldwrap: boolean
      }>
    ) => {
      const { shotIndex, isShipShot, wall, walls, worldwidth, worldwrap } =
        action.payload
      const shots = isShipShot ? state.shipshots : state.bunkshots
      const shot = shots[shotIndex]

      if (!shot || shot.lifecount > 0) return

      // Apply bounce physics
      let bouncedShot = bounceShotFunc(shot, wall)

      // Recalculate trajectory after bouncing, ignoring the wall we just bounced off
      bouncedShot = setLife(
        bouncedShot,
        walls,
        bouncedShot.lifecount,
        wall.id,
        worldwidth,
        worldwrap
      )

      // Update the shot in the array
      if (isShipShot) {
        state.shipshots[shotIndex] = bouncedShot
      } else {
        state.bunkshots[shotIndex] = bouncedShot
      }
    },

    // Composite action for wall collision processing
    processWallCollision: (
      state,
      action: PayloadAction<{
        shotIndex: number
        isShipShot: boolean
        wall: LineRec
        walls: LineRec[]
        worldwidth: number
        worldwrap: boolean
      }>
    ) => {
      const { shotIndex, isShipShot, walls, worldwidth, worldwrap } =
        action.payload
      const shots = isShipShot ? state.shipshots : state.bunkshots
      const shot = shots[shotIndex]

      if (!shot || shot.lifecount !== 0) return

      // If there's a strafe direction set, start the strafe effect
      if (shot.strafedir >= 0) {
        // Find strafe with lowest lifecount to reuse
        let oldestIndex = 0
        let lowestLife = state.strafes[0]!.lifecount

        for (let i = 1; i < NUMSTRAFES; i++) {
          if (state.strafes[i]!.lifecount < lowestLife) {
            lowestLife = state.strafes[i]!.lifecount
            oldestIndex = i
          }
        }

        // Initialize the strafe
        state.strafes[oldestIndex] = {
          x: shot.x,
          y: shot.y,
          lifecount: STRAFE_LIFE,
          rot: shot.strafedir
        }
      }

      // If it's a bounce wall (btime > 0), apply bounce
      if (shot.btime > 0) {
        let bouncedShot = bounceShotFunc(shot, action.payload.wall)

        // After bouncing, recalculate trajectory
        bouncedShot = setLife(
          bouncedShot,
          walls,
          bouncedShot.lifecount,
          action.payload.wall.id,
          worldwidth,
          worldwrap
        )

        if (isShipShot) {
          state.shipshots[shotIndex] = bouncedShot
        } else {
          state.bunkshots[shotIndex] = bouncedShot
        }
      }
    },

    clearAllShots: state => {
      // Reset all ship shots
      state.shipshots = state.shipshots.map(() => initializeShot())
      // Reset all bunk shots
      state.bunkshots = state.bunkshots.map(() => initializeShot())
      // Reset all strafes
      state.strafes = state.strafes.map(() => ({
        x: 0,
        y: 0,
        lifecount: 0,
        rot: 0
      }))
    }
  }
})

function moveShot(
  shot: ShotRec,
  env: {
    worldwidth: number
    worldwrap: boolean
  }
): ShotRec {
  if (shot.lifecount <= 0) {
    return shot
  }
  let worldwth8: number
  let x: number
  let y: number

  const sp = { ...shot }

  worldwth8 = env.worldwidth << 3

  sp.lifecount--
  x = sp.x8
  y = sp.y8
  x += sp.h
  y += sp.v
  if (y < 0) sp.lifecount = 0
  if (x < 0)
    if (env.worldwrap) x += worldwth8
    else sp.lifecount = 0
  else if (x >= worldwth8)
    if (env.worldwrap) x -= worldwth8
    else sp.lifecount = 0
  sp.x8 = x
  sp.y8 = y
  x >>= 3
  y >>= 3
  sp.x = x
  sp.y = y
  return sp
}

// Based on Play.c:926-948 - bounce_shot()
function bounceShotFunc(shot: ShotRec, _wall: LineRec): ShotRec {
  // In the original, bounce_shot() calls set_life() after bouncing
  // That would be handled by the caller in our architecture

  // Calculate wall normal (simplified - actual would use wall geometry)
  // In the original: dot = sp->h * x1 + sp->v * y1
  // Then: sp->h -= x1 * dot / (24*48); sp->v -= y1 * dot / (24*48)

  // For now, simple reflection (full implementation needs wall normal calculation)
  const updatedShot = { ...shot }

  // Restore lifetime for continued flight
  updatedShot.lifecount = updatedShot.btime
  updatedShot.btime = 0
  updatedShot.hitlineId = ''

  // TODO: Actual reflection physics based on wall normal
  // This would require the wall's normal vector to properly reflect velocity

  return updatedShot
}

export const {
  initShipshot,
  doStrafes,
  startStrafe,
  moveShipshots,
  moveBullets,
  bunkShoot,
  bounceShot,
  processWallCollision,
  clearAllShots
} = shotsSlice.actions

export default shotsSlice.reducer
