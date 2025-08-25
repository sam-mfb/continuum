import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// Constants from GW.h
const FUELSTART = 10000
const MAXFUEL = 25000
const CRITFUEL = 2000

// All possible status messages from Play.c
export type StatusMessage =
  | 'AUTOPILOT' // Play.c: shown during cartoon mode
  | 'MISSION COMPLETE' // Play.c: shown when planet completed
  | 'FUEL CRITICAL' // Play.c: shown when fuel < CRITFUEL
  | 'OUT OF FUEL' // Play.c: shown when fuel = 0
  | null // Play.c: no message

export type StatusState = {
  numships: number // Play.c: numships - number of player ships
  score: number // Play.c: score - current score
  planetbonus: number // Play.c: planetbonus - bonus countdown for current planet
  fuel: number // Play.c: fuel - current fuel
  currentlevel: number // Play.c: currentlevel - current level/planet
  curmessage: StatusMessage // Play.c: curmessage - current message being shown
  fuelold: number // Play.c: fuelold - # screens that need new fuel count
}

const initialState: StatusState = {
  numships: 3,
  score: 0,
  planetbonus: 0,
  fuel: FUELSTART,
  currentlevel: 1,
  curmessage: null,
  fuelold: 0
}

export const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    // Play.c: score_plus() - adds to score
    scorePlus: (state, action: PayloadAction<number>) => {
      state.score += action.payload
    },

    // Play.c: fuel_minus() - subtracts fuel and manages fuel messages
    fuelMinus: (state, action: PayloadAction<number>) => {
      state.fuel -= action.payload
      if (state.fuel < 0) {
        state.fuel = 0
      }
      if (state.fuel > MAXFUEL) {
        state.fuel = MAXFUEL
      }

      state.fuelold = 2 // two screens to write new value on

      // Handle fuel messages like original
      if (state.fuel >= CRITFUEL && state.curmessage === 'FUEL CRITICAL') {
        state.curmessage = null
      } else if (state.fuel === 0) {
        if (state.curmessage !== 'OUT OF FUEL') {
          state.curmessage = 'OUT OF FUEL'
        }
      } else if (
        state.fuel < CRITFUEL &&
        state.curmessage !== 'FUEL CRITICAL'
      ) {
        state.curmessage = 'FUEL CRITICAL'
      }
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

    // Play.c: when ship dies (numships--)
    shipDied: state => {
      if (state.numships > 0) {
        state.numships--
        state.fuel = FUELSTART
      }
    },

    // Play.c: when player gets extra ship (numships++)
    extraShip: state => {
      state.numships++
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
      state.numships = 3
      state.score = 0
      state.planetbonus = 0
      state.fuel = FUELSTART
      state.currentlevel = 1
      state.curmessage = null
      state.fuelold = 0
    }
  }
})

export const {
  scorePlus,
  fuelMinus,
  writeBonus,
  shipDied,
  extraShip,
  setMessage,
  setPlanetBonus,
  nextLevel,
  initStatus
} = statusSlice.actions

export const statusReducer = statusSlice.reducer
