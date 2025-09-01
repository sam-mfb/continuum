import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ExplosionsState, ShardRec, SparkRec } from './types'
import {
  NUMSHARDS,
  NUMSPARKS,
  SH_SLOW,
  shotvecs,
  EXPLSHARDS,
  SH_DISTRIB,
  SH_LIFE,
  SH_ADDLIFE,
  SH_SPEED,
  SH_ADDSPEED,
  SH_SPIN2,
  EXPLSPARKS,
  SPARKLIFE,
  SPADDLIFE,
  SP_SPEED16,
  SHIPSPARKS,
  SH_SPARKLIFE,
  SH_SPADDLIFE,
  SH_SP_SPEED16
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
  shipDeathFlash: false
}

export const explosionsSlice = createSlice({
  name: 'explosions',
  initialState,
  reducers: {
    /**
     * Start a bunker explosion
     * Based on start_explosion() in Terrain.c:315
     */
    startExplosion: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        dir: number
        kind: number
      }>
    ) => {
      const { x, y, dir, kind } = action.payload

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

        // Set position with random distribution (Terrain.c:326-327)
        shard.x = x + Math.floor(Math.random() * SH_DISTRIB) - SH_DISTRIB / 2
        shard.y = y + Math.floor(Math.random() * SH_DISTRIB) - SH_DISTRIB / 2

        // Set lifetime (Terrain.c:325)
        shard.lifecount = SH_LIFE + Math.floor(Math.random() * SH_ADDLIFE)

        // Calculate angle based on bunker type (Terrain.c:335-338)
        let angle: number
        if (kind >= 2) {
          // BUNKROTKINDS = 2
          // Rotating bunkers: random direction
          angle = Math.floor(Math.random() * 32)
        } else {
          // Static bunkers: directional spread based on bunker rotation
          // dir is the bunker rotation (0-15) as passed from kill_bunker
          angle = (Math.floor(Math.random() * 15) - 7 + (dir << 1)) & 31
        }

        // Calculate velocity (Terrain.c:339-341)
        const speed = SH_SPEED + Math.floor(Math.random() * SH_ADDSPEED)

        // Get velocity components from shotvecs table and multiply by speed
        // Note: velocity is stored as fixed-point with 8 bits of fraction
        shard.h = shotvecs[angle]! * speed
        shard.v = shotvecs[(angle + 24) & 31]! * speed

        // Set rotation and spin (Terrain.c:345-346)
        shard.rot16 = Math.floor(Math.random() * 256)
        shard.rotspeed = Math.floor(Math.random() * SH_SPIN2) - SH_SPIN2 / 2

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

      // Calculate angle range for sparks (Terrain.c:355-364)
      let loangle: number, hiangle: number
      if (kind >= 2) {
        // BUNKROTKINDS = 2
        // Rotating bunkers: full 360 degree spread
        loangle = 0
        hiangle = 511
      } else {
        // Static bunkers: 180 degree spread based on direction
        // dir is the bunker rotation (0-15) as passed from kill_bunker
        loangle = ((dir - 4) & 15) << 5 // << 5 = * 32 to convert to 0-511 range
        hiangle = loangle + 256 // 180 degrees (256 = 512/2)
      }

      for (let i = 0; i < EXPLSPARKS && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!

        // Set position (Terrain.c:367-368)
        spark.x8 = x << 3
        spark.y8 = y << 3
        spark.x = x
        spark.y = y

        // Set lifetime (Terrain.c:369)
        spark.lifecount = SPARKLIFE + Math.floor(Math.random() * SPADDLIFE)

        // rand_shot(loangle, hiangle, shot) (Terrain.c:370)
        // Matches: angle = rint(hiangle-loangle+1) + loangle;
        const angle =
          (Math.floor(Math.random() * (hiangle - loangle + 1)) + loangle) & 511
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
        // speed = 8 + rint(SP_SPEED16)
        const speed = 8 + Math.floor(Math.random() * SP_SPEED16)
        spark.h = (speed * baseH) >> 4
        spark.v = (speed * baseV) >> 4
      }
    },

    /**
     * Start ship death explosion
     * Based on start_death() in Terrain.c:411
     */
    startShipDeath: (
      state,
      action: PayloadAction<{
        x: number
        y: number
      }>
    ) => {
      const { x, y } = action.payload

      // Set white flash flag (Terrain.c:413 - set_screen(front_screen, 0L))
      // This creates the "obnoxious" white screen flash effect
      state.shipDeathFlash = true

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
        spark.x8 = x8
        spark.y8 = y8
        spark.x = x
        spark.y = y

        // Set lifetime (35-55 frames)
        spark.lifecount =
          SH_SPARKLIFE + Math.floor(Math.random() * SH_SPADDLIFE)

        // Random 360-degree spread (rand_shot(0, 511, shot))
        const angle = Math.floor(Math.random() * 512)
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
        const speed = 16 + Math.floor(Math.random() * SH_SP_SPEED16)
        spark.h = (speed * baseH) >> 4
        spark.v = (speed * baseV) >> 4
      }
    },

    /**
     * Start generic spark explosion
     * Based on start_blowup() in Terrain.c:424
     */
    startBlowup: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        numspks: number
        minsp: number
        addsp: number
        minlife: number
        addlife: number
      }>
    ) => {
      const { x, y, numspks, minsp, addsp, minlife, addlife } = action.payload

      // Convert to x8/y8 coordinates (Terrain.c:431-432)
      const x8 = x << 3
      const y8 = y << 3

      // Set total sparks and sparks alive (Terrain.c:433)
      state.totalsparks = numspks
      state.sparksalive = numspks

      // Initialize sparks (Terrain.c:434-442)
      for (let i = 0; i < numspks && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!
        spark.x8 = x8
        spark.y8 = y8
        spark.lifecount = minlife + Math.floor(Math.random() * addlife)

        // rand_shot(0, 511, shot) - random direction across full circle
        const angle = Math.floor(Math.random() * 512)
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
        const speed = minsp + Math.floor(Math.random() * addsp)

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
      }>
    ) => {
      const { worldwidth, gravx, gravy } = action.payload
      const worldwth8 = worldwidth << 3

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
          // For now, using constant gravity - can be extended for position-dependent gravity later
          shard.h += gravx << 2
          shard.v += gravy << 2

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
      state.shipDeathFlash = false
    },

    /**
     * Clear the ship death flash after rendering one frame
     * This ensures the white flash only lasts one frame
     */
    clearShipDeathFlash: state => {
      state.shipDeathFlash = false
    }
  }
})

export const {
  startExplosion,
  startShipDeath,
  startBlowup,
  updateExplosions,
  clearExplosions,
  clearShipDeathFlash
} = explosionsSlice.actions

export const explosionsReducer = explosionsSlice.reducer
