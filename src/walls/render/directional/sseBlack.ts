/**
 * @fileoverview Corresponds to sse_black() from orig/Sources/Walls.c:968
 * Reference implementation using 68K emulator
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'
import { build68kArch } from '../../../asm/emulator'
import { findWAddress, jsrWAddress } from '../../../asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { getBackground } from '../getBackground'

// Masks from orig/Sources/Walls.c:962-963
const SSE_MASK = 0xff000000
const SSE_VAL = 0xc0000000

/**
 * Draws black parts of SSE (South-South-East) lines
 * @see orig/Sources/Walls.c:968 sse_black()
 */
export const sseBlack =
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

    // C variables from lines 972-975
    let x = line.startx - scrx
    let y = line.starty - scry
    let len: number
    let eor1: number, eor2: number
    let start: number,
      end: number,
      startx: number,
      starty: number,
      startlen: number
    let h: number, h1: number, h2: number, h3: number, h4: number, h5: number

    // Initialize h1 and h5 (lines 979-980)
    h1 = 0
    h5 = line.length + 1

    // Calculate h1 boundaries (lines 982-993) - exact translation
    if (x + (h1 >> 1) < 0) {
      h1 = -x << 1
    }
    if (y + h1 < 0) {
      h1 = -y
    }
    if (h1 & 1) {
      h1++
    }
    if (x + (h5 >> 1) > SCRWTH - 1) {
      h5 = (SCRWTH - 1 - x) << 1
    }
    if (y + h5 > VIEWHT) {
      h5 = VIEWHT - y
    }
    if (h1 > h5) {
      h1 = h5
    }

    // Calculate h2 (lines 994-998)
    h2 = line.h1 ?? 0
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h5) {
      h2 = h5
    }

    // Calculate h4 (lines 999-1003)
    h4 = line.h2 ?? 0
    if (h4 < h1) {
      h4 = h1
    }
    if (h4 > h5) {
      h4 = h5
    }

    // Calculate h3 (lines 1004-1012)
    h3 = h4
    if (x + (h3 >> 1) > SCRWTH - 8) {
      h3 = (SCRWTH - 8 - x) << 1
      if (h3 & 1) {
        h3--
      }
    }
    if (h3 < h2) {
      h3 = h2
    }

    // Calculate start piece (lines 1014-1028)
    if (x >= 0) {
      startlen = 0
    } else {
      h = line.h1 ?? 0
      if (x + (h >> 1) < -7) {
        h = (-7 - x) << 1
      }
      if (y + h < 0) {
        h = -y
      }
      if (h & 1) {
        h++
      }
      startlen = h1 - h
      startx = x + (h >> 1) + 7
      starty = y + SBARHT + h
    }

    // Update y and calculate segments (lines 1030-1033)
    y += SBARHT
    start = h2 - h1
    len = h3 - h2
    end = h4 - h3

    // Draw short black-only pieces (lines 1035-1038)
    if (start > 0) {
      newScreen = drawNneline({
        x: x + (h1 >> 1),
        y: y + h1,
        len: start - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }
    if (h5 - h4 > 1) {
      newScreen = drawNneline({
        x: x + (h4 >> 1),
        y: y + h4,
        len: h5 - h4 - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }

    // Update x,y for main drawing (lines 1040-1041)
    x += h2 >> 1
    y += h2

    // Calculate EOR patterns (lines 1043-1044)
    const background = getBackground(x, y, scrx, scry)
    eor1 = (background[(x + y) & 1]! & SSE_MASK) ^ SSE_VAL
    eor2 = (background[1 - ((x + y) & 1)]! & SSE_MASK) ^ SSE_VAL

    // Main assembly section (lines 1046-1117)
    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D0: eor1,
        D1: eor2,
        D2: 128,
        D3: 0,
        D7: len, // len
        D6: x & 15 // x
      },
      address: {
        A0: findWAddress(0, x, y)
      }
    })

    // ror.l x, D0
    asm.D0 = asm.instructions.ror_l(asm.D0, asm.D6)
    // ror.l x, D1
    asm.D1 = asm.instructions.ror_l(asm.D1, asm.D6)

    // subq.w #1, len
    asm.D7 -= 1

    let pc = '' // Program Counter for our state machine

    if (asm.D7 < 0) {
      // blt.s @doend
      pc = 'doend'
    } else {
      pc = 'enterq' // bra.s @enterq
    }

    main_asm_loop: while (true) {
      switch (pc) {
        case 'quick': {
          asm.instructions.eor_l(newScreen.data, asm.A0, asm.D0)
          asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D1)
          asm.D0 = asm.instructions.ror_l(asm.D0, 1)
          asm.D1 = asm.instructions.ror_l(asm.D1, 1)
          asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 2, asm.D1)
          asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 3, asm.D0)
          asm.D0 = asm.instructions.ror_l(asm.D0, 1)
          asm.D1 = asm.instructions.ror_l(asm.D1, 1)
          asm.A0 += 64 * 4

          asm.instructions.tst_b(asm.D1)
          if (asm.instructions.getFlag('zero')) {
            // beq.s @enterq
            pc = 'enterq'
            continue main_asm_loop
          }

          asm.D0 = asm.instructions.swap(asm.D0)
          asm.D1 = asm.instructions.swap(asm.D1)
          asm.A0 += 2
          // fallthrough to @enterq
          pc = 'enterq'
          continue main_asm_loop
        }

        case 'enterq': {
          asm.D7 -= 4
          if (asm.D7 >= 0) {
            // bge.s @quick
            pc = 'quick'
            continue main_asm_loop
          }
          asm.D7 += 4
          // fallthrough to @loop1
          pc = 'loop1'
          continue main_asm_loop
        }

        case 'loop1': {
          asm.instructions.eor_l(newScreen.data, asm.A0, asm.D0)
          asm.D7 -= 1
          if (asm.D7 < 0) {
            // blt.s @leave
            pc = 'leave'
            continue main_asm_loop
          }
          asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D1)
          asm.A0 += asm.D2
          asm.D0 = asm.instructions.ror_l(asm.D0, 1)
          asm.D1 = asm.instructions.ror_l(asm.D1, 1)

          // swap D0, D1
          asm.D3 = asm.D0
          asm.D0 = asm.D1
          asm.D1 = asm.D3

          asm.instructions.tst_b(asm.D1)
          const zeroFlag = asm.instructions.getFlag('zero')

          // Faithful replication of: dbne len, @loop1
          const counter = asm.D7
          asm.D7-- // dbne always decrements the counter
          if (counter !== 0 && !zeroFlag) {
            pc = 'loop1'
            continue main_asm_loop
          }

          // If we are here, dbne failed. Now check: beq.s @doend
          if (zeroFlag) {
            pc = 'doend'
            continue main_asm_loop
          }

          // --- Fallthrough from both dbne and beq ---
          asm.D0 = asm.instructions.swap(asm.D0)
          asm.D1 = asm.instructions.swap(asm.D1)
          asm.A0 += 2

          // dbra len, @loop1
          // The counter D7 was already decremented by the dbne emulation above.
          if (asm.instructions.dbra('D7', false)) {
            pc = 'loop1'
            continue main_asm_loop
          }

          // bra.s @leave
          pc = 'leave'
          continue main_asm_loop
        }

        case 'doend': {
          asm.D0 = asm.instructions.swap(asm.D0)
          asm.D1 = asm.instructions.swap(asm.D1)
          asm.D7 = end
          asm.D7 -= 1
          if (asm.D7 < 0) {
            // blt.s @leave
            pc = 'leave'
            continue main_asm_loop
          }
          // fallthrough to @loop2
          pc = 'loop2'
          continue main_asm_loop
        }

        case 'loop2': {
          asm.instructions.eor_w(newScreen.data, asm.A0, asm.D0)

          // Correctly emulate lsr.w #1, D0 - it operates on the low word and zeros the high word.
          asm.D0 = asm.instructions.lsr_w(asm.D0 & 0xffff, 1)

          asm.D7 -= 1
          if (asm.D7 < 0) {
            // blt.s @leave
            pc = 'leave'
            continue main_asm_loop
          }

          asm.instructions.eor_w(newScreen.data, asm.A0 + 64, asm.D1)

          // Correctly emulate lsr.w #1, D1
          asm.D1 = asm.instructions.lsr_w(asm.D1 & 0xffff, 1)

          // swap D0, D1 - This happens *before* the address is incremented.
          asm.D3 = asm.D0
          asm.D0 = asm.D1
          asm.D1 = asm.D3

          asm.A0 += asm.D2

          // The counter D7 was already decremented above.
          if (asm.instructions.dbra('D7', false)) {
            // dbra len, @loop2
            pc = 'loop2'
            continue main_asm_loop
          }
          // fallthrough to leave
          pc = 'leave'
          continue main_asm_loop
        }

        case 'leave': {
          break main_asm_loop
        }
      }
    }

    // Start piece drawing (lines 1118-1137)
    len = startlen
    if (len > 0) {
      x = startx!
      y = starty!

      // JSR_WADDRESS
      asm.A0 = jsrWAddress(0, x, y)
      asm.D0 = 0x7fff
      asm.D0 = asm.instructions.lsr_w(asm.D0, x)
      len >>= 1

      // @lp loop - A standard dbra loop runs N+1 times.
      asm.D7 = len
      do {
        asm.instructions.and_w(newScreen.data, asm.A0, asm.D0)
        asm.instructions.and_w(newScreen.data, asm.A0 + 64, asm.D0)
        asm.D0 = asm.instructions.lsr_w(asm.D0, 1)
        asm.A0 += 128
      } while (asm.instructions.dbra('D7'))
    }

    return newScreen
  }
