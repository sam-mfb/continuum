/**
 * @fileoverview Shots module - Shot physics and collision detection
 */

// Core shot types
export * from './types'
export * from './constants'

// State management and actions
export {
  shotsSlice,
  initShipshot,
  clearAllShots,
  doStrafes,
  bunkShoot,
  moveBullets,
  clearBunkShots
} from './shotsSlice'

// Shot functions
export { aimDir } from './aimDir'
export { aimBunk } from './aimBunk'
export { bounceShot } from './bounceShot'
export { checkBunkerCollision } from './checkBunkerCollision'
export { checkShipCollision } from './checkShipCollision'
export { moveShot } from './moveShot'
export { xyindist } from './xyindist'
export { xyindistance } from './xyindistance'
export { startStrafe } from './startStrafe'
export { setLife } from './setLife'
export { isNewShot } from './isNewShot'
