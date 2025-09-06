/**
 * @fileoverview Corresponds to draw_eneline() from orig/Sources/Draw.c:1232
 * Draws east-north-east diagonal lines with double-width pixels
 */

import type { MonochromeBitmap } from '../../types'
import { SCRHT, SBARHT } from '../../../screen/constants'
import { jsrWAddress, negIfNeg } from '@lib/asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { build68kArch } from '@lib/asm'

/**
 * Draw an east-north-east diagonal line (2 pixels wide, shallow angle)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: LINE_DIR.DN (1) for down, LINE_DIR.UP (-1) for up
 * @see orig/Sources/Draw.c:1232 draw_eneline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawEneline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x: xParam, y: yParam, len: lenParam, dir } = deps

    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    // Create 68k emulator context
    const asm = build68kArch()
    const { instructions } = asm

    // Load parameters into emulator state
    let x = xParam
    let y = yParam
    let len = lenParam

    // Lines 1233-1235: keep double width from overwriting bottom or top of screen
    if (
      (dir === LINE_DIR.DN && y + (len >> 1) >= SCRHT - 1) ||
      (dir === LINE_DIR.UP && y - (len >> 1) <= SBARHT)
    ) {
      len -= 1 + (len & 0x0001)
    }

    // movem.l D3-D5, -(SP) - saving registers (not needed in JS)

    // Line 1239: JSR_WADDRESS
    let A0 = jsrWAddress(0, x, y)
    const A1 = A0 // Line 1240: movea.l A0, A1 (save starting address)
    const D5 = x // Line 1241: move.w x, D5 (save x value for later)

    // Line 1243-1245: move.w len(A6), D3; subq.w #1, D3; blt @leave
    asm.D3 = len
    asm.D3 = (asm.D3 - 1) & 0xffff // subq.w #1, D3
    if ((asm.D3 & 0x8000) !== 0) {
      // blt @leave (negative check)
      return newScreen
    }

    // Line 1246: asr.w #1, D3 (divide by two)
    asm.D3 = instructions.asr_w(asm.D3, 1)

    // Lines 1249-1258: draw the last 2 dots
    asm.D2 = asm.D3
    asm.D2 = (asm.D2 << 1) & 0xffff // asl.w #1, D2
    x = (x + asm.D2) & 0xffff // add.w D2, x (ending x value)

    // Lines 1252-1258: handle direction
    if (dir > 0) {
      // tst.w dir(A6); bgt.s @down
      y = (y + asm.D3) & 0xffff // add.w D3, y
      y = (y + 1) & 0xffff // addq.w #1, y
    } else {
      y = (y - asm.D3) & 0xffff // sub.w D3, y
      y = (y - 1) & 0xffff // subq.w #1, y
    }

    // Line 1259: JSR_WADDRESS (end address)
    A0 = jsrWAddress(0, x, y)

    // Lines 1260-1263: draw the last 2 dots
    x = x & 15 // andi.w #15, x
    asm.D0 = 0xc0000000 // move.l #0xC0000000, D0
    asm.D0 = instructions.ror_l(asm.D0, x) // ror.l x, D0
    instructions.or_l(newScreen.data, A0, asm.D0) // or.l D0, (A0)

    // Lines 1265-1266: set up direction-dependent offset
    asm.D1 = 64 // moveq #64, D1
    asm.D1 = negIfNeg(asm.D1, dir) // NEGIFNEG(D1, dir(A6))

    // Lines 1268-1269: restore x and starting address
    x = D5 // move.w D5, x (restore x)
    A0 = A1 // movea.l A1, A0 (restore starting address)

    // Lines 1270-1273: draw first 2 dots
    x = x & 15 // andi.w #15, x
    asm.D0 = 0xc0000000 // move.l #0xC0000000, D0
    asm.D0 = instructions.ror_l(asm.D0, x) // ror.l x, D0
    instructions.or_l(newScreen.data, A0, asm.D0) // or.l D0, (A0)

    // Line 1274-1275: prepare for main loop
    A0 = (A0 + asm.D1) & 0xffffffff // adda.w D1, A0
    asm.D3 = (asm.D3 - 1) & 0xffff // subq.w #1, D3 (last 2 dots already done)
    if ((asm.D3 & 0x8000) !== 0) {
      // blt @leave
      return newScreen
    }

    // Lines 1278-1279: set up main pattern
    asm.D0 = 0xf0000000 // move.l #0xF0000000, D0
    asm.D0 = instructions.ror_l(asm.D0, x) // ror.l x, D0 (D0 holds or mask)

    // Lines 1281-1285: prepare loop counters
    asm.D4 = asm.D3 // move.w D3, D4
    asm.D3 = asm.D3 & 3 // and.w #3, D3
    asm.D4 = instructions.asr_w(asm.D4, 2) // asr.w #2, D4
    asm.D4 = (asm.D4 - 1) & 0xffff // subq.w #1, D4
    if ((asm.D4 & 0x8000) !== 0) {
      // blt @postloop
      // Skip main loop, go to postloop
    } else {
      // Lines 1287-1288: check direction
      if (dir < 0) {
        // tst.w dir(A6); blt @uploop
        // @uploop (lines 1306-1319)
        do {
          // Line 1306: or.l D0, (A0)
          instructions.or_l(newScreen.data, A0, asm.D0)
          // Line 1307: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1308: or.l D0, -64*1(A0)
          instructions.or_l(newScreen.data, A0 - 64 * 1, asm.D0)
          // Line 1309: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1310: or.l D0, -64*2(A0)
          instructions.or_l(newScreen.data, A0 - 64 * 2, asm.D0)
          // Line 1311: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1312: or.l D0, -64*3(A0)
          instructions.or_l(newScreen.data, A0 - 64 * 3, asm.D0)
          // Line 1313: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1314: suba.w #64*4, A0
          A0 = (A0 - 64 * 4) & 0xffffffff

          // Lines 1315-1318: tst.b D0; beq.s @2; swap D0; addq.w #2, A0
          instructions.tst_b(asm.D0)
          if (!asm.registers.flags.zeroFlag) {
            asm.D0 = instructions.swap(asm.D0)
            A0 = (A0 + 2) & 0xffffffff
          }
        } while (instructions.dbra('D4')) // Line 1319: dbf D4, @uploop
      } else {
        // @downloop (lines 1290-1303)
        do {
          // Line 1290: or.l D0, (A0)
          instructions.or_l(newScreen.data, A0, asm.D0)
          // Line 1291: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1292: or.l D0, 64*1(A0)
          instructions.or_l(newScreen.data, A0 + 64 * 1, asm.D0)
          // Line 1293: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1294: or.l D0, 64*2(A0)
          instructions.or_l(newScreen.data, A0 + 64 * 2, asm.D0)
          // Line 1295: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1296: or.l D0, 64*3(A0)
          instructions.or_l(newScreen.data, A0 + 64 * 3, asm.D0)
          // Line 1297: ror.l #2, D0
          asm.D0 = instructions.ror_l(asm.D0, 2)
          // Line 1298: adda.w #64*4, A0
          A0 = (A0 + 64 * 4) & 0xffffffff

          // Lines 1299-1302: tst.b D0; beq.s @1; swap D0; addq.w #2, A0
          instructions.tst_b(asm.D0)
          if (!asm.registers.flags.zeroFlag) {
            asm.D0 = instructions.swap(asm.D0)
            A0 = (A0 + 2) & 0xffffffff
          }
        } while (instructions.dbra('D4')) // Line 1303: dbf D4, @downloop
      }
    }

    // @postloop (lines 1321-1324)
    // The original assembly does not have a guard condition here; the loop
    // is controlled entirely by the dbra instruction.
    do {
      // Line 1321: or.l D0, (A0)
      instructions.or_l(newScreen.data, A0, asm.D0)
      // Line 1322: adda.w D1, A0
      A0 = (A0 + asm.D1) & 0xffffffff
      // Line 1323: ror.l #2, D0
      asm.D0 = instructions.ror_l(asm.D0, 2)
    } while (instructions.dbra('D3')) // Line 1324: dbf D3, @postloop

    // @leave (line 1326): movem.l (SP)+, D3-D5 (restore registers - not needed)
    return newScreen
  }
