/**
 * @fileoverview Corresponds to ene_black() from orig/Sources/Walls.c:341
 * Direct translation of assembly code using 68K emulator
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

    let len = h2 - h1
    const end = h3 - h2
    let endline = h4 - h3
    y += SBARHT

    // Calculate endline coordinates (lines 390-397)
    let endlinex = x + h3 - 2
    let endliney = y - (h3 >> 1) + 1
    if (endlinex < 0) {
      endlinex += 2
      endliney--
      endline -= 2
    }

    x += h1
    y -= (h1 >> 1) + 1
    len >>= 1
    len--
    const endParam = end >> 1

    if (len < 0) {
      len = 0
    }

    // Assembly section (lines 407-485)
    const asm = build68kArch()

    // move.l D3, -(SP) - save D3
    const savedD3 = asm.D3

    // JSR_WADDRESS
    asm.A0 = jsrWAddress(0, x, y)

    // moveq #64, D3
    asm.D3 = 64

    // cmp.w #SCRWTH-16-3, x
    if (x >= SCRWTH - 16 - 3) {
      // blt.s @normal - branch not taken, execute special case
      
      // and.w #31, x
      x &= 31
      
      // move.l #ENE_VAL<<16, D0
      asm.D0 = (ENE_VAL << 16) >>> 0
      
      // lsr.l x, D0
      asm.D0 = asm.instructions.lsr_l(asm.D0, x)
      
      // move.l #ENE_MASK1<<16, D2
      asm.D2 = (ENE_MASK1 << 16) >>> 0
      
      // asr.l x, D2
      asm.D2 = asm.instructions.asr_l(asm.D2, x)
      
      // cmp.w #16, x
      if (x >= 16) {
        // blt @endst - branch not taken
        // subq.w #2, A0
        asm.A0 -= 2
      }
      // bra @endst - jump to @endst
      
      // @endst
      // move.w end(A6), len
      asm.D7 = endParam
      
      // subq.w #1, len
      asm.D7 -= 1
      
      // blt.s @leave
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
          // dbra len, @loop2
        } while (asm.instructions.dbra('D7'))
      }
    } else {
      // @normal
      // and.w #15, x
      x &= 15
      
      // move.w #ENE_MASK1, D1
      asm.D1 = ENE_MASK1
      
      // asr.w x, D1
      asm.D1 = asm.instructions.asr_w(asm.D1, x)
      
      // move.l #ENE_MASK2, D2
      asm.D2 = ENE_MASK2
      
      // lsr.l x, D2
      asm.D2 = asm.instructions.lsr_l(asm.D2, x)
      
      // move.w #ENE_VAL, D0
      asm.D0 = ENE_VAL
      
      // ror.w x, D0
      asm.D0 = asm.instructions.ror_w(asm.D0, x)
      
      // Set up len for loop
      asm.D7 = len
      
      // bra.s @enter1
      let firstIteration = true
      
      while (true) {
        if (!firstIteration) {
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
        }
        
        firstIteration = false
        
        // @enter1 dbcs len, @loop1
        if (!asm.instructions.dbcs('D7')) {
          break
        }
      }
      
      // subq.w #1, len
      asm.D7 -= 1
      
      // blt.s @endstuff
      if (asm.D7 < 0) {
        // @endstuff
        // move.w D1, D2
        asm.D2 = asm.D1 & 0xffff
        // swap D2
        asm.D2 = asm.instructions.swap(asm.D2)
        // swap D0
        asm.D0 = asm.instructions.swap(asm.D0)
        // clr.w D0
        asm.D0 &= 0xffff0000
        
        // bra @endst - continue to @endst
      } else {
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
        if (asm.D7 >= 0) {
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
          asm.D2 = (asm.D2 & 0xffff0000) | ((~asm.D2) & 0xffff)
          // ror.w #2, D0
          asm.D0 = asm.instructions.ror_w(asm.D0, 2)
          
          // dbra len, @loop1
          if (asm.instructions.dbra('D7')) {
            // Continue loop1
            while (true) {
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
              
              // @enter1 dbcs len, @loop1
              if (!asm.instructions.dbcs('D7')) {
                break
              }
            }
            
            // subq.w #1, len
            asm.D7 -= 1
            
            // blt.s @endstuff
            if (asm.D7 < 0) {
              // @endstuff
              // move.w D1, D2
              asm.D2 = asm.D1 & 0xffff
              // swap D2
              asm.D2 = asm.instructions.swap(asm.D2)
              // swap D0
              asm.D0 = asm.instructions.swap(asm.D0)
              // clr.w D0
              asm.D0 &= 0xffff0000
            } else {
              // This path continues with more complex logic
              // For now we'll skip to @endst
            }
          }
        }
      }
      
      // @endst
      // move.w end(A6), len
      asm.D7 = endParam
      
      // subq.w #1, len
      asm.D7 -= 1
      
      // blt.s @leave
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
          // dbra len, @loop2
        } while (asm.instructions.dbra('D7'))
      }
    }

    // @leave move.l (SP)+, D3 - restore D3
    asm.D3 = savedD3

    // Draw end line if needed (lines 486-487)
    if (endline > 0) {
      return drawEneline({
        x: endlinex,
        y: endliney,
        len: endline + 1,
        dir: LINE_DIR.UP
      })(newScreen)
    }

    return newScreen
  }