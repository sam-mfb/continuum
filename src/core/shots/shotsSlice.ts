import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShotRec, ShotsState } from './types'
import { SHOT, NUMSTRAFES, STRAFE_LIFE } from './constants'
import type { Bunker } from '@core/planet/types'
import type { LineRec } from '@core/shared/types/line'
import { bunkShoot as bunkShootFn } from './bunkShoot'
import { setLife } from './setLife'
import { bounceShot as bounceShotFunc } from './bounceShot'
import { moveShot } from './moveShot'
import { checkBunkerCollision } from './checkBunkerCollision'
import { checkShipCollision } from './checkShipCollision'
import { startStrafe as startStrafeFunc } from './startStrafe'
import { xyindistance } from './xyindistance'
import { SHRADIUS } from '@core/ship/constants'

/**
 * Shot Lifecycle Architecture Note:
 *
 * The original C code rendered shots in the same loop iteration where they died
 * (lifecount dropped to 0), giving them one final frame of visibility. Our Redux
 * architecture separates state management from rendering, requiring explicit state
 * to preserve this behavior.
 *
 * We use a 'justDied' flag to indicate shots that died this frame and need one
 * final render. Shots with strafedir >= 0 are excluded from final rendering since
 * they're replaced by strafe visual effects.
 *
 * This maintains visual parity with the original while working within our
 * decoupled architecture.
 */

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
  hitlineId: '',
  justDied: false
})

