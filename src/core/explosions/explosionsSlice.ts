import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ExplosionsState, ShardRec, SparkRec } from './types'
import type { GravityPoint } from '@core/shared/gravityVector'
import { gravityVector } from '@core/shared/gravityVector'
import {
  NUMSHARDS,
  NUMSPARKS,
  SH_SLOW,
  shotvecs,
  EXPLSHARDS,
  EXPLSPARKS,
  SHIPSPARKS,
  DEATH_FLASH_FRAMES
} from './constants'

const initializeShard = (): ShardRec => ({
  x: 0,
  y: 0,
  h: 0,
  v: 0,
  rot16: 0,
  rotspeed: 0,
  lifecount: 0,
  kind: 0
})

const initializeSpark = (): SparkRec => ({
  x: 0,
  y: 0,
  x8: 0,
  y8: 0,
  lifecount: 0,
  v: 0,
  h: 0
})

const initialState: ExplosionsState = {
  shards: Array.from({ length: NUMSHARDS }, initializeShard),
  sparks: Array.from({ length: NUMSPARKS }, initializeSpark),
  totalsparks: 0,
  sparksalive: 0,
  shipDeathFlashFrames: 0
}

export const explosionsSlice = createSlice({
  name: 'explosions',
  initialState,
  reducers: {
    /**
     * Start a bunker explosion (deterministic version)
     * Based on start_explosion() in Terrain.c:315
     */
    startExplosionWithRandom: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        dir: number
        kind: number
        shardRandom: Array<{
          xOffset: number
          yOffset: number
          lifetime: number
          angle: number
          speed: number
          rot16: number
          rotspeed: number
        }>
        sparkRandom: Array<{
          lifetime: number
          angle: number
          speed: number
        }>
      }>
    ) => {
      const { x, y, dir, kind, shardRandom, sparkRandom } = action.payload

      // Create 5 shards (Terrain.c:320-333)
      // Find oldest shards to replace
      let oldestLife = Number.MAX_SAFE_INTEGER
      let oldestIndices: number[] = []

      // Find the EXPLSHARDS oldest shards
      for (let needed = 0; needed < EXPLSHARDS; needed++) {
        let oldestIndex = -1
        oldestLife = Number.MAX_SAFE_INTEGER

        for (let i = 0; i < NUMSHARDS; i++) {
          const shard = state.shards[i]!
          if (shard.lifecount < oldestLife && !oldestIndices.includes(i)) {
            oldestLife = shard.lifecount
            oldestIndex = i
          }
        }

        if (oldestIndex !== -1) {
          oldestIndices.push(oldestIndex)
        }
      }

      // Initialize the shards
      for (let i = 0; i < oldestIndices.length; i++) {
        const shardIndex = oldestIndices[i]!
        const shard = state.shards[shardIndex]!
        const random = shardRandom[i]!

        // Set position with random distribution (Terrain.c:326-327)
        shard.x = x + random.xOffset
        shard.y = y + random.yOffset

        // Set lifetime (Terrain.c:325)
        shard.lifecount = random.lifetime

        // Use provided angle (Terrain.c:335-338)
        const angle = random.angle

        // Calculate velocity (Terrain.c:339-341)
        const speed = random.speed

        // Get velocity components from shotvecs table and multiply by speed
        // Note: velocity is stored as fixed-point with 8 bits of fraction
        shard.h = shotvecs[angle]! * speed
        shard.v = shotvecs[(angle + 24) & 31]! * speed

        // Set rotation and spin (Terrain.c:345-346)
        shard.rot16 = random.rot16
        shard.rotspeed = random.rotspeed

        // Set kind (Terrain.c:347-350)
        // Special logic for DIFF bunkers (kind 1) with even rotations
        if (kind === 1 && (dir & 1) === 0) {
          // Use special shard types 5 or 6 based on rotation
          shard.kind = dir & 3 ? 6 : 5
        } else {
          shard.kind = kind
        }
      }

      // Check ship explosion priority (Terrain.c:335-336)
      // If ship explosion is using all sparks, don't create bunker sparks
      if (state.totalsparks === NUMSPARKS && state.sparksalive > 0) {
        return
      }

      // Create 20 sparks with directional spread (Terrain.c:355-374)
      state.totalsparks = EXPLSPARKS
      state.sparksalive = EXPLSPARKS

      for (let i = 0; i < EXPLSPARKS && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!
        const random = sparkRandom[i]!

        // Set position (Terrain.c:367-368)
        spark.x8 = x << 3
        spark.y8 = y << 3
        spark.x = x
        spark.y = y

        // Set lifetime (Terrain.c:369)
        spark.lifecount = random.lifetime

        // Use provided angle (Terrain.c:370)
        const angle = random.angle & 511
        const intangle = angle >> 4
        const fracangle = angle & 15

        // Interpolate between adjacent shotvecs values for smooth angles
        const h1 = shotvecs[intangle & 31]!
        const h2 = shotvecs[(intangle + 1) & 31]!
        const baseH = h1 + ((fracangle * (h2 - h1)) >> 4)

        const yangle = (intangle + 24) & 31
        const v1 = shotvecs[yangle]!
        const v2 = shotvecs[(yangle + 1) & 31]!
        const baseV = v1 + ((fracangle * (v2 - v1)) >> 4)

        // Apply speed (Terrain.c:371-373)
        const speed = random.speed
        spark.h = (speed * baseH) >> 4
        spark.v = (speed * baseV) >> 4
      }
    },

    /**
     * Start ship death explosion (deterministic version)
     * Based on start_death() in Terrain.c:411
     */
    startShipDeathWithRandom: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        sparkRandom: Array<{
          lifetime: number
          angle: number
          speed: number
        }>
      }>
    ) => {
      const { x, y, sparkRandom } = action.payload

      // Set white flash flag (Terrain.c:413 - set_screen(front_screen, 0L))
      // This creates the "obnoxious" white screen flash effect
      state.shipDeathFlashFrames = DEATH_FLASH_FRAMES + 1

      // Ship explosions use 100 sparks, no shards (Terrain.c:415-423)
      // This is just a wrapper around start_blowup with ship-specific parameters
      state.totalsparks = SHIPSPARKS
      state.sparksalive = SHIPSPARKS

      // Convert to x8/y8 coordinates
      const x8 = x << 3
      const y8 = y << 3

      // Initialize all 100 sparks
      for (let i = 0; i < SHIPSPARKS && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!
        const random = sparkRandom[i]!

        spark.x8 = x8
        spark.y8 = y8
        spark.x = x
        spark.y = y

        // Set lifetime (35-55 frames)
        spark.lifecount = random.lifetime

        // Use provided angle (rand_shot(0, 511, shot))
        const angle = random.angle
        const intangle = angle >> 4 // Integer angle (0-31)
        const fracangle = angle & 15 // Fractional part for interpolation

        // Interpolate between adjacent shotvecs values for smooth angles
        const h1 = shotvecs[intangle & 31]!
        const h2 = shotvecs[(intangle + 1) & 31]!
        const baseH = h1 + ((fracangle * (h2 - h1)) >> 4)

        const yangle = (intangle + 24) & 31
        const v1 = shotvecs[yangle]!
        const v2 = shotvecs[(yangle + 1) & 31]!
        const baseV = v1 + ((fracangle * (v2 - v1)) >> 4)

        // Apply speed (minsp=16, addsp=SH_SP_SPEED16 from start_death)
        const speed = random.speed
        spark.h = (speed * baseH) >> 4
        spark.v = (speed * baseV) >> 4
      }
    },

    /**
     * Start generic spark explosion (deterministic version)
     * Based on start_blowup() in Terrain.c:424
     */
    startBlowupWithRandom: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        numspks: number
        sparkRandom: Array<{
          lifetime: number
          angle: number
          speed: number
        }>
      }>
    ) => {
      const { x, y, numspks, sparkRandom } = action.payload

      // Convert to x8/y8 coordinates (Terrain.c:431-432)
      const x8 = x << 3
      const y8 = y << 3

      // Set total sparks and sparks alive (Terrain.c:433)
      state.totalsparks = numspks
      state.sparksalive = numspks

      // Initialize sparks (Terrain.c:434-442)
      for (let i = 0; i < numspks && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!
        const random = sparkRandom[i]!

        spark.x8 = x8
        spark.y8 = y8
        spark.lifecount = random.lifetime

        // Use provided angle (rand_shot(0, 511, shot))
        const angle = random.angle
        const intangle = angle >> 4 // Integer angle (0-31)
        const fracangle = angle & 15 // Fractional part for interpolation

        // Interpolate between adjacent shotvecs values for smooth angles
        const h1 = shotvecs[intangle & 31]!
        const h2 = shotvecs[(intangle + 1) & 31]!
        const baseH = h1 + ((fracangle * (h2 - h1)) >> 4)

        const yangle = (intangle + 24) & 31
        const v1 = shotvecs[yangle]!
        const v2 = shotvecs[(yangle + 1) & 31]!
        const baseV = v1 + ((fracangle * (v2 - v1)) >> 4)

        // Calculate speed (Terrain.c:439)
        const speed = random.speed

        // Apply speed to velocity components (Terrain.c:440-441)
        spark.h = (speed * baseH) >> 4
        spark.v = (speed * baseV) >> 4

        // Update x,y from x8,y8
        spark.x = spark.x8 >> 3
        spark.y = spark.y8 >> 3
      }
    },

    /**
     * Update all explosions (shards and sparks)
     * Based on draw_explosions() in Terrain.c:447
     */
    updateExplosions: (
      state,
      action: PayloadAction<{
        worldwidth: number
        worldwrap: boolean
        gravx: number
        gravy: number
        gravityPoints?: GravityPoint[]
      }>
    ) => {
      const { worldwidth, gravx, gravy, gravityPoints = [] } = action.payload
      const worldwth8 = worldwidth << 3
      const worldwrap = action.payload.worldwrap

      // Update shards (Terrain.c:456-478)
      for (let i = 0; i < NUMSHARDS; i++) {
        const shard = state.shards[i]!
        if (shard.lifecount > 0) {
          // Decrement life (Terrain.c:458)
          shard.lifecount--

          // Apply drag/slow down (Terrain.c:459-460)
          shard.h -= shard.h >> SH_SLOW
          shard.v -= shard.v >> SH_SLOW

          // Apply gravity (Terrain.c:461-463)
          // Calculate gravity at shard position using gravityVector
          const gravity = gravityVector({
            x: shard.x,
            y: shard.y,
            gravx,
            gravy,
            gravityPoints,
            worldwidth,
            worldwrap
          })
          // Multiply by 4 for stronger effect on debris (Terrain.c:462-463)
          shard.h += gravity.xg << 2
          shard.v += gravity.yg << 2

          // Update position (Terrain.c:464-465)
          shard.x += shard.h >> 8
          shard.y += shard.v >> 8

          // Update rotation (Terrain.c:466)
          shard.rot16 = (shard.rot16 + shard.rotspeed) & 255
        }
      }

      // Update sparks (Terrain.c:482-502)
      if (state.sparksalive > 0) {
        for (let i = 0; i < state.totalsparks && i < NUMSPARKS; i++) {
          const spark = state.sparks[i]!
          if (spark.lifecount > 0) {
            // Decrement life and update sparksalive (Terrain.c:485)
            spark.lifecount--
            if (spark.lifecount === 0) {
              state.sparksalive--
            }

            // Apply drag (Terrain.c:486-487)
            spark.h -= (spark.h + 4) >> 3
            spark.v -= (spark.v + 4) >> 3

            // Update position (Terrain.c:488-489)
            spark.x8 += spark.h
            spark.y8 += spark.v

            // Handle world wrapping (Terrain.c:490-493)
            // Note: These are separate if statements in original, not else-if
            if (spark.x8 < 0) {
              spark.x8 += worldwth8
            }
            if (spark.x8 >= worldwth8) {
              spark.x8 -= worldwth8
            }

            // Kill spark if it goes above world (Terrain.c:491)
            if (spark.y8 < 0) {
              spark.lifecount = 0
            }

            // Update x,y from x8,y8 (Terrain.c:494-495)
            spark.x = spark.x8 >> 3
            spark.y = spark.y8 >> 3
          }
        }
      }
    },

    /**
     * Clear all explosions
     */
    clearExplosions: state => {
      state.shards = state.shards.map(() => initializeShard())
      state.sparks = state.sparks.map(() => initializeSpark())
      state.totalsparks = 0
      state.sparksalive = 0
    },

    /**
     * Clear the ship death flash after rendering one frame
     * This ensures the white flash only lasts one frame
     */
    decrementShipDeathFlash: state => {
      if (state.shipDeathFlashFrames > 0) {
        state.shipDeathFlashFrames--
      }
    },

    /**
     * Reset sparksalive when ship respawns
     * Based on init_ship() in Play.c:182
     *
     * The original game sets sparksalive = 0 on respawn but does NOT:
     * - Clear the sparks array
     * - Reset totalsparks
     * This fixes the bug where sparks going out of bounds north don't
     * properly decrement sparksalive, leaving bunker explosions blocked.
     */
    resetSparksAlive: state => {
      state.sparksalive = 0
      // Note: Intentionally not touching totalsparks or spark array data
      // to match original behavior exactly
    },

    /**
     * Clear shards when ship respawns
     * Based on init_ship() in Play.c:186-187
     *
     * The original game clears all shard lifecounts on respawn:
     * for(i=0; i<NUMSHARDS; i++) shards[i].lifecount = 0;
     */
    clearShards: state => {
      // Reset all shards by clearing their lifecount
      // We reinitialize the whole shard to ensure clean state
      state.shards = state.shards.map(() => initializeShard())
    }
  }
})

export const {
  startExplosionWithRandom,
  startShipDeathWithRandom,
  startBlowupWithRandom,
  updateExplosions,
  clearExplosions,
  decrementShipDeathFlash,
  resetSparksAlive,
  clearShards
} = explosionsSlice.actions

export const explosionsReducer = explosionsSlice.reducer
