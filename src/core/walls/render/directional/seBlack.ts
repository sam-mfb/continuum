/**
 * @fileoverview Corresponds to se_black() from orig/Sources/Walls.c:867
 * Reference implementation using 68K emulator
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNeline } from '../lines/drawNeline'
import { build68kArch } from '@lib/asm/emulator'
import { findWAddress } from '@lib/asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { getAlignment } from '@core/shared/alignment'
import { getBackgroundPattern } from '@core/shared/backgroundPattern'

// Masks from orig/Sources/Walls.c:861-862
const SE_MASK = 0xf8000000
const SE_VAL = 0xc0000000

/**
 * Draws black parts of SE (South-East) lines
 * @see orig/Sources/Walls.c:867 se_black()
 */
export const seBlack =
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

    // C variables from lines 871-873
    let x = line.startx - scrx
    let y = line.starty - scry
    let len: number
    let eor: number
    let end: number, h1: number, h2: number, h3: number, h4: number, h5: number

    // Initialize h1 and h5 (lines 877-878)
    h1 = 0
    h5 = line.length + 1

    // Calculate h1 boundaries (lines 880-883)
    if (x + h1 < 0) {
      h1 = -x
    }
    if (y + h1 < 0) {
      h1 = -y
    }

    // Calculate h5 boundaries (lines 884-889)
    if (x + h5 > SCRWTH) {
      h5 = SCRWTH - x
    }
    if (y + h5 > VIEWHT) {
      h5 = VIEWHT - y
    }
    if (h1 >= h5) {
      return newScreen
    }

    // Calculate h4 (lines 890-894)
    h4 = line.h2 ?? h5
    if (h4 > h5) {
      h4 = h5
    }
    if (h4 < h1) {
      h4 = h1
    }

    // Calculate h2 (lines 895-899)
    h2 = line.h1 ?? h1
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h4) {
      h2 = h4
    }

    // Calculate h3 (lines 900-904)
    h3 = h4
    if (x + h3 > SCRWTH - 16) {
      h3 = SCRWTH - 16 - x
    }
    if (h3 < h2) {
      h3 = h2
    }

    // Update y and calculate segments (lines 906-908)
    y += SBARHT
    len = h3 - h2
    end = h4 - h3

    // Draw short black-only pieces (lines 910-913)
    if (h2 > h1) {
      newScreen = drawNeline({
        x: x + h1,
        y: y + h1,
        len: h2 - h1 - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }
    if (h5 > h4) {
      newScreen = drawNeline({
        x: x + h4,
        y: y + h4,
        len: h5 - h4 - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }

    // Update x,y for main drawing (lines 915-916)
    x += h2
    y += h2

    // Early exit if nothing to draw (lines 918-919)
    if (len <= 0 && end <= 0) {
      return newScreen
    }

    // Calculate EOR pattern (line 921)
    const align = getAlignment({
      screenX: scrx,
      screenY: scry,
      objectX: x,
      objectY: y
    })
    const pattern = getBackgroundPattern(align)
    eor = (pattern & SE_MASK) ^ SE_VAL

    // Main assembly section (lines 923-958)
    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D0: eor,
        D2: 64,
        D7: len // len
      },
      address: {
        A0: findWAddress(0, x, y)
      }
    })

    // andi.w #15, x
    const xShift = x & 15
    // ror.l x, eor
    asm.D0 = asm.instructions.ror_l(asm.D0, xShift)

    // subq.w #1, len
    asm.D7 -= 1

    if (asm.D7 >= 0) {
      // Main loop (@loop1)
      main_loop: while (true) {
        // eor.l eor, (A0)
        asm.instructions.eor_l(newScreen.data, asm.A0, asm.D0)
        // adda.l D2, A0
        asm.A0 += asm.D2
        // ror.l #1, eor
        const carry = asm.D0 & 1
        asm.D0 = asm.instructions.ror_l(asm.D0, 1)

        // dbcs len, @loop1
        // Branch if Carry Clear (carry === 0)
        if (carry === 0) {
          asm.D7--
          if (asm.D7 >= 0) {
            continue main_loop
          }
          // Counter expired, fall through
        }
        // Fall through if Carry Set (carry === 1) or counter expired

        // swap eor
        asm.D0 = asm.instructions.swap(asm.D0)
        // addq.w #2, A0
        asm.A0 += 2
        // subq.w #1, len
        asm.D7--
        // bge.s @loop1
        if (asm.D7 >= 0) {
          continue main_loop
        }
        // Fall through if counter expired

        // tst.b eor
        asm.instructions.tst_b(asm.D0)
        if (!asm.instructions.getFlag('zero')) {
          // bne.s @1
          // @1: subq.w #2, A0
          asm.A0 -= 2
        } else {
          // swap eor
          asm.D0 = asm.instructions.swap(asm.D0)
        }
        // bra.s @doend
        break main_loop
      }
    } else {
      // swap eor (for @doend)
      asm.D0 = asm.instructions.swap(asm.D0)
    }

    // @doend: Handle end section with 16-bit operations (lines 948-956)
    asm.D7 = end
    asm.D7 -= 1
    if (asm.D7 >= 0) {
      // The original assembly's `eor.w` instruction operates on the lower 16 bits
      // @loop2
      do {
        // eor.w eor, (A0)
        asm.instructions.eor_w(newScreen.data, asm.A0, asm.D0)
        // lsr.w #1, eor
        asm.D0 =
          (asm.D0 & 0xffff0000) | asm.instructions.lsr_w(asm.D0 & 0xffff, 1)
        // adda.l D2, A0
        asm.A0 += asm.D2
        // dbra len, @loop2
      } while (asm.instructions.dbra('D7'))
    }

    return newScreen
  }