const initialState: ShotsState = {
  shipshots: Array.from({ length: SHOT.NUMBULLETS }, initializeShot),
  bunkshots: Array.from({ length: SHOT.NUMSHOTS }, initializeShot),
  strafes: Array.from({ length: NUMSTRAFES }, () => ({
    x: 0,
    y: 0,
    lifecount: 0,
    rot: 0
  })),
  pendingBunkerKills: [],
  selfHitShield: false
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
        // Note: We initially preserve old x,y values from the existing shot,
        // but setLife() will sync them from x8,y8 to match the original's
        // get_life() behavior (Terrain.c:154-155)
        let newShot: ShotRec = {
          ...state.shipshots[i]!, // Keep old x,y values
          h: SHOT.shotvecs[shiprot]! + (dx >> 5),
          v: SHOT.shotvecs[yrot]! + (dy >> 5),
          x8: globalx << 3,
          y8: globaly << 3,
          lifecount: SHOT.SHOTLEN,
          btime: 0,
          strafedir: -1,
          hitlineId: '',
          justDied: false
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
          // Advance shot by one frame (Play.c:545-547)
          // Update sub-pixel coordinates only - x,y were already synced by setLife()
          const newX8 = newShot.x8 + SHOT.shotvecs[shiprot]!
          const newY8 = newShot.y8 + SHOT.shotvecs[yrot]!
          newShot = {
            ...newShot,
            x8: newX8,
            y8: newY8,
            x: newX8 >> 3, // Keep x,y in sync with x8,y8 after advancing
            y: newY8 >> 3,
            lifecount: newShot.lifecount - 1
          }
        }

        // Handle immediate wall collision (Play.c:549-550)
        if (newShot.lifecount === 0 && newShot.btime > 0) {
          // Find the wall that was hit
          const wall = walls.find(w => w.id === newShot.hitlineId)
          if (wall) {
            newShot = bounceShotFunc(
              newShot,
              wall,
              walls,
              worldwidth,
              worldwrap
            )
          }
        }

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

      // Clear previous collision results (Play.c:760-761)
      state.pendingBunkerKills = []
      state.selfHitShield = false // Reset self-hit flag

      // Process each active shot
      state.shipshots = state.shipshots.map(shot => {
        // Clear justDied flag from previous frame
        // This ensures shots are only rendered for one frame after death
        let updatedShot = { ...shot, justDied: false }

        // Skip completely dead shots (lifecount <= 0 from previous frames)
        if (shot.lifecount <= 0) {
          return updatedShot
        }

        // 1. Move the shot (Play.c:762)
        updatedShot = moveShot(updatedShot, { worldwidth, worldwrap })

        // Note: After move_shot(), lifecount might be 0 if we hit a wall,
        // but we still need to check for bounces. Don't return early here!

        // 2. Check bunker collisions (Play.c:763-784)
        // IMPORTANT: Check collision even if lifecount is 0 after moving!
        // The original checks collision at the final position regardless of lifecount.
        // This ensures shots that expire on their last frame can still hit targets.
        const bunkerResult = checkBunkerCollision(updatedShot, bunkers)
        if (bunkerResult.hit && bunkerResult.bunkerIndex !== undefined) {
          // Destroy the shot (Play.c:776-777)
          updatedShot.lifecount = 0
          updatedShot.btime = 0
          updatedShot.strafedir = -1

          // Add bunker to kill list (Play.c:778-782)
          // The killBunker action in planetSlice handles difficult bunkers
          state.pendingBunkerKills.push(bunkerResult.bunkerIndex)

          // One shot can only kill one bunker (Play.c:783)
          return updatedShot
        }

        // 3. Check ship collision - friendly fire (Play.c:785-795)
        // Like bunker collision, this also happens regardless of lifecount
        const shipResult = checkShipCollision(
          updatedShot,
          shipPosition,
          shipAlive
        )
        if (shipResult.hit) {
          // Set flag for shield feedback (Play.c:790)
          state.selfHitShield = true
          // Destroy the shot (Play.c:792)
          updatedShot.lifecount = 0
          updatedShot.btime = 0
          updatedShot.strafedir = -1
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
          // Use the startStrafe function instead of inline implementation
          // Note: In the original C code, start_strafe() was called directly
          state.strafes = startStrafeFunc(
            updatedShot.x,
            updatedShot.y,
            updatedShot.strafedir
          )(state.strafes)
        }

        // When shot dies, mark it as justDied for final frame rendering
        // Original C code (Play.c:750-814) rendered in same iteration as death,
        // but our decoupled architecture requires explicit state for this
        if (updatedShot.lifecount === 0 && shot.lifecount > 0) {
          updatedShot.justDied = true
        }

        return updatedShot
      })
    },
    moveBullets: (
      state,
      action: PayloadAction<{
        worldwidth: number
        worldwrap: boolean
        readonly walls: readonly LineRec[]
        // Ship-related fields for shield protection
        shipGlobalX?: number
        shipGlobalY?: number
        shielding?: boolean
      }>
    ) => {
      const {
        worldwidth,
        worldwrap,
        walls,
        shipGlobalX,
        shipGlobalY,
        shielding
      } = action.payload

      // Process each bunker shot with same justDied logic as ship shots
      state.bunkshots = state.bunkshots.map(shot => {
        // Clear justDied flag from previous frame
        let updatedShot = { ...shot, justDied: false }

        // Skip completely dead shots
        if (shot.lifecount <= 0) {
          return updatedShot
        }

        // Check shield protection BEFORE moving (Play.c:830-838)
        if (
          shielding &&
          shipGlobalX !== undefined &&
          shipGlobalY !== undefined
        ) {
          // Bounding box for optimization (Play.c:822-825)
          // Use SHRADIUS for shield protection bounding box
          const left = shipGlobalX - SHRADIUS // SHRADIUS = 12 (GW.h:77)
          const right = shipGlobalX + SHRADIUS
          const top = shipGlobalY - SHRADIUS
          const bot = shipGlobalY + SHRADIUS

          // Bounding box check first (Play.c:830-831)
          if (shot.x > left && shot.x < right && shot.y > top && shot.y < bot) {
            // Precise distance check (Play.c:832-833)
            // SHRADIUS = 12 (GW.h:77)
            if (
              xyindistance(shot.x - shipGlobalX, shot.y - shipGlobalY, SHRADIUS)
            ) {
              // Destroy bullet (Play.c:835-837)
              updatedShot.lifecount = 0 // Terminate bullet
              updatedShot.btime = 0 // Cancel bounce timer
              updatedShot.strafedir = -1 // Cancel strafing
              updatedShot.justDied = true // Mark for final frame render
              return updatedShot // Skip further processing
            }
          }
        }

        // Move the shot (only if not destroyed by shield)
        updatedShot = moveShot(updatedShot, { worldwidth, worldwrap })

        // Handle wall bounce (Play.c:839-843)
        // When shot hits a wall (lifecount==0) and has bounce time (btime>0)
        if (updatedShot.lifecount === 0 && updatedShot.btime > 0) {
          // Find the wall we hit
          const hitWall = walls.find(w => w.id === updatedShot.hitlineId)
          if (hitWall) {
            // Backup to exact wall position (move back one frame)
            updatedShot.x8 -= updatedShot.h
            updatedShot.y8 -= updatedShot.v
            updatedShot.x = updatedShot.x8 >> 3
            updatedShot.y = updatedShot.y8 >> 3

            // Calculate bounce (new velocity based on wall normal)
            updatedShot = bounceShotFunc(
              updatedShot,
              hitWall,
              walls,
              worldwidth,
              worldwrap
            )
          }
        }
        // Mark as justDied if it died this frame (and not bouncing)
        else if (updatedShot.lifecount === 0 && shot.lifecount > 0) {
          updatedShot.justDied = true
        }

        // Handle strafe effect creation for dead shots (Play.c:844 DRAW_SHOT macro)
        // Just like ship shots, bunker shots create strafes when hitting walls
        if (updatedShot.lifecount === 0 && updatedShot.strafedir >= 0) {
          state.strafes = startStrafeFunc(
            updatedShot.x,
            updatedShot.y,
            updatedShot.strafedir
          )(state.strafes)
        }

        return updatedShot
      })
    },
    bunkShoot: (
      state,
      action: PayloadAction<{
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
    },

    /**
     * Clear bunker shots when ship respawns
     * Based on init_ship() in Play.c:184-185
     *
     * The original game clears all bunker shots on respawn:
     * for(i=0; i<NUMSHOTS; i++) bunkshots[i].lifecount = 0;
     *
     * Note: Does NOT clear ship shots or strafes
     */
    clearBunkShots: state => {
      // Reset all bunk shots by clearing their lifecount
      // We reinitialize the whole shot to ensure clean state
      state.bunkshots = state.bunkshots.map(() => initializeShot())
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
  clearAllShots,
  clearBunkShots
} = shotsSlice.actions

export default shotsSlice.reducer
