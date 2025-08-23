/**
 * @fileoverview Corresponds to ese_black() from orig/Sources/Walls.c:734
 * Reference implementation using 68K emulator
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { build68kArch } from '../../../asm/emulator'
import { jsrWAddress } from '../../../asm/assemblyMacros'
import { drawEseline } from '../lines/drawEseline'
import { getAlignment } from '@/shared/alignment'
import { getBackgroundPattern } from '@/shared/backgroundPattern'

// Masks from orig/Sources/Walls.c:728-729
const ESE_MASK = 0xfc000000
const ESE_VAL = 0x3c000000

/**
 * Draws black parts of ESE (East-South-East) lines
 * @see orig/Sources/Walls.c:734 ese_black()
 */
export const eseBlack =
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

    // C variables from lines 738-740
    let x = line.startx - scrx
    let y = line.starty - scry
    let eor1: number, eor2: number
    let h1: number, h2: number, h3: number, h4: number
    let startx: number, starty: number

    // Initialize h1 and h4 (lines 744-745)
    h1 = 0
    h4 = line.length - 1

    // Calculate h1 boundaries (lines 747-752)
    if (x + h1 < 2) {
      h1 = 2 - x
    }
    if (y + (h1 >> 1) < 0) {
      h1 = -y << 1
    }
    if (h1 & 1) {
      h1++
    }

    // Calculate h4 boundaries (lines 753-758)
    if (x + h4 > SCRWTH - 2) {
      h4 = SCRWTH - 2 - x
    }
    if (y + (h4 >> 1) > VIEWHT) {
      h4 = (VIEWHT - y) << 1
    }
    if (h4 & 1) {
      h4-- // ensure even
    }
    if (h4 <= h1) {
      return newScreen
    }

    // Calculate h2 (lines 761-768)
    h2 = 12
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h4) {
      h2 = h4
    }

    // Calculate h3 (lines 766-770)
    h3 = line.length - 5
    if (h3 > h4) {
      h3 = h4
    }
    if (h3 < h2) {
      h3 = h2
    }

    // Update y (line 772)
    y += SBARHT

    // Save start position (lines 774-775)
    startx = x + h1
    starty = y + (h1 >> 1)

    // Draw end line if needed (lines 777-778)
    if (h3 < h4) {
      drawEseline(newScreen, x + h3, y + (h3 >> 1), h4 - h3)
    }

    // Update position for main drawing (lines 780-781)
    x += h2 - 2
    y += h2 >> 1

    // Calculate EOR patterns (lines 783-784)
    const align1 = getAlignment({
      screenX: scrx,
      screenY: scry,
      objectX: x,
      objectY: y
    })
    const pattern1 = getBackgroundPattern(align1)
    eor1 = (pattern1 & ESE_MASK) ^ ESE_VAL

    const align2 = getAlignment({
      screenX: scrx,
      screenY: scry,
      objectX: x,
      objectY: y + 1
    })
    const pattern2 = getBackgroundPattern(align2)
    eor2 = (pattern2 & ESE_MASK) ^ ESE_VAL

    // Main assembly section (lines 786-829)
    if (h2 < h3) {
      // Create 68K emulator instance
      const asm = build68kArch({
        data: {
          D0: 0,
          D1: eor1,
          D2: eor2,
          D3: 0
        },
        address: {
          A0: jsrWAddress(0, x, y)
        }
      })

      // move.w x, D0
      asm.D0 = x
      // andi.w #15, D0
      asm.D0 &= 15
      // lsr.l D0, eor1
      asm.D1 = asm.instructions.lsr_l(asm.D1, asm.D0)
      // lsr.l D0, eor2
      asm.D2 = asm.instructions.lsr_l(asm.D2, asm.D0)
      // lsr.l #2, eor2
      asm.D2 = asm.instructions.lsr_l(asm.D2, 2)

      // move.w h3(A6), D2
      // sub.w h2(A6), D2
      // asr.w #1, D2
      asm.D3 = (h3 - h2) >> 1

      // bra.s @enterfa
      let pc = 'enterfa'

      main_loop: while (true) {
        switch (pc) {
          case 'fast': {
            // @fast: eor.l eor1, (A0)
            asm.instructions.eor_l(newScreen.data, asm.A0, asm.D1)
            // eor.l eor2, 64(A0)
            asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D2)
            // lsr.l #4, eor1
            asm.D1 = asm.instructions.lsr_l(asm.D1, 4)
            // lsr.l #4, eor2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 4)
            // eor.l eor1, 64*2(A0)
            asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 2, asm.D1)
            // eor.l eor2, 64*3(A0)
            asm.instructions.eor_l(newScreen.data, asm.A0 + 64 * 3, asm.D2)
            // lsr.l #4, eor1
            asm.D1 = asm.instructions.lsr_l(asm.D1, 4)
            // lsr.l #4, eor2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 4)
            // adda.w #64*4, A0
            asm.A0 += 64 * 4

            // tst.b eor2
            asm.instructions.tst_b(asm.D2)
            if (asm.instructions.getFlag('zero')) {
              // beq.s @enterfa (branch if zero)
              pc = 'enterfa'
              continue main_loop
            }

            // swap eor1
            asm.D1 = asm.instructions.swap(asm.D1)
            // swap eor2
            asm.D2 = asm.instructions.swap(asm.D2)
            // addq.w #2, A0
            asm.A0 += 2
            // fall through to @enterfa
            pc = 'enterfa'
            continue main_loop
          }

          case 'enterfa': {
            // @enterfa: subq.w #4, D2
            asm.D3 -= 4
            // bge.s @fast
            if (asm.D3 >= 0) {
              pc = 'fast'
              continue main_loop
            }

            // addq.w #4, D2
            asm.D3 += 4
            // bra.s @enter1
            pc = 'enter1'
            continue main_loop
          }

          case 'loop1': {
            // @loop1: eor.l eor1, (A0)
            asm.instructions.eor_l(newScreen.data, asm.A0, asm.D1)
            // subq.w #1, D2
            asm.D3 -= 1
            // blt.s @out
            if (asm.D3 < 0) {
              pc = 'out'
              continue main_loop
            }
            // eor.l eor2, 64(A0)
            asm.instructions.eor_l(newScreen.data, asm.A0 + 64, asm.D2)
            // adda.w #128, A0
            asm.A0 += 128
            // lsr.l #4, eor1
            asm.D1 = asm.instructions.lsr_l(asm.D1, 4)
            // lsr.l #4, eor2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 4)
            // fall through to @enter1
            pc = 'enter1'
            continue main_loop
          }

          case 'enter1': {
            // @enter1: dbra D2, @loop1
            if (asm.instructions.dbra('D3')) {
              pc = 'loop1'
              continue main_loop
            }
            // fall through to @out
            pc = 'out'
            continue main_loop
          }

          case 'out': {
            // @out
            break main_loop
          }
        }
      }
    }

    // Draw start line if needed (lines 832-833)
    if (h1 < h2) {
      drawEseline(newScreen, startx, starty, h2 - h1)
    }

    return newScreen
  }
