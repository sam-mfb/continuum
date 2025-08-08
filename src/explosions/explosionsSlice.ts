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
  sparksalive: 0
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

        // Calculate velocity based on direction (Terrain.c:328-330)
        const tableIndex = dir >> 4 // Convert to 0-31 range
        const speed = SH_SPEED + Math.floor(Math.random() * SH_ADDSPEED)

        // Get velocity components from shotvecs table
        const baseH = shotvecs[tableIndex]!
        const baseV = shotvecs[(tableIndex + 24) & 31]!

        // Apply speed (multiply by 256 then divide by 16 = multiply by 16)
        shard.h = (speed * baseH) >> 4
        shard.v = (speed * baseV) >> 4

        // Set rotation and spin (Terrain.c:331-332)
        shard.rot16 = Math.floor(Math.random() * 256)
        shard.rotspeed = Math.floor(Math.random() * SH_SPIN2) - SH_SPIN2 / 2

        // Set kind (Terrain.c:333)
        shard.kind = kind
      }

      // Check ship explosion priority (Terrain.c:335-336)
      // If ship explosion is using all sparks, don't create bunker sparks
      if (state.totalsparks === NUMSPARKS && state.sparksalive > 0) {
        return
      }

      // Create 20 sparks with directional spread (Terrain.c:337-345)
      state.totalsparks = EXPLSPARKS
      state.sparksalive = EXPLSPARKS

      for (let i = 0; i < EXPLSPARKS && i < NUMSPARKS; i++) {
        const spark = state.sparks[i]!

        // Set position (Terrain.c:340)
        spark.x8 = x << 3
        spark.y8 = y << 3
        spark.x = x
        spark.y = y

        // Set lifetime (Terrain.c:341)
        spark.lifecount = SPARKLIFE + Math.floor(Math.random() * SPADDLIFE)

        // Directional spread in 180-degree arc facing shot (Terrain.c:342)
        // Original uses rand_shot(dir-128, dir+127, shot)
        const spreadAngle = dir + Math.floor(Math.random() * 256) - 128
        const tableIndex = (spreadAngle >> 4) & 31

        // Get velocity components
        const baseH = shotvecs[tableIndex]!
        const baseV = shotvecs[(tableIndex + 24) & 31]!

        // Apply speed (Terrain.c:343-344)
        const speed = SP_SPEED16 + Math.floor(Math.random() * SP_SPEED16)
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

        // Random 360-degree spread
        const angle = Math.floor(Math.random() * 512)
        const tableIndex = angle >> 4 // Convert to 0-31 range

        // Get base velocity components from shotvecs table
        const baseH = shotvecs[tableIndex & 31]!
        const baseV = shotvecs[(tableIndex + 24) & 31]!

        // Apply speed
        const speed = SH_SP_SPEED16
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
        const tableIndex = angle >> 4 // Convert to 0-31 range for shotvecs table

        // Get base velocity components from shotvecs table
        const baseH = shotvecs[tableIndex]!
        const baseV = shotvecs[(tableIndex + 24) & 31]!

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
        gravityVector: (x: number, y: number) => { xg: number; yg: number }
      }>
    ) => {
      const { worldwidth, gravityVector } = action.payload
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
          const { xg, yg } = gravityVector(shard.x, shard.y)
          shard.h += xg << 2
          shard.v += yg << 2

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
            if (spark.x8 < 0) {
              spark.x8 += worldwth8
            } else if (spark.x8 >= worldwth8) {
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
    }
  }
})

export const {
  startExplosion,
  startShipDeath,
  startBlowup,
  updateExplosions,
  clearExplosions
} = explosionsSlice.actions

export const explosionsReducer = explosionsSlice.reducer
