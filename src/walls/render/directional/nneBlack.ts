/**
 * @fileoverview Corresponds to nne_black() from orig/Sources/Walls.c:27
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'
import { LINE_DIR } from '../../../shared/types/line'

/**
 * Draws black parts of NNE (North-North-East) lines
 * @see orig/Sources/Walls.c:27 nne_black()
 * @param deps - Dependencies object containing:
 *   @param line - Line record
 *   @param scrx - Screen x offset
 *   @param scry - Screen y offset
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const nneBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps
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
      return drawNneline({
        x: x + (h1 >> 1),
        y: y - h1 + SBARHT,
        len: h4 - h1 - 1,
        dir: LINE_DIR.UP
      })(newScreen)
    }

    return newScreen
  }
