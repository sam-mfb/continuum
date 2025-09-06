/**
 * Calculate gravity vector at a given position
 * Based on gravity_vector() in orig/Sources/Play.c:585-635
 *
 * This is a pure function implementation of the original gravity calculation.
 * The original used global variables, but we pass all dependencies as parameters.
 */

export type GravityPoint = {
  x: number
  y: number
  str: number // strength (negative for attraction)
}

export type GravityParams = {
  x: number
  y: number
  gravx: number // base gravity x component
  gravy: number // base gravity y component
  gravityPoints: GravityPoint[]
  worldwidth: number
  worldwrap: boolean
}

export function gravityVector(params: GravityParams): {
  xg: number
  yg: number
} {
  const { x, y, gravx, gravy, gravityPoints, worldwidth, worldwrap } = params

  // Start with base gravity (Play.c:592-593)
  let xforce = gravx
  let yforce = gravy

  const ww2 = worldwidth >> 1

  // Apply gravity from each gravity point (Play.c:595-635)
  for (const g of gravityPoints) {
    let dx = x - g.x

    // Handle world wrapping for distance calculation (Play.c:598-602)
    if (worldwrap) {
      if (dx > ww2) {
        dx -= worldwidth
      } else if (dx < -ww2) {
        dx += worldwidth
      }
    }

    const dy = y - g.y

    // The assembly code calculates distance squared and applies inverse square law
    // Play.c:604-634 (assembly implementation)
    let distSquared = dx * dx + dy * dy
    let forceDx = dx * g.str
    let forceDy = dy * g.str

    // The assembly shifts to keep values in range
    // asr.l #4, D1 and asl.l #4 for dx/dy (Play.c:613-615)
    distSquared = distSquared >> 4
    forceDx = forceDx << 4
    forceDy = forceDy << 4

    // Keep shifting down if distance squared is too large (Play.c:618-622)
    while (distSquared > 0x7fff) {
      distSquared = distSquared >> 4
      forceDx = forceDx >> 4
      forceDy = forceDy >> 4
    }

    // Only apply force if distance squared >= 8 (Play.c:624-625)
    if (distSquared >= 8) {
      // divs D1, dx and divs D1, dy (Play.c:627,630)
      // This implements inverse square law: force = strength / distance²
      xforce += Math.floor(forceDx / distSquared)
      yforce += Math.floor(forceDy / distSquared)
    }
  }

  return { xg: xforce, yg: yforce }
}
