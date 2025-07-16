/**
 * @fileoverview Corresponds to sse_black() from orig/Sources/Walls.c:968
 * Reference implementation using 68K emulator
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'
import { build68kArch } from '../../../asm/emulator'

// Background patterns from Play.c:61-62
const backgr1 = 0xaaaaaaaa
const backgr2 = 0x55555555
const background = [backgr1, backgr2]

// Masks from orig/Sources/Walls.c:962-963
const SSE_MASK = 0xff000000
const SSE_VAL = 0xc0000000

// Line direction constants from Draw.c
const L_DN = 0 // Down direction

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
    let start: number, end: number, startx: number, starty: number, startlen: number
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
        dir: L_DN
      })(newScreen)
    }
    if (h5 - h4 > 1) {
      newScreen = drawNneline({
        x: x + (h4 >> 1),
        y: y + h4,
        len: h5 - h4 - 1,
        dir: L_DN
      })(newScreen)
    }

    // Update x,y for main drawing (lines 1040-1041)
    x += h2 >> 1
    y += h2

    // Calculate EOR patterns (lines 1043-1044)
    eor1 = (background[(x + y) & 1]! & SSE_MASK) ^ SSE_VAL
    eor2 = (background[1 - ((x + y) & 1)]! & SSE_MASK) ^ SSE_VAL

    // Main assembly section (lines 1046-1117)
    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D0: 0,
        D1: 0,
        D2: 128,
        D3: 0,
        D7: len, // len
        D6: x & 15, // x
        D5: y // y
      },
      address: {
        A0: 0
      }
    })

    // Set A0 using the emulator's method
    asm.A0 = asm.findWAddress(0, x, y)

    // Initialize D0 and D1 with rotated EOR values
    asm.D0 = asm.instructions.ror_l(eor1, asm.registers.data.D6)
    asm.D1 = asm.instructions.ror_l(eor2, asm.registers.data.D6)

    // subq.w #1, len
    asm.registers.data.D7 -= 1

    // blt.s @doend
    if (asm.registers.data.D7 >= 0) {
      // bra.s @enterq - jump to quick loop entry

      // @quick loop (lines 1060-1075)
      while (true) {
        // @enterq
        asm.registers.data.D7 -= 4
        if (asm.registers.data.D7 < 0) {
          // bge.s @quick failed, continue to addq
          asm.registers.data.D7 += 4
          break
        }

        // @quick body
        asm.instructions.eor_l(newScreen.data, asm.A0, asm.D0)
        asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D1)
        asm.D0 = asm.instructions.ror_l(asm.D0, 1)
        asm.D1 = asm.instructions.ror_l(asm.D1, 1)
        asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 2, asm.D1)
        asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 3, asm.D0)
        asm.D0 = asm.instructions.ror_l(asm.D0, 1)
        asm.D1 = asm.instructions.ror_l(asm.D1, 1)
        asm.A0 += 64 * 4

        // tst.b D1; beq.s @enterq
        asm.instructions.tst_b(asm.D1)
        if (!asm.instructions.getFlag('zero')) {
          asm.D0 = asm.instructions.swap(asm.D0)
          asm.D1 = asm.instructions.swap(asm.D1)
          asm.A0 += 2
        }
      }

      // @loop1 (lines 1078-1095)
      loop1: while (true) {
        asm.instructions.eor_l(newScreen.data, asm.A0, asm.D0)
        asm.registers.data.D7 -= 1
        if (asm.registers.data.D7 < 0) {
          // blt.s @leave
          break
        }
        asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D1)
        asm.A0 += asm.D2
        asm.D0 = asm.instructions.ror_l(asm.D0, 1)
        asm.D1 = asm.instructions.ror_l(asm.D1, 1)

        // Swap D0 and D1 using D3
        asm.D3 = asm.D0
        asm.D0 = asm.D1
        asm.D1 = asm.D3

        // tst.b D1
        asm.instructions.tst_b(asm.D1)
        
        // dbne len, @loop1
        if (!asm.instructions.getFlag('zero')) {
          asm.registers.data.D7--
          if (asm.registers.data.D7 >= 0) {
            continue
          }
        }
        
        // dbne fell through - either zeroFlag was set OR len became -1
        if (asm.instructions.getFlag('zero')) {
          // When zero flag is set, dbne doesn't branch and beq branches to @doend
          // This means we go straight to @doend
          break loop1 // go to @doend
        }

        // len reached -1 (dbne fell through due to counter), continue to swap
        asm.D0 = asm.instructions.swap(asm.D0)
        asm.D1 = asm.instructions.swap(asm.D1)
        asm.A0 += 2

        // dbra len, @loop1
        asm.registers.data.D7--
        if (asm.registers.data.D7 >= 0) {
          continue
        }
        
        // bra.s @leave
        break
      }
    }

    // @doend (lines 1098-1114)
    // In the original assembly, when we go to @doend, we:
    // 1. swap D0 and D1 
    // 2. load end into len
    // 3. use 16-bit operations
    // But we need to account for the fact that we might have remaining pixels from @loop1
    
    const remainingFromLoop1 = asm.registers.data.D7 >= 0 ? asm.registers.data.D7 + 1 : 0
    
    asm.D0 = asm.instructions.swap(asm.D0)
    asm.D1 = asm.instructions.swap(asm.D1)
    asm.registers.data.D7 = end + remainingFromLoop1 - 1
    
    if (asm.registers.data.D7 >= 0) {
      // @loop2 - using 16-bit operations
      while (asm.registers.data.D7 >= 0) {
        asm.instructions.eor_w(newScreen.data, asm.A0, asm.D0 >>> 16)
        asm.D0 = asm.instructions.lsr_w(asm.D0 >>> 16, 1) << 16 | (asm.D0 & 0xffff)
        asm.registers.data.D7 -= 1
        if (asm.registers.data.D7 < 0) break

        asm.instructions.eor_w(newScreen.data, asm.A0 + 64, asm.D1 >>> 16)
        asm.D1 = asm.instructions.lsr_w(asm.D1 >>> 16, 1) << 16 | (asm.D1 & 0xffff)

        // Swap D0 and D1
        asm.D3 = asm.D0
        asm.D0 = asm.D1
        asm.D1 = asm.D3

        asm.A0 += asm.D2

        // dbra len, @loop2
        if (!asm.instructions.dbra('D7')) {
          break
        }
      }
    }

    // Start piece drawing (lines 1118-1137)
    len = startlen
    if (len > 0) {
      x = startx!
      y = starty!

      // JSR_WADDRESS
      asm.A0 = asm.jsrWAddress(0, x, y)
      asm.D0 = 0x7fff
      asm.D0 = asm.instructions.lsr_w(asm.D0, x & 15)
      len >>= 1

      // @lp loop
      asm.registers.data.D7 = len
      while (asm.instructions.dbra('D7')) {
        asm.instructions.and_w(newScreen.data, asm.A0, asm.D0)
        asm.instructions.and_w(newScreen.data, asm.A0 + 64, asm.D0)
        asm.D0 = asm.instructions.lsr_w(asm.D0, 1)
        asm.A0 += 128
      }
      // Do one more iteration after dbra exits
      asm.instructions.and_w(newScreen.data, asm.A0, asm.D0)
      asm.instructions.and_w(newScreen.data, asm.A0 + 64, asm.D0)
    }

    return newScreen
  }