/**
 * @fileoverview Corresponds to ne_black() from orig/Sources/Walls.c:209
 */

import type { LineRec, MonochromeBitmap } from '@core/walls'
import { VIEWHT, SCRWTH, SBARHT } from '@core/screen'
import { drawNeline } from '../lines/drawNeline'
import { findWAddress, jsrWAddress } from '@lib/asm/assemblyMacros'
import { LINE_DIR } from '@core/shared/types/line'
import { getAlignment } from '@core/shared'
import { getBackgroundPattern } from '@core/shared'
import { build68kArch } from '@lib/asm'

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

    let len = h2 - h15
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
    const align = getAlignment({
      screenX: scrx,
      screenY: scry,
      objectX: x,
      objectY: y
    })
    const pattern = getBackgroundPattern(align)
    let eor = (pattern & NE_MASK) ^ NE_VAL

    // Main drawing section - exact assembly (lines 276-313)
    if (len > 0 || end > 0) {
      const asm = build68kArch()

      // asm { (line 277)
      // FIND_WADDRESS(x,y) (line 279)
      asm.A0 = findWAddress(0, x, y)
      // move.l A0, screen (line 280)
      let screen = asm.A0
      // moveq #-64, D2 (line 281)
      const D2 = -64

      // andi.w #15, x (line 283)
      x = x & 15
      // ror.l x, eor (line 284)
      eor = asm.instructions.ror_l(eor, x)
      // subq.w #1, len (line 285)
      len = len - 1
      // bge.s @loop1 (line 286)
      if (len >= 0) {
        // @loop1: (line 290)
        loop1: while (true) {
          // eor.l eor, (screen) (line 290)
          const val = eor >>> 0
          newScreen.data[screen]! ^= (val >>> 24) & 0xff
          newScreen.data[screen + 1]! ^= (val >>> 16) & 0xff
          newScreen.data[screen + 2]! ^= (val >>> 8) & 0xff
          newScreen.data[screen + 3]! ^= val & 0xff

          // adda.l D2, screen (line 291)
          screen += D2
          // ror.l #1, eor (line 292)
          eor = asm.instructions.ror_l(eor, 1)
          // dbcs len, @loop1 (line 293)
          if (asm.registers.flags.carryFlag) {
            // Carry set, fall through
            break
          }
          len--
          if (len !== -1) {
            continue loop1
          }
          // Counter expired, fall through
          break
        }

        // swap eor (line 294)
        eor = asm.instructions.swap(eor)
        // addq.w #2, screen (line 295)
        screen += 2
        // subq.w #1, len (line 296)
        len--
        // bge.s @loop1 (line 297)
        while (len >= 0) {
          // Back to @loop1
          // eor.l eor, (screen) (line 290)
          const val = eor >>> 0
          newScreen.data[screen]! ^= (val >>> 24) & 0xff
          newScreen.data[screen + 1]! ^= (val >>> 16) & 0xff
          newScreen.data[screen + 2]! ^= (val >>> 8) & 0xff
          newScreen.data[screen + 3]! ^= val & 0xff

          // adda.l D2, screen (line 291)
          screen += D2
          // ror.l #1, eor (line 292)
          eor = asm.instructions.ror_l(eor, 1)
          // dbcs len, @loop1 (line 293)
          if (asm.registers.flags.carryFlag) {
            // swap eor (line 294)
            eor = asm.instructions.swap(eor)
            // addq.w #2, screen (line 295)
            screen += 2
            // subq.w #1, len (line 296)
            len--
            // bge.s @loop1 (line 297)
            continue
          }
          len--
          if (len === -1) {
            // swap eor (line 294)
            eor = asm.instructions.swap(eor)
            // addq.w #2, screen (line 295)
            screen += 2
            // subq.w #1, len (line 296)
            len--
            // bge.s @loop1 (line 297)
            break
          }
        }

        // tst.b eor (line 298)
        if ((eor & 0xff) !== 0) {
          // bne.s @1 (line 299)
          // subq.w #2, screen (line 300)
          screen -= 2
          // bra.s @doend (line 301)
        } else {
          // beq.s @1 (line 299)
          // @1: swap eor (line 302)
          eor = asm.instructions.swap(eor)
        }
      } else {
        // swap eor (line 287)
        eor = asm.instructions.swap(eor)
        // bra.s @doend (line 288)
      }

      // @doend: (line 304)
      // move.w end(A6), len (line 304)
      len = end
      // subq.w #1, len (line 305)
      len--
      // blt.s @leave (line 306)
      if (len >= 0) {
        // @loop2: (line 308)
        for (let i = 0; i <= len; i++) {
          // eor.w eor, (screen) (line 308)
          const eor16 = eor & 0xffff
          newScreen.data[screen]! ^= (eor16 >>> 8) & 0xff
          newScreen.data[screen + 1]! ^= eor16 & 0xff
          // lsr.w #1, eor (line 309)
          eor = (eor & 0xffff0000) | ((eor & 0xffff) >>> 1)
          // adda.l D2, screen (line 310)
          screen += D2
          // dbra len, @loop2 (line 311)
        }
      }
      // @leave: (line 312)
      // } (line 313)
    }

    // Lines 314-331
    x = startx
    y = starty
    len = startlen
    if (len > 0) {
      // asm { (line 318)
      const asm = build68kArch()

      // JSR_WADDRESS (line 320)
      asm.A0 = jsrWAddress(0, x, y)

      // move.w #0x7FFF, D0 (line 322)
      asm.D0 = 0x7fff
      // asr.w x, D0 (line 323)
      asm.D0 = asm.instructions.asr_w(asm.D0, x)
      // moveq #64, D1 (line 324)
      const D1 = 64
      // bra.s @enterlp (line 325)

      // @lp: (line 327)
      // @enterlp: dbra len, @lp (line 330)
      for (let i = len; i >= 0; i--) {
        // and.w D0, (A0) (line 327)
        const mask = asm.D0 & 0xffff
        newScreen.data[asm.A0]! &= (mask >>> 8) & 0xff
        newScreen.data[asm.A0 + 1]! &= mask & 0xff
        // suba.l D1, A0 (line 328)
        asm.A0 -= D1
        // lsr.w #1, D0 (line 329)
        asm.D0 = asm.instructions.lsr_w(asm.D0, 1)
      }
      // } (line 331)
    }

    return newScreen
  }
