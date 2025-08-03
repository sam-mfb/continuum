import type { Bunker } from '@/planet/types'
import { BunkerKind } from '@/planet/types'
import type { ShotRec } from './types'
import { SHOT, xbshotstart, ybshotstart } from './constants'
import { SCRWTH, SOFTBORDER } from '@/screen/constants'
import { PLANET } from '@/planet/constants'
import { aimBunk } from './aimBunk'
import { aimDir } from './aimDir'
import { rint } from '@/shared/rint'

/**
 * Create a shot for following bunker
 * See orig/Sources/Bunkers.c at follow_shot():97-116
 */
function followShot(deps: {
  bp: Bunker
  globalx: number
  globaly: number
  worldwidth: number
  worldwrap: boolean
}): (sp: ShotRec) => ShotRec {
  return sp => {
    const straight = aimBunk(deps.bp, deps)
    let angle: number

    if (straight === 0) {
      /* if aiming at ship */
      angle = aimDir(deps.bp, deps)
    } else {
      angle = (deps.bp.rot * 45) >> 1
      const dang = aimDir(deps.bp, deps) - angle
      if ((dang > 90 && dang < 270) || dang < -90) {
        angle += 180
      }
    }
    angle *= 64
    angle = Math.floor(angle / 45) /* *(512/360) => 0-511 */

    return randShot({ loangle: angle - 2, hiangle: angle + 2 })(sp)
  }
}

/**
 * Set shot velocity based on angle
 * See orig/Sources/Bunkers.c at rand_shot():193-209
 */
function randShot(deps: {
  loangle: number
  hiangle: number
}): (sp: ShotRec) => ShotRec {
  return sp => {
    let angle = rint(deps.hiangle - deps.loangle + 1) + deps.loangle
    angle &= 511
    const intangle = angle >> 4
    angle &= 15
    const yangle = (intangle + 24) & 31

    const h =
      SHOT.shotvecs[intangle]! +
      ((angle *
        (SHOT.shotvecs[(intangle + 1) & 31]! - SHOT.shotvecs[intangle]!)) >>
        4)
    const v =
      SHOT.shotvecs[yangle]! +
      ((angle * (SHOT.shotvecs[(yangle + 1) & 31]! - SHOT.shotvecs[yangle]!)) >>
        4)

    return {
      ...sp,
      h,
      v
    }
  }
}

/**
 * Initialize shot position and properties based on bunker
 */
function initializeShot(deps: {
  bp: Bunker
  lifecount: number
}): (sp: ShotRec) => ShotRec {
  return sp => {
    const { bp, lifecount } = deps
    const x8 = (bp.x + xbshotstart[bp.kind]![bp.rot]!) << 3
    const y8 = (bp.y + ybshotstart[bp.kind]![bp.rot]!) << 3

    return {
      ...sp,
      x8,
      y8,
      x: x8 >> 3,
      y: y8 >> 3,
      lifecount,
      btime: 0,
      hitlineId: ''
    }
  }
}

/**
 * Calculate new bunker shot positions
 *
 * See orig/Sources/Bunkers.c at bunk_shoot():119-190
 */
export function bunkShoot(deps: {
  screenx: number
  screenr: number
  screeny: number
  screenb: number
  readonly bunkrecs: readonly Bunker[]
  worldwidth: number
  worldwrap: boolean
  globalx: number
  globaly: number
}): (bunkshots: ShotRec[]) => ShotRec[] {
  return bunkshots => {
    const { screenx, screenr, screeny, screenb, bunkrecs, worldwidth } = deps

    // Find first empty shot slot
    let shotIndex = 0
    let sp: ShotRec | undefined
    for (
      shotIndex = 0;
      shotIndex < SHOT.NUMSHOTS && bunkshots[shotIndex]!.lifecount;
      shotIndex++
    );
    if (shotIndex === SHOT.NUMSHOTS)
      return bunkshots /* no space in shot array */
    sp = bunkshots[shotIndex]!

    // Calculate screen boundaries for eligible bunkers
    const left = screenx - SHOT.SHOOTMARG
    const right = screenr + SHOT.SHOOTMARG
    let farleft = left
    if (farleft < 0) {
      farleft += worldwidth
    } else {
      farleft -= worldwidth
    }
    const farright = farleft + (SCRWTH + 2 * SHOT.SHOOTMARG)
    const top = screeny - SHOT.SHOOTMARG
    const bot = screenb + SHOT.SHOOTMARG

    // Build eligible bunker list with weights
    const eligible = new Array<number>(PLANET.NUMBUNKERS).fill(0)
    let sum = 0

    for (let i = 0; i < bunkrecs.length && bunkrecs[i]!.rot >= 0; i++) {
      const bp = bunkrecs[i]!
      if (
        bp.alive &&
        bp.y > top &&
        bp.y < bot &&
        ((bp.x > left && bp.x < right) || (bp.x > farleft && bp.x < farright))
      ) {
        let c = 1
        if (bp.kind === BunkerKind.GENERATOR) {
          c = 0
        } else if (bp.kind === BunkerKind.DIFF) {
          switch (bp.rot & 3) {
            case 0:
              c = 0
              break
            case 1:
            case 3:
              c = 2
              break
            case 2:
              c = 1
              break // default case implicitly gives c=1
          }
        }
        eligible[i] = c
        sum += c
      }
    }

    if (sum === 0) return bunkshots /* no bunker to shoot */

    // Select random weighted bunker
    sum = rint(sum)
    let bunkerIndex = 0
    for (bunkerIndex = 0; ; bunkerIndex++) {
      /* find n'th alive bunker */
      if ((sum -= eligible[bunkerIndex]!) < 0) {
        break
      }
    }
    const bp = bunkrecs[bunkerIndex]! /* bp points to the bunker */

    // Create the shot using transformer functions
    const rangeIndex = rint(2)

    // Create a new shot with velocity based on bunker type
    const velocityTransformer =
      bp.kind === BunkerKind.FOLLOW
        ? followShot({ bp, ...deps })
        : randShot({
            loangle: bp.ranges[rangeIndex]!.low,
            hiangle: bp.ranges[rangeIndex]!.high
          })

    // Apply transformations to create new shot
    const newShot = initializeShot({
      bp,
      lifecount: SHOT.BUNKSHLEN
    })(velocityTransformer(sp))

    // Update the shot in the array immutably
    const newBunkshots = [...bunkshots]
    newBunkshots[shotIndex] = newShot

    // Play sound based on bunker position
    for (let bunkx = bp.x; bunkx < worldwidth << 1; bunkx += worldwidth) {
      if (
        bunkx > screenx &&
        bunkx < screenr &&
        bp.y > screeny &&
        bp.y < screenb
      ) {
        //    startSound('BUNK_SOUND')
      } else if (
        bunkx > screenx - SOFTBORDER &&
        bunkx < screenr + SOFTBORDER &&
        bp.y > screeny - SOFTBORDER &&
        bp.y < screenb + SOFTBORDER
      ) {
        //   startSound('SOFT_SOUND')
      }
    }

    return newBunkshots
  }
}
