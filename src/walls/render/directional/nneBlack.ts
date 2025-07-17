/**
 * @fileoverview Corresponds to nne_black() from orig/Sources/Walls.c:27
 * This is a new implementation using the 68k emulator to precisely match
 * the behavior of the original assembly code, which the C code simplified.
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { build68kArch } from '../../../asm/emulator'
import { findWAddress } from '../../../asm/assemblyMacros'

// These masks are derived from the patterns in nne_white and other wall functions.
const NNE_BLACK_MASK = 0xfff00000
const NNE_BLACK_MASK_START = 0x8000

export const nneBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps
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

    if (h4 <= h1) {
      return newScreen
    }

    const asm = build68kArch()
    asm.A0 = findWAddress(0, x + (h1 >> 1), y - h1 + SBARHT)
    asm.D7 = h4 - h1
    asm.D7 >>= 1
    asm.D7 -= 1

    const x_masked = (x + (h1 >> 1)) & 15
    asm.D0 = asm.instructions.ror_l(NNE_BLACK_MASK, -x_masked)
    asm.D1 = asm.instructions.ror_w(NNE_BLACK_MASK_START, x_masked)

    if (x_masked > 8) {
      asm.A0 += 2
    }

    while (asm.D7 >= 0) {
      asm.instructions.or_w(newScreen.data, asm.A0, asm.D1)
      asm.instructions.or_w(newScreen.data, asm.A0 - newScreen.rowBytes, asm.D1)

      const carry = (asm.D0 & 0x80000000) !== 0
      asm.D0 = asm.instructions.ror_l(asm.D0, -1)
      if (carry) {
        asm.D1 = asm.instructions.ror_w(asm.D1, 1)
        if ((asm.D1 & 0x8000) !== 0) {
          asm.A0 += 2
        }
      }
      asm.A0 -= newScreen.rowBytes * 2
      asm.D7 -= 1
    }

    return newScreen
  }