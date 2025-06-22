import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShotsState } from './types'

const initialState: ShotsState = {
  shipshots: [],
  bunkshots: []
}

export const shotsSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    fire: () => {},
    moveBullets: (state, action: PayloadAction<{ x: number; y: number }>) => {
      //
    },
    moveShipshots: () => {}
  }
})

function setLife() {}

function moveShot() {}

function backupShot() {}

function legalAngle() {}

function bounceShot() {}
