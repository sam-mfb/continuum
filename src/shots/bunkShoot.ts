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
function followShot(
  bp: Bunker,
  sp: ShotRec,
  deps: {
    globalx: number
    globaly: number
    worldwidth: number
    worldwrap: boolean
  }
): void {
  const straight = aimBunk(bp, deps)
  let angle: number

  if (straight === 0) {
    /* if aiming at ship */
    angle = aimDir(bp, deps)
  } else {
    angle = (bp.rot * 45) >> 1
    const dang = aimDir(bp, deps) - angle
    if ((dang > 90 && dang < 270) || dang < -90) {
      angle += 180
    }
  }
  angle *= 64
  angle = Math.floor(angle / 45) /* *(512/360) => 0-511 */
  randShot(angle - 2, angle + 2, sp)
}

/**
 * Set shot velocity based on angle
 * See orig/Sources/Bunkers.c at rand_shot():193-209
 */
function randShot(loangle: number, hiangle: number, sp: ShotRec): void {
  let angle = rint(hiangle - loangle + 1) + loangle
  angle &= 511
  const intangle = angle >> 4
  angle &= 15
  const yangle = (intangle + 24) & 31

  sp.h =
    SHOT.shotvecs[intangle]! +
    ((angle *
      (SHOT.shotvecs[(intangle + 1) & 31]! - SHOT.shotvecs[intangle]!)) >>
      4)
  sp.v =
    SHOT.shotvecs[yangle]! +
    ((angle * (SHOT.shotvecs[(yangle + 1) & 31]! - SHOT.shotvecs[yangle]!)) >>
      4)
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
    let i = 0
    let sp: ShotRec | undefined
    for (i = 0; i < SHOT.NUMSHOTS && bunkshots[i]!.lifecount; i++);
    if (i === SHOT.NUMSHOTS) return bunkshots /* no space in shot array */
    sp = bunkshots[i]!

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

    for (i = 0; i < bunkrecs.length && bunkrecs[i]!.rot >= 0; i++) {
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
    for (i = 0; ; i++) {
      /* find n'th alive bunker */
      if ((sum -= eligible[i]!) < 0) {
        break
      }
    }
    const bp = bunkrecs[i]! /* bp points to the bunker */

    // Create the shot
    i = rint(2)
    if (bp.kind === BunkerKind.FOLLOW) {
      followShot(bp, sp, deps)
    } else {
      randShot(bp.ranges[i]!.low, bp.ranges[i]!.high, sp)
    }

    // Set shot position and properties
    sp.x8 = (bp.x + xbshotstart[bp.kind]![bp.rot]!) << 3
    sp.y8 = (bp.y + ybshotstart[bp.kind]![bp.rot]!) << 3
    sp.x = sp.x8 >> 3
    sp.y = sp.y8 >> 3
    sp.lifecount = SHOT.BUNKSHLEN
    sp.btime = 0
    // set_life(sp, NULL) - we'll handle hitlineId separately
    sp.hitlineId = ''

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

    return bunkshots
  }
}
