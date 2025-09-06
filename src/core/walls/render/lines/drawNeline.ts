/**
 * @fileoverview Corresponds to draw_neline() from orig/Sources/Draw.c:1136
 * Draws a northeast diagonal line (2 pixels wide, 1/8 slope)
 */

import type { MonochromeBitmap } from '../../types'
import { build68kArch } from '@lib/asm'
import { jsrBAddress } from '@lib/asm/assemblyMacros'
import { SCRWTH } from '../../../screen/constants'

/**
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: positive for down-right, negative for up-right
 * @see orig/Sources/Draw.c:1136 draw_neline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNeline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    let { x, y, len, dir } = deps

    // Check bounds and adjust length if needed
    if (x + len + 1 >= SCRWTH) {
      len--
    }

    // Create 68k emulator context
    const asm = build68kArch()

    // Get byte address using JSR_BADDRESS
    asm.A0 = jsrBAddress(0, x, y)

    // Isolate the bit position within the byte
    x = x & 7

    // Create initial mask: move.b #3<<6, D0 gives 0xC0
    // lsr.b x, D0 shifts right by x bits
    let D0 = (0xc0 >> x) & 0xff // D0 holds or mask
    let D3 = len

    if (D3 < 0) return newScreen

    // Set up direction increments
    let D1 = 64 // Row increment
    let D2 = 64 * 8 // 8-row increment

    // Negate increments if going up
    if (dir <= 0) {
      D1 = -D1
      D2 = -D2
    }

    // Adjust for stepping to the right
    D2 += 1

    // Skip pre-loop if already at byte boundary
    if (D0 !== 1) {
      // Pre-loop: draw pixels until we reach byte boundary
      while (true) {
        // or.b D0, (A0)
        newScreen.data[asm.A0]! |= D0

        // adda.w D1, A0
        asm.A0 += D1

        // lsr.b #1, D0
        const carry = D0 & 0x01 // Save carry before shift
        D0 = (D0 >> 1) & 0xff

        // dbcs D3, @preloop
        if (carry === 0) {
          // Carry set means continue loop
          D3--
          if (D3 < 0) {
            return newScreen // Exit if D3 becomes negative
          }
        } else {
          break // Carry clear means exit loop
        }
      }

      // dbcc missed this!
      D3--
      if (D3 < 0) return newScreen
    }

    // Skip pre: draw cross-byte pixel
    // or.b D0, (A0)
    newScreen.data[asm.A0]! |= D0

    // addq.w #1, A0
    asm.A0++

    // bset #7, (A0)
    newScreen.data[asm.A0]! |= 0x80

    // adda.w D1, A0
    asm.A0 += D1

    // subq.w #1, D3
    D3--
    if (D3 < 0) return newScreen

    // Calculate loop counts
    const D4 = Math.floor(D3 / 8) - 1 // Times through big loop
    D3 = D3 & 7 // Remaining pixels

    if (D4 >= 0) {
      if (dir > 0) {
        // Down loop
        for (let i = 0; i <= D4; i++) {
          newScreen.data[asm.A0]! |= 0xc0
          newScreen.data[asm.A0 + 64 * 1]! |= 0x60
          newScreen.data[asm.A0 + 64 * 2]! |= 0x30
          newScreen.data[asm.A0 + 64 * 3]! |= 0x18
          newScreen.data[asm.A0 + 64 * 4]! |= 0x0c
          newScreen.data[asm.A0 + 64 * 5]! |= 0x06
          newScreen.data[asm.A0 + 64 * 6]! |= 0x03
          newScreen.data[asm.A0 + 64 * 7]! |= 0x01
          newScreen.data[asm.A0 + 64 * 7 + 1]! |= 0x80
          asm.A0 += D2
        }
      } else {
        // Up loop
        for (let i = 0; i <= D4; i++) {
          newScreen.data[asm.A0]! |= 0xc0
          newScreen.data[asm.A0 - 64 * 1]! |= 0x60
          newScreen.data[asm.A0 - 64 * 2]! |= 0x30
          newScreen.data[asm.A0 - 64 * 3]! |= 0x18
          newScreen.data[asm.A0 - 64 * 4]! |= 0x0c
          newScreen.data[asm.A0 - 64 * 5]! |= 0x06
          newScreen.data[asm.A0 - 64 * 6]! |= 0x03
          newScreen.data[asm.A0 - 64 * 7]! |= 0x01
          newScreen.data[asm.A0 - 64 * 7 + 1]! |= 0x80
          asm.A0 += D2
        }
      }
    }

    // Post loop: draw remaining pixels
    D0 = 0x00c0 // move.w #0x00C0, D0

    while (D3 >= 0) {
      // @postloop: or.b D0, (A0)
      newScreen.data[asm.A0]! |= D0 & 0xff

      // adda.w D1, A0
      asm.A0 += D1

      // ror.w #1, D0
      const carry = D0 & 0x0001
      D0 = ((D0 >> 1) | (carry << 15)) & 0xffff

      // dbcs D3, @postloop
      if (carry === 0) {
        // Carry set means continue loop
        D3--
        if (D3 < 0) break
      } else {
        // Carry clear, need to handle byte crossing
        // subq.w #1, D3
        D3--
        // blt.s @leave
        if (D3 < 0) break

        // or.b D0, (A0)
        newScreen.data[asm.A0]! |= D0 & 0xff

        // addq.w #1, A0
        asm.A0++

        // rol.w #8, D0
        D0 = ((D0 << 8) | (D0 >> 8)) & 0xffff

        // bra.s @postloop (continue loop)
      }
    }

    return newScreen
  }
