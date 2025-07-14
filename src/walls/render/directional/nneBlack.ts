/**
 * @fileoverview Corresponds to nne_black() from orig/Sources/Walls.c:27
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'

// Line direction constants from Draw.c
const L_UP = 1 // Up direction

/**
 * Draws black parts of NNE (North-North-East) lines
 * @see orig/Sources/Walls.c:27 nne_black()
 */
export const nneBlack = (
  screen: MonochromeBitmap,
  line: LineRec,
  scrx: number,
  scry: number
): MonochromeBitmap => {
  // Deep clone the screen bitmap for immutability
  const newScreen: MonochromeBitmap = {
    data: new Uint8Array(screen.data),
    width: screen.width,
    height: screen.height,
    rowBytes: screen.rowBytes
  }

  const x = line.startx - scrx
  const y = line.starty - scry
  let h1 = 0
  let h4 = line.length + 1

  // Ensure h4 is even (lines 41-42)
  if (h4 & 1) {
    h4++
  }

  // Calculate h1 boundaries (lines 44-49)
  if (x + (h1 >> 1) < 0) {
    h1 = -x << 1
  }
  if (y - h1 > VIEWHT - 1) {
    h1 = y - (VIEWHT - 1)
  }
  if (h1 & 1) {
    h1++
  }

  // Calculate h4 boundaries (lines 50-53)
  if (x + (h4 >> 1) > SCRWTH) {
    h4 = (SCRWTH - x) << 1
  }
  if (y - h4 < -1) {
    h4 = y + 1
  }

  // Draw the line if valid (lines 55-56)
  if (h4 > h1) {
    drawNneline(
      newScreen,
      x + (h1 >> 1),
      y - h1 + SBARHT,
      h4 - h1 - 1,
      L_UP
    )
  }

  return newScreen
}

