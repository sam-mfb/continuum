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
  shipshots: Array.from({ length: SHOT.NUMBULLETS }, initializeShot),
  bunkshots: Array.from({ length: SHOT.NUMSHOTS }, initializeShot)
}

export const shotsSlice = createSlice({
  name: 'shots',
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
        const sp = { ...state.shipshots[i]! }
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
    moveBullets: (
      state,
      action: PayloadAction<{ worldwidth: number; worldwrap: boolean }>
    ) => {
      state.shipshots = state.shipshots.map(s => moveShot(s, action.payload))
    },
    moveShipshots: () => {}
  }
})

function setLife(): void {}

function moveShot(
  shot: ShotRec,
  env: {
    worldwidth: number
    worldwrap: boolean
  }
): ShotRec {
  if (shot.lifecount <= 0) {
    return shot
  }
  let worldwth8: number
  let x: number
  let y: number

  const sp = { ...shot }

  worldwth8 = env.worldwidth << 3

  sp.lifecount--
  x = sp.x8
  y = sp.y8
  x += sp.h
  y += sp.v
  if (y < 0) sp.lifecount = 0
  if (x < 0)
    if (env.worldwrap) x += worldwth8
    else sp.lifecount = 0
  else if (x >= worldwth8)
    if (env.worldwrap) x -= worldwth8
    else sp.lifecount = 0
  sp.x8 = x
  sp.y8 = y
  x >>= 3
  y >>= 3
  sp.x = x
  sp.y = y
  return sp
}

// function backupShot() {}
//
// function legalAngle() {}
//
function bounceShot(): void {}
