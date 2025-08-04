import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ExplosionsState, ShardRec, SparkRec } from './types'
import {
  NUMSHARDS,
  NUMSPARKS,
  EXPLSHARDS,
  EXPLSPARKS,
  SHIPSPARKS,
  SH_LIFE,
  SH_ADDLIFE,
  SH_SPEED,
  SH_ADDSPEED,
  SH_DISTRIB,
  SH_SPIN2,
  SPARKLIFE,
  SPADDLIFE,
  SH_SPARKLIFE,
  SH_SPADDLIFE,
  SP_SPEED16,
  SH_SP_SPEED16,
  shotvecs
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
      // Implementation will be added later
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
      // Implementation will be added later
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
      // Implementation will be added later
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