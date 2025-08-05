import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ExplosionsState, ShardRec, SparkRec } from './types'
import { NUMSHARDS, NUMSPARKS, SH_SLOW, shotvecs } from './constants'

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
      _state,
      _action: PayloadAction<{
        x: number
        y: number
        dir: number
        kind: number
      }>
    ) => {
      // Implementation will be added later
    },

    /**
     * Start ship death explosion
     * Based on start_death() in Terrain.c:411
     */
    startShipDeath: (
      _state,
      _action: PayloadAction<{
        x: number
        y: number
      }>
    ) => {
      // Implementation will be added later
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
