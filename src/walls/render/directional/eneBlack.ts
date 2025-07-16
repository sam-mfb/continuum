/**
 * @fileoverview Corresponds to ene_black() from orig/Sources/Walls.c:341
 * Reference implementation using 68K emulator
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawEneline } from '../lines/drawEneline'
import { build68kArch } from '../../../asm/emulator'
import { jsrWAddress } from '../../../asm/assemblyMacros'
import { eneWhite } from './eneWhite'
import { LINE_DIR } from '../../../shared/types/line'

// Masks and values from orig/Sources/Walls.c:335-337
const ENE_VAL = 0xf000
const ENE_MASK1 = 0x8000
const ENE_MASK2 = 0x01ffffff

/**
 * Draws black parts of ENE (East-North-East) lines
 * @see orig/Sources/Walls.c:341 ene_black()
 */
export const eneBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps

    // First call eneWhite (line 349)
    const newScreen = eneWhite(deps)(screen)

    let x = line.startx - scrx
    let y = line.starty - scry
    let h1 = 0
    let h4 = line.length + 1

    // Calculate h1 boundaries (lines 356-361)
    if (x + h1 < 0) {
      h1 = -x
    }
    if (y - (h1 >> 1) > VIEWHT) {
      h1 = (y - VIEWHT) << 1
    }
    if (h1 & 1) {
      h1++
    }

    // Calculate h4 boundaries (lines 362-367)
    if (x + h4 > SCRWTH) {
      h4 = SCRWTH - x
    }
    if (y - (h4 >> 1) < 0) {
      h4 = y << 1
    }
    if (h4 & 1) {
      h4--
    }
    if (h4 <= h1) {
      return newScreen
    }

    // Calculate h3 (lines 370-376)
    let h3 = line.h2 ?? h4
    if (h3 > h4) {
      h3 = h4
    }
    if (h3 & 1) {
      h3--
    }
    if (h3 < h1) {
      h3 = h1
    }

    // Calculate h2 (lines 377-383)
    let h2 = h3
    if (x + h2 >= SCRWTH - 20) {
      h2 = SCRWTH - 21 - x
    }
    if (h2 & 1) {
      h2--
    }
    if (h2 < h1) {
      h2 = h1
    }

    const len = h2 - h1
    const end = h3 - h2
    const endline = h4 - h3
    y += SBARHT

    // Calculate endline coordinates (lines 390-397)
    let endlinex = x + h3 - 2
    let endliney = y - (h3 >> 1) + 1
    let adjustedEndline = endline
    if (endlinex < 0) {
      endlinex += 2
      endliney--
      adjustedEndline -= 2
    }

    x += h1
    y -= (h1 >> 1) + 1
    let adjustedLen = (len >> 1) - 1
    const adjustedEnd = end >> 1

    if (adjustedLen < 0) {
      adjustedLen = 0
    }

    // Assembly section (lines 407-485)
    const asm = build68kArch({
      data: {
        D0: 0,
        D1: 0,
        D2: 0,
        D3: 0
      },
      address: {
        A0: 0,
        A6: 0 // Stack frame pointer
      }
    })

    // move.l D3, -(SP) - save D3
    asm.D3 = 0 // We'll restore this at the end

    // JSR_WADDRESS
    asm.A0 = jsrWAddress(0, x, y)

    // moveq #64, D3
    asm.D3 = 64

    // cmp.w #SCRWTH-16-3, x
    if (x >= SCRWTH - 16 - 3) {
      // Special case for right edge
      // and.w #31, x
      const x_masked = x & 31
      
      // move.l #ENE_VAL<<16, D0
      asm.D0 = (ENE_VAL << 16) >>> 0
      
      // lsr.l x, D0
      asm.D0 = asm.instructions.lsr_l(asm.D0, x_masked)
      
      // move.l #ENE_MASK1<<16, D2
      asm.D2 = (ENE_MASK1 << 16) | 0 // Force to signed 32-bit
      
      // asr.l x, D2
      asm.D2 = asm.instructions.asr_l(asm.D2, x_masked)
      
      // cmp.w #16, x
      if (x_masked >= 16) {
        // subq.w #2, A0
        asm.A0 -= 2
      }
      
      // bra @endst - jump to end section
      // @endst
      asm.D7 = adjustedEnd
      // subq.w #1, len
      asm.D7 -= 1
      
      if (asm.D7 >= 0) {
        // @loop2
        do {
          // and.l D2, (A0)
          asm.instructions.and_l(newScreen.data, asm.A0, asm.D2)
          // or.l D0, (A0)
          asm.instructions.or_l(newScreen.data, asm.A0, asm.D0)
          // suba.l D3, A0
          asm.A0 -= asm.D3
          // asr.l #2, D2
          asm.D2 = asm.instructions.asr_l(asm.D2, 2)
          // lsr.l #2, D0
          asm.D0 = asm.instructions.lsr_l(asm.D0, 2)
        } while (asm.instructions.dbra('D7'))
      }
    } else {
      // Normal case
      // and.w #15, x
      const x_masked = x & 15
      
      // move.w #ENE_MASK1, D1
      asm.D1 = ENE_MASK1
      
      // asr.w x, D1
      asm.D1 = asm.instructions.asr_w(asm.D1, x_masked)
      
      // move.l #ENE_MASK2, D2
      asm.D2 = ENE_MASK2
      
      // lsr.l x, D2
      asm.D2 = asm.instructions.lsr_l(asm.D2, x_masked)
      
      // move.w #ENE_VAL, D0
      asm.D0 = ENE_VAL
      
      // ror.w x, D0
      asm.D0 = asm.instructions.ror_w(asm.D0, x_masked)
      
      // Set up len for loop
      asm.D7 = adjustedLen
      
      // bra.s @enter1
      let pc = 'enter1'
      
      main_loop: while (true) {
        switch (pc) {
          case 'loop1': {
            // @loop1
            // and.w D1, (A0)
            asm.instructions.and_w(newScreen.data, asm.A0, asm.D1)
            // or.w D0, (A0)
            asm.instructions.or_w(newScreen.data, asm.A0, asm.D0)
            // and.l D2, 2(A0)
            asm.instructions.and_l(newScreen.data, asm.A0 + 2, asm.D2)
            // suba.l D3, A0
            asm.A0 -= asm.D3
            // lsr.l #2, D2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 2)
            // asr.w #2, D1
            asm.D1 = asm.instructions.asr_w(asm.D1, 2)
            // ror.w #2, D0
            asm.D0 = asm.instructions.ror_w(asm.D0, 2)
            
            pc = 'enter1'
            continue
          }
          
          case 'enter1': {
            // @enter1 dbcs len, @loop1
            // dbcs decrements and branches if carry is clear
            // Carry is set by the previous ror.w #2 if bit 1 was 1
            const carrySet = asm.instructions.getFlag('carry')
            
            if (carrySet && asm.instructions.dbcs('D7')) {
              pc = 'loop1'
              continue
            }
            
            // subq.w #1, len
            asm.D7 -= 1
            
            // blt.s @endstuff
            if (asm.D7 < 0) {
              pc = 'endstuff'
              continue
            }
            
            // move.w D0, D1
            asm.D1 = asm.D0 & 0xffff
            // and.w #0xFF00, D1
            asm.D1 &= 0xff00
            
            // or.b D0, 1(A0)
            asm.instructions.or_b(newScreen.data, asm.A0 + 1, asm.D0)
            // and.l D2, 2(A0)
            asm.instructions.and_l(newScreen.data, asm.A0 + 2, asm.D2)
            // or.w D1, 2(A0)
            asm.instructions.or_w(newScreen.data, asm.A0 + 2, asm.D1)
            // suba.l D3, A0
            asm.A0 -= asm.D3
            // lsr.l #2, D2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 2)
            // ror.w #2, D0
            asm.D0 = asm.instructions.ror_w(asm.D0, 2)
            // asr.w #2, D1
            asm.D1 = asm.instructions.asr_w(asm.D1, 2)
            
            // subq.w #1, len
            asm.D7 -= 1
            
            // blt @leave
            if (asm.D7 < 0) {
              pc = 'leave'
              continue
            }
            
            // or.b D0, 1(A0)
            asm.instructions.or_b(newScreen.data, asm.A0 + 1, asm.D0)
            // and.l D2, 2(A0)
            asm.instructions.and_l(newScreen.data, asm.A0 + 2, asm.D2)
            // or.w D1, 2(A0)
            asm.instructions.or_w(newScreen.data, asm.A0 + 2, asm.D1)
            // suba.w #62, A0
            asm.A0 -= 62
            // lsr.l #2, D2
            asm.D2 = asm.instructions.lsr_l(asm.D2, 2)
            // swap D2
            asm.D2 = asm.instructions.swap(asm.D2)
            // not.w D2
            const d2Low = asm.D2 & 0xffff
            asm.D2 = (asm.D2 & 0xffff0000) | (~d2Low & 0xffff)
            // ror.w #2, D0
            asm.D0 = asm.instructions.ror_w(asm.D0, 2)
            
            // dbra len, @loop1
            if (asm.instructions.dbra('D7')) {
              pc = 'loop1'
              continue
            }
            
            // bra.s @leave
            pc = 'leave'
            continue
          }
          
          case 'endstuff': {
            // @endstuff
            // move.w D1, D2
            asm.D2 = asm.D1 & 0xffff
            // swap D2
            asm.D2 = asm.instructions.swap(asm.D2)
            // swap D0
            asm.D0 = asm.instructions.swap(asm.D0)
            // clr.w D0
            asm.D0 &= 0xffff0000
            
            pc = 'endst'
            continue
          }
          
          case 'endst': {
            // @endst
            // move.w end(A6), len
            asm.D7 = adjustedEnd
            // subq.w #1, len
            asm.D7 -= 1
            
            // blt.s @leave
            if (asm.D7 < 0) {
              pc = 'leave'
              continue
            }
            
            // @loop2
            do {
              // and.l D2, (A0)
              asm.instructions.and_l(newScreen.data, asm.A0, asm.D2)
              // or.l D0, (A0)
              asm.instructions.or_l(newScreen.data, asm.A0, asm.D0)
              // suba.l D3, A0
              asm.A0 -= asm.D3
              // asr.l #2, D2
              asm.D2 = asm.instructions.asr_l(asm.D2, 2)
              // lsr.l #2, D0
              asm.D0 = asm.instructions.lsr_l(asm.D0, 2)
            } while (asm.instructions.dbra('D7'))
            
            pc = 'leave'
            continue
          }
          
          case 'leave': {
            break main_loop
          }
        }
      }
    }

    // move.l (SP)+, D3 - restore D3
    asm.D3 = 0

    // Draw end line if needed (lines 486-487)
    if (adjustedEndline > 0) {
      return drawEneline({
        x: endlinex,
        y: endliney,
        len: adjustedEndline + 1,
        dir: LINE_DIR.UP
      })(newScreen)
    }

    return newScreen
  }