/**
 * @fileoverview Corresponds to ne_black() from orig/Sources/Walls.c:209
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNeline } from '../lines/drawNeline'
import { findWAddress, jsrWAddress } from '../../../asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { getBackground } from '../getBackground'
import { build68kArch } from '../../../asm/emulator'

// Masks from orig/Sources/Walls.c:203-204
const NE_MASK = 0xfffe0000
const NE_VAL = 0xc0000000

/**
 * Draws black parts of NE (North-East) lines
 * @see orig/Sources/Walls.c:209 ne_black()
 * @param deps - Dependencies object containing:
 *   @param line - Line record
 *   @param scrx - Screen x offset
 *   @param scry - Screen y offset
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const neBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps
    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    let x = line.startx - scrx
    let y = line.starty - scry
    let h1 = line.h1 ?? 0
    let h4 = line.length + 1

    // Calculate boundaries (lines 223-232)
    if (y - h1 >= VIEWHT) {
      h1 = y - (VIEWHT - 1)
    }
    if (y < h4) {
      h4 = y + 1
    }
    if (x + h1 < -14) {
      h1 = -14 - x
    }
    if (x + h4 > SCRWTH) {
      h4 = SCRWTH - x
    }
    if (h1 > h4) {
      h1 = h4
    }

    // Calculate h3 and h15 (lines 233-250)
    let h3 = line.h2 ?? 0
    if (h3 > h4) {
      h3 = h4
    }

    let h15 = h3
    if (x + h15 > 0) {
      h15 = -x
    }
    if (h15 < h1) {
      h15 = h1
    }

    const startlen = h15 - h1

    if (x + h15 < 0) {
      h15 = -x
    }
    if (h3 < h15) {
      h3 = h15
    }

    let h2 = h3
    if (x + h2 > SCRWTH - 15) {
      h2 = SCRWTH - 15 - x
    }
    if (h2 < h15) {
      h2 = h15
    }

    // Calculate h0 (lines 251-255)
    let h0 = 0
    if (x + h0 < 0) {
      h0 = -x
    }
    if (y - h0 >= VIEWHT) {
      h0 = y - (VIEWHT - 1)
    }

    y += SBARHT

    const startx = x + h1 + 14
    const starty = y - h1

    const len = h2 - h15
    const end = h3 - h2
    const endline = h4 - h3

    // Draw edge lines (lines 266-269)
    if (h1 - h0 > 1) {
      newScreen = drawNeline({
        x: x + h0,
        y: y - h0,
        len: h1 - h0 - 1,
        dir: LINE_DIR.UP
      })(newScreen)
    }
    if (endline > 0) {
      newScreen = drawNeline({
        x: x + h3,
        y: y - h3,
        len: endline - 1,
        dir: LINE_DIR.UP
      })(newScreen)
    }

    x += h15
    y -= h15

    // Calculate EOR pattern (line 274)
    const background = getBackground(scrx, scry)
    let eor = (background[(x + y) & 1]! & NE_MASK) ^ NE_VAL

    // Main drawing section - perfect emulation (lines 276-313)
    if (len > 0 || end > 0) {
      const asm = build68kArch()

      // FIND_WADDRESS(x,y)
      asm.A0 = findWAddress(0, x, y)
      asm.D2 = -64 // moveq #-64, D2

      // andi.w #15, x; ror.l x, eor
      const xAnd15 = x & 15
      eor = asm.instructions.ror_l(eor, xAnd15)

      // subq.w #1, len
      let lenCounter = len - 1

      // bge.s @loop1
      if (lenCounter >= 0) {
        // @loop1 main loop
        while (true) {
          // eor.l eor, (screen)
          // No bounds checking - trust h2 calculation
          const val = eor >>> 0
          newScreen.data[asm.A0]! ^= (val >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! ^= (val >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! ^= (val >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! ^= val & 0xff

          // adda.l D2, screen
          asm.A0 += asm.D2

          // ror.l #1, eor
          eor = asm.instructions.ror_l(eor, 1)

          // dbcs len, @loop1
          if (!asm.registers.flags.carryFlag) {
            lenCounter--
            if (lenCounter >= 0) {
              continue
            }
          }

          // Fallthrough when carry set or counter expires
          // swap eor
          eor = asm.instructions.swap(eor)
          // addq.w #2, screen
          asm.A0 += 2
          // subq.w #1, len
          lenCounter--
          // bge.s @loop1
          if (lenCounter >= 0) {
            continue
          }

          // Exit loop
          break
        }
      }

      // After main loop: tst.b eor
      if ((eor & 0xff) === 0) {
        // beq.s @1 -> swap eor
        eor = asm.instructions.swap(eor)
      } else {
        // bne.s @1 -> subq.w #2, screen
        asm.A0 -= 2
      }

      // @doend section - handle end with 16-bit operations
      if (end > 0) {
        // move.w end(A6), len
        // subq.w #1, len
        let endLen = end - 1

        // Extract lower 16 bits for word operations
        let eor16 = eor & 0xffff

        // @loop2
        for (let i = 0; i <= endLen; i++) {
          // eor.w eor, (screen)
          // No bounds checking - trust h2 calculation
          newScreen.data[asm.A0]! ^= (eor16 >>> 8) & 0xff
          newScreen.data[asm.A0 + 1]! ^= eor16 & 0xff
          // lsr.w #1, eor
          eor16 = (eor16 >>> 1) & 0xffff
          // adda.l D2, screen
          asm.A0 += asm.D2
        }
      }
    }

    // Handle start piece with AND operations (lines 314-331)
    if (startlen > 0) {
      const asm = build68kArch()

      // JSR_WADDRESS
      asm.A0 = jsrWAddress(0, startx, starty)

      // move.w #0x7FFF, D0
      // asr.w x, D0
      asm.D0 = asm.instructions.asr_w(0x7fff, startx & 15)

      // moveq #64, D1
      asm.D1 = 64

      // @lp loop with entry at bottom
      for (let i = 0; i <= startlen; i++) {
        // and.w D0, (A0)
        const mask = asm.D0 & 0xffff
        // No bounds checking - trust h1 calculation
        newScreen.data[asm.A0]! &= (mask >>> 8) & 0xff
        newScreen.data[asm.A0 + 1]! &= mask & 0xff
        // suba.l D1, A0
        asm.A0 -= asm.D1
        // lsr.w #1, D0
        asm.D0 = asm.instructions.lsr_w(asm.D0, 1)
      }
    }

    return newScreen
  }
