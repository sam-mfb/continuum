/**
 * @fileoverview Corresponds to draw_neline() from orig/Sources/Draw.c:1230
 * Draws a northeast diagonal line (2 pixels wide, 1/8 slope)
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'
import { jsrBAddress } from '../../../asm/assemblyMacros'
import { build68kArch } from '../../../asm/emulator'

/**
 * Draw a northeast diagonal line (2 pixels wide, 1/8 slope)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: positive for down-right, negative for up-right
 * @see orig/Sources/Draw.c:1230 draw_neline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNeline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    let { x, y, len, dir } = deps

    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    const { data } = newScreen

    // Boundary check from original (line 1232)
    if (x + len + 1 >= SCRWTH) {
      len--
    }

    // asm block start (line 1234)
    if (len < 0) {
      return newScreen // blt @leave
    }

    const asm = build68kArch()
    const { instructions: i, registers: r } = asm

    // JSR_BADDRESS
    i.move_l('A0', jsrBAddress(0, x, y))
    // andi.w #7, x
    const bitPos = x & 7
    // move.b #3<<6, D0
    i.move_b('D0', 0x3 << 6) // 0xC0
    // lsr.b x, D0
    asm.D0 = i.lsr_b(asm.D0, bitPos)
    // move.w len(A6), D3
    i.move_w('D3', len)

    // move.w #64, D1
    i.move_w('D1', 64)
    // move.w #64*8, D2
    i.move_w('D2', 64 * 8)
    // tst.w dir(A6)
    i.tst_w(dir)
    // bgt @start
    if (dir <= 0) {
      // neg.w D1
      asm.D1 = i.neg_w(asm.D1)
      // neg.w D2
      asm.D2 = i.neg_w(asm.D2)
    }

    // @start: addq.w #1, D2
    i.addq_w('D2', 1)
    // cmp.b #1, D0
    i.cmp_b('D0', 1)
    // beq.s @skippre
    if (!i.beq()) {
      // @preloop:
      do {
        // or.b D0, (A0)
        i.or_b(data, asm.A0, asm.D0)
        // adda.w D1, A0
        i.adda_w('A0', asm.D1)
        // lsr.b #1, D0
        const tempD0 = asm.D0
        asm.D0 = i.lsr_b(asm.D0, 1)
        r.flags.carryFlag = (tempD0 & 1) === 1 // lsr sets carry
        // dbcs D3, @preloop
      } while (i.dbcs('D3'))
      // subq.w #1, D3
      i.subq_w('D3', 1)
      // blt @leave
      if ((asm.D3 & 0x8000) !== 0) return newScreen
    }

    // @skippre:
    // or.b D0, (A0)
    i.or_b(data, asm.A0, asm.D0)
    // addq.w #1, A0
    i.addq_w('A0', 1)
    // bset #7, (A0)
    i.bset_b(data, asm.A0, 7)
    // adda.w D1, A0
    i.adda_w('A0', asm.D1)
    // subq.w #1, D3
    i.subq_w('D3', 1)
    // blt @leave
    if ((asm.D3 & 0x8000) !== 0) return newScreen

    // move.w D3, D4
    i.move_w('D4', asm.D3)
    // and.w #7, D3
    i.andi_w('D3', 7)
    // asr.w #3, D4
    asm.D4 = i.asr_w(asm.D4, 3)
    // subq.w #1, D4
    i.subq_w('D4', 1)
    // blt.s @post
    if ((asm.D4 & 0x8000) === 0) {
      // if D4 >= 0
      // tst.w dir(A6)
      i.tst_w(dir)
      // blt.s @uploop
      if (i.blt()) {
        // @uploop:
        do {
          i.or_b(data, asm.A0, 0xc0)
          i.or_b(data, asm.A0 - 64 * 1, 0x60)
          i.or_b(data, asm.A0 - 64 * 2, 0x30)
          i.or_b(data, asm.A0 - 64 * 3, 0x18)
          i.or_b(data, asm.A0 - 64 * 4, 0x0c)
          i.or_b(data, asm.A0 - 64 * 5, 0x06)
          i.or_b(data, asm.A0 - 64 * 6, 0x03)
          i.or_b(data, asm.A0 - 64 * 7, 0x01)
          i.or_b(data, asm.A0 - 64 * 7 + 1, 0x80)
          i.adda_w('A0', asm.D2)
        } while (i.dbra('D4')) // dbf D4, @uploop
      } else {
        // @dnloop:
        do {
          i.or_b(data, asm.A0, 0xc0)
          i.or_b(data, asm.A0 + 64 * 1, 0x60)
          i.or_b(data, asm.A0 + 64 * 2, 0x30)
          i.or_b(data, asm.A0 + 64 * 3, 0x18)
          i.or_b(data, asm.A0 + 64 * 4, 0x0c)
          i.or_b(data, asm.A0 + 64 * 5, 0x06)
          i.or_b(data, asm.A0 + 64 * 6, 0x03)
          i.or_b(data, asm.A0 + 64 * 7, 0x01)
          i.or_b(data, asm.A0 + 64 * 7 + 1, 0x80)
          i.adda_w('A0', asm.D2)
        } while (i.dbra('D4')) // dbf D4, @dnloop
      }
    }

    // @post:
    i.move_w('D0', 0x00c0)
    // @postloop:
    // This loop structure is complex to replicate the exact flow of the original
    // assembly, which has a single exit point but multiple paths to loop.
    while (true) {
      i.or_b(data, asm.A0, asm.D0)
      i.adda_w('A0', asm.D1)
      const tempD0 = asm.D0
      asm.D0 = i.ror_w(asm.D0, 1)
      r.flags.carryFlag = (tempD0 & 1) === 1

      // This simulates the `dbcs D3, @postloop` instruction.
      // It branches back to the top of the while loop if carry is clear
      // and D3 has not reached -1.
      if (!r.flags.carryFlag) {
        asm.D3 = (asm.D3 - 1) & 0xffff
        if (asm.D3 !== 0xffff) {
          continue
        }
      }

      // This is the fallthrough path for the `dbcs` instruction.
      // It's also hit if carry was set.
      // The original assembly has an unconditional `subq.w #1, D3` here.
      i.subq_w('D3', 1)

      // This is the loop's only exit point, matching `blt.s @leave`
      if ((asm.D3 & 0x8000) !== 0) {
        break
      }

      // Logic for when the line crosses a byte boundary.
      // This is the `or.b D0, (A0)` that executes after the `blt.s` check.
      i.or_b(data, asm.A0, asm.D0)
      i.addq_w('A0', 1)
      asm.D0 = i.rol_w(asm.D0, 8)
      // The `while(true)` handles the unconditional `bra.s @postloop`
    }

    return newScreen
  }