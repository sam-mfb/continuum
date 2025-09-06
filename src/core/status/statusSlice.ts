import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// All possible status messages from Play.c
export type StatusMessage =
  | 'AUTOPILOT' // Play.c: shown during cartoon mode
  | 'MISSION COMPLETE' // Play.c: shown when planet completed
  | 'FUEL CRITICAL' // Play.c: shown when fuel < CRITFUEL
  | 'OUT OF FUEL' // Play.c: shown when fuel = 0
  | null // Play.c: no message

export type StatusState = {
  score: number // Play.c: score - current score
  planetbonus: number // Play.c: planetbonus - bonus countdown for current planet
  currentlevel: number // Play.c: currentlevel - current level/planet
  curmessage: StatusMessage // Play.c: curmessage - current message being shown
}

const initialState: StatusState = {
  score: 0,
  planetbonus: 0,
  currentlevel: 1,
  curmessage: null
}

export const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    // Play.c: score_plus() - adds to score
    scorePlus: (state, action: PayloadAction<number>) => {
      state.score += action.payload
    },

    // Play.c: write_bonus() - decrements bonus (called each frame)
    writeBonus: state => {
      if (state.planetbonus > 0) {
        state.planetbonus -= 10
        if (state.planetbonus < 0) {
          state.planetbonus = 0
        }
      }
    },

    // Play.c: set current message (curmessage = ...)
    setMessage: (state, action: PayloadAction<StatusMessage>) => {
      state.curmessage = action.payload
    },

    // Play.c: set planet bonus at start of level
    setPlanetBonus: (state, action: PayloadAction<number>) => {
      state.planetbonus = action.payload
    },

    // Play.c: advance to next level
    nextLevel: state => {
      state.currentlevel++
    },

    // Initialize for new game
    initStatus: state => {
      state.score = 0
      state.planetbonus = 0
      state.currentlevel = 1
      state.curmessage = null
    }
  }
})

export const {
  scorePlus,
  writeBonus,
  setMessage,
  setPlanetBonus,
  nextLevel,
  initStatus
} = statusSlice.actions

export const statusReducer = statusSlice.reducer
