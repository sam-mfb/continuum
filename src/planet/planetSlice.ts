import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PlanetState } from './types'

const initialState: PlanetState = {
  worldwidth: 0,
  worldheight: 0,
  worldwrap: false,
  shootslow: 0,
  xstart: 0,
  ystart: 0,
  planetbonus: 0,
  gravx: 0,
  gravy: 0,
  numcraters: 0,
  lines: [],
  bunkers: [],
  fuels: [],
  craters: []
}

export const planetSlice = createSlice({
  name: 'planet',
  initialState,
  reducers: {
    loadPlanet: (_state, action: PayloadAction<PlanetState>) => {
      return action.payload
    }
  }
})
