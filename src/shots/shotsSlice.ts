import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShotRec, ShotsState } from './types'
import { SHOT, NUMSTRAFES, STRAFE_LIFE } from './constants'
import type { Bunker } from '@/planet/types'
import type { LineRec } from '@/shared/types/line'
import { bunkShoot as bunkShootFn } from './bunkShoot'
import { setLife } from './setLife'
import { bounceShot as bounceShotFunc } from './bounceShot'
import { moveShot } from './moveShot'
import { checkBunkerCollision } from './checkBunkerCollision'
import { checkShipCollision } from './checkShipCollision'

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
    // Based on Play.c:750-814 - move_shipshots()
    // Comprehensive shot update including movement, collisions, and wall effects
    // NOTE: Does not implement:
    //   - Sound effects (Play.c:791 - start_sound)
    //   - Drawing operations (Play.c:807-811)
    //   - kill_bunk() side effects for scoring/explosions (Play.c:782)
    moveShipshots: (
      state,
      action: PayloadAction<{
        bunkers: readonly Bunker[]
        shipPosition: { x: number; y: number }
        shipAlive: boolean
        walls: LineRec[]
        worldwidth: number
        worldwrap: boolean
      }>
    ) => {
      const { bunkers, shipPosition, shipAlive, walls, worldwidth, worldwrap } =
        action.payload

      // Process each active shot
      state.shipshots = state.shipshots.map(shot => {
        // Skip inactive shots
        if (shot.lifecount <= 0) {
          return shot
        }

        // 1. Move the shot (Play.c:762)
        let updatedShot = moveShot(shot, { worldwidth, worldwrap })

        // Only continue collision checks if shot is still alive after movement
        if (updatedShot.lifecount <= 0) {
          return updatedShot
        }

        // 2. Check bunker collisions (Play.c:763-784)
        const bunkerResult = checkBunkerCollision(updatedShot, bunkers)
        if (bunkerResult.hit) {
          // Destroy the shot
          updatedShot.lifecount = 0
          updatedShot.btime = 0
          updatedShot.strafedir = -1
          // TODO: Handle bunker destruction in planet slice
          // TODO: Handle hardy bunker special case
          return updatedShot
        }

        // 3. Check ship collision - friendly fire (Play.c:785-795)
        const shipResult = checkShipCollision(
          updatedShot,
          shipPosition,
          shipAlive
        )
        if (shipResult.hit) {
          // Destroy the shot and trigger shield
          updatedShot.lifecount = 0
          updatedShot.btime = 0
          updatedShot.strafedir = -1
          // TODO: Trigger shield activation in ship slice
          return updatedShot
        }

        // 4. Check wall collision and bounce (Play.c:796-800)
        if (updatedShot.lifecount === 0 && updatedShot.btime > 0) {
          // Find the wall that was hit
          const wall = walls.find(w => w.id === updatedShot.hitlineId)
          if (wall) {
            // bounce_shot() in the original (Play.c:799) backs up the shot,
            // applies bounce physics, and calls set_life() (Play.c:944)
            updatedShot = bounceShotFunc(
              updatedShot,
              wall,
              walls,
              worldwidth,
              worldwrap
            )
          }
        }

        // 5. Handle strafe effect creation (Play.c:805-806)
        if (updatedShot.lifecount === 0 && updatedShot.strafedir >= 0) {
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
            x: updatedShot.x,
            y: updatedShot.y,
            lifecount: STRAFE_LIFE,
            rot: updatedShot.strafedir
          }
        }

        return updatedShot
      })
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

export const {
  initShipshot,
  doStrafes,
  startStrafe,
  moveShipshots,
  moveBullets,
  bunkShoot,
  clearAllShots
} = shotsSlice.actions

export default shotsSlice.reducer
