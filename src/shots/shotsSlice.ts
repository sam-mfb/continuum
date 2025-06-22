import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShotRec, ShotsState } from './types'
import { SHOT } from './constants'

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
  hitlineId: ''
})

const initialState: ShotsState = {
  shipshots: Array(SHOT.NUMBULLETS).map(initializeShot),
  bunkshots: Array(SHOT.NUMSHOTS).map(initializeShot)
}

export const shotsSlice = createSlice({
  name: 'ship',
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
      }>
    ) => {
      const { shielding, shiprot, dx, dy, globalx, globaly } = action.payload
      let i = 0
      for (i = 0; i < SHOT.NUMBULLETS && state.shipshots[i]!.lifecount; i++) {}

      if (i < SHOT.NUMBULLETS && !shielding) {
        const sp = state.shipshots[i]!
        const yrot = (shiprot + 24) & 31
        sp.h = SHOT.shotvecs[shiprot]! + (dx >> 5)
        sp.v = SHOT.shotvecs[yrot]! + (dy >> 5)
        sp.x8 = globalx << 3
        sp.y8 = globaly << 3
        sp.lifecount = SHOT.SHOTLEN
        sp.btime = 0
        setLife()
        if (sp.lifecount > 0) {
          sp.x8 += SHOT.shotvecs[shiprot]!
          sp.y8 += SHOT.shotvecs[yrot]!
          sp.lifecount--
        }
        if (sp.lifecount == 0) bounceShot()
        state.shipshots[i] = sp
      }
    },
    moveBullets: state => {
      state.shipshots = state.shipshots.map(moveShot)
    },
    moveShipshots: () => {}
  }
})

function setLife() {}

function moveShot(shot: ShotRec): ShotRec {
  return shot
}

// function backupShot() {}
//
// function legalAngle() {}
//
function bounceShot() {}
