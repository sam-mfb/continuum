// Based on contain_ship() from orig/Sources/Play.c:394-457
import { LEFTMARG, RIGHTMARG, SHIPHT, VIEWHT, SCRWTH } from '@/screen/constants'

export type ContainmentResult = {
  shipx: number
  shipy: number
  screenx: number
  screeny: number
  dx: number
  dy: number
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
 */
export function containShip(
  ship: ShipInput,
  screen: ScreenInput,
  world: WorldInput
): ContainmentResult {
  let { shipx, shipy, dx, dy } = ship
  let { screenx, screeny } = screen
  const { worldwidth, worldwrap } = world

  // Handle horizontal scrolling with soft boundaries
  if (shipx < LEFTMARG) {
    screenx += shipx - LEFTMARG
    shipx = LEFTMARG
  } else if (shipx > RIGHTMARG) {
    screenx += shipx - RIGHTMARG
    shipx = RIGHTMARG
  }

  // Handle world boundaries for non-wrapping worlds
  if (!worldwrap && screenx < 0) {
    shipx += screenx
    screenx = 0
  }
  if (!worldwrap && screenx > worldwidth - SCRWTH) {
    shipx += screenx - (worldwidth - SCRWTH)
    screenx = worldwidth - SCRWTH
  }

  // Handle wrapping worlds
  if (worldwrap) {
    if (screenx >= worldwidth) {
      screenx -= worldwidth
    } else if (screenx < 0) {
      screenx += worldwidth
    }
  }

  // Hard screen edge constraints for ship
  if (shipx < SHIPHT) {
    shipx = SHIPHT
    dx = 0
  } else if (shipx > SCRWTH - SHIPHT) {
    shipx = SCRWTH - SHIPHT
    dx = 0
  }

  if (shipy < SHIPHT) {
    shipy = SHIPHT
    dy = 0
  } else if (shipy > VIEWHT - SHIPHT) {
    shipy = VIEWHT - SHIPHT
    dy = 0
  }

  return {
    shipx,
    shipy,
    screenx,
    screeny,
    dx,
    dy
  }
}