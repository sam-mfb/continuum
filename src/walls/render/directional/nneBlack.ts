/**
 * @fileoverview Corresponds to nne_black() from orig/Sources/Walls.c:27
 * Draws black parts of a NNE (north-north-east) line
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'
import { LINE_DIR } from '../../../shared/types/line'

export const nneBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps

    const x = line.startx - scrx
    const y = line.starty - scry
    let h1 = 0
    let h4 = line.length + 1

    if (h4 & 1) {
      h4++
    }

    if (x + (h1 >> 1) < 0) {
      h1 = -x << 1
    }
    if (y - h1 > VIEWHT - 1) {
      h1 = y - (VIEWHT - 1)
    }
    if (h1 & 1) {
      h1++
    }

    if (x + (h4 >> 1) > SCRWTH) {
      h4 = (SCRWTH - x) << 1
    }
    if (y - h4 < -1) {
      h4 = y + 1
    }

    if (h4 > h1) {
      // Call draw_nneline as in the original C code
      return drawNneline({
        x: x + (h1 >> 1),
        y: y - h1 + SBARHT,
        len: h4 - h1 - 1,
        dir: LINE_DIR.UP
      })(screen)
    }

    return screen
  }
