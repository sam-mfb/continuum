/**
 * Ship containment logic
 * Based on contain_ship() from orig/Sources/Play.c:394-457
 *
 * This function handles:
 * 1. Keeping ship within screen margins
 * 2. Scrolling the screen when ship moves to edges
 * 3. Screen wrapping when world wraps
 * 4. Calculating global position from wrapped screen coordinates
 */
import {
  LEFTMARG,
  RIGHTMARG,
  TOPMARG,
  BOTMARG,
  SHIPHT,
  VIEWHT,
  SCRWTH
} from '@core/screen'

export type ContainmentResult = {
  shipx: number
  shipy: number
  screenx: number
  screeny: number
  dx: number
  dy: number
  globalx: number // Added: global position calculated from wrapped screen
  globaly: number // Added: matching Play.c:438-441
  on_right_side: boolean // Added: matching Play.c:443
}

type ShipInput = {
  shipx: number
  shipy: number
  dx: number
  dy: number
}

type ScreenInput = {
  screenx: number
  screeny: number
}

type WorldInput = {
  worldwidth: number
  worldheight: number
  worldwrap: boolean
}

/**
 * Pure function implementation of contain_ship from original Continuum
 * Handles ship containment within screen boundaries and world scrolling
 *
 * Note: The original used recursion. I believe this was to handle a specific
 * edge case where globalx was calculated before the hard boundary checks. If
 * the hard boundaries modified shipx, globalx would be stale. The recursion forced
 * a recalculation with the corrected position. Our implementation avoids
 * this by not calculating global position internally.
 */
export function containShip(
  ship: ShipInput,
  screen: ScreenInput,
  world: WorldInput
): ContainmentResult {
  let { shipx, shipy, dx, dy } = ship
  let { screenx, screeny } = screen
  const { worldwidth, worldheight, worldwrap } = world

  // From contain_ship() in Play.c:394-457
  /* hold ship inside of planet; if outside of screen, move screen rect */

  if (shipx < LEFTMARG) {
    screenx += shipx - LEFTMARG
    shipx = LEFTMARG
  } else if (shipx > RIGHTMARG) {
    screenx += shipx - RIGHTMARG
    shipx = RIGHTMARG
  }
  if (!worldwrap && screenx < 0) {
    shipx += screenx
    screenx = 0
  }
  if (!worldwrap && screenx > worldwidth - SCRWTH) {
    shipx += screenx - (worldwidth - SCRWTH)
    screenx = worldwidth - SCRWTH
  }

  if (screenx >= worldwidth) screenx -= worldwidth
  else if (screenx < 0) screenx += worldwidth

  if (shipy < TOPMARG) {
    screeny += shipy - TOPMARG
    shipy = TOPMARG
  } else if (shipy > BOTMARG) {
    screeny += shipy - BOTMARG
    shipy = BOTMARG
  }
  if (screeny < 0) {
    shipy += screeny
    screeny = 0
  } else if (screeny > worldheight - VIEWHT) {
    shipy += screeny - (worldheight - VIEWHT)
    screeny = worldheight - VIEWHT
  }

  // Calculate global position from wrapped screen coordinates (Play.c:438-441)
  // globalx = screenx + shipx;
  // if (globalx > worldwidth)
  //     globalx -= worldwidth;
  // globaly = screeny + shipy;
  let globalx = screenx + shipx
  if (globalx > worldwidth) {
    globalx -= worldwidth
  }
  const globaly = screeny + shipy

  // Calculate on_right_side flag (Play.c:443)
  // on_right_side = screenx > worldwidth - SCRWTH;
  const on_right_side = screenx > worldwidth - SCRWTH

  if (shipy < SHIPHT || shipy > VIEWHT - SHIPHT) {
    dy = 0
    shipy = shipy < SHIPHT ? SHIPHT : VIEWHT - SHIPHT
    // Note: Original has contain_ship() recursion here
  }
  if (shipx < SHIPHT || shipx > SCRWTH - SHIPHT) {
    dx = 0
    shipx = shipx < SHIPHT ? SHIPHT : SCRWTH - SHIPHT
    // Note: Original has contain_ship() recursion here
  }

  return {
    shipx,
    shipy,
    screenx,
    screeny,
    dx,
    dy,
    globalx,
    globaly,
    on_right_side
  }
}
