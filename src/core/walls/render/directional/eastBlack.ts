/**
 * @fileoverview Corresponds to east_black() from orig/Sources/Walls.c:553
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT, SCRHT } from '../../../screen/constants'
import { drawEline } from '../lines/drawEline'
import { jsrWAddress } from '@lib/asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { build68kArch } from '@lib/asm/emulator'

/**
 * Draws black parts of eastward lines
 * @see orig/Sources/Walls.c:553 east_black()
 */
export const eastBlack =
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

    // static long data[6] = {-1, -1, 0, 0, 0, 0}; (line 557)
    const data = [-1, -1, 0, 0, 0, 0]
    // long *dataptr = data; (line 558)
    let dataptr = 0 // Index into data array

    // register int x, y, len, height, *dp; (line 559)
    let x = line.startx - scrx // (line 562)
    let y = line.starty - scry // (line 563)
    let h1 = 0 // (line 564)
    let h4 = line.length + 1 // (line 565)
    let height = 6 // (line 566)

    // if (x + h1 < 0) (line 568)
    if (x + h1 < 0) {
      h1 = -x // (line 569)
    }
    // if (x + h4 > SCRWTH) (line 570)
    if (x + h4 > SCRWTH) {
      h4 = SCRWTH - x // (line 571)
    }
    // if (h1 >= h4) (line 572)
    if (h1 >= h4) {
      return newScreen // (line 573)
    }

    // h2 = 16; (line 574)
    let h2 = 16
    // if (h2 < h1) (line 575)
    if (h2 < h1) {
      h2 = h1 // (line 576)
    }
    // else if (h2 > h4) (line 577)
    else if (h2 > h4) {
      h2 = h4 // (line 578)
    }

    // h3 = line->h2; (line 579)
    let h3 = line.h2 ?? 0
    // if (h3 > line->length) (line 580)
    if (h3 > line.length) {
      h3 = line.length // (line 581)
    }
    // if (h3 < h2) (line 582)
    if (h3 < h2) {
      h3 = h2 // (line 583)
    }
    // if (h3 > h4) (line 584)
    if (h3 > h4) {
      h3 = h4 // (line 585)
    }

    // if (y<0) (line 586)
    if (y < 0) {
      // dataptr -= y; (line 588)
      dataptr -= y
      // height += y; (line 589)
      height += y
      // y = 0; (line 590)
      y = 0
    }
    // else if (y > VIEWHT - 6) (line 592)
    else if (y > VIEWHT - 6) {
      // height = VIEWHT - y; (line 593)
      height = VIEWHT - y
    }
    // height--; (line 594)
    height--
    // if (height < 0) (line 595)
    if (height < 0) {
      return newScreen // (line 596)
    }
    // y += SBARHT; (line 597)
    y += SBARHT

    // if (y + height >= SBARHT+5 && y < SCRHT) (line 599)
    if (y + height >= SBARHT + 5 && y < SCRHT) {
      // if (h2 > h1) (line 601)
      if (h2 > h1) {
        // draw_eline(x+h1, y, h2 - h1 - 1, L_DN); (line 602)
        newScreen = drawEline({
          x: x + h1,
          y,
          len: h2 - h1 - 1,
          u_d: LINE_DIR.DN
        })(newScreen)
      }
      // if (h4 > h3) (line 603)
      if (h4 > h3) {
        // draw_eline(x+h3, y, h4 - h3 - 1, L_DN); (line 604)
        newScreen = drawEline({
          x: x + h3,
          y,
          len: h4 - h3 - 1,
          u_d: LINE_DIR.DN
        })(newScreen)
      }
    }

    // len = h3 - h2 - 1; (line 606)
    let len = h3 - h2 - 1

    // if (len < 0) (line 608)
    if (len < 0) {
      return newScreen // (line 609)
    }
    // x += h2; (line 610)
    x += h2

    // asm { (line 612)
    const asm = build68kArch()

    // move.l D3, -(SP) (line 614)
    const savedD3 = asm.D3
    // JSR_WADDRESS (line 615)
    asm.A0 = jsrWAddress(0, x, y)
    // moveq #64, D2 (line 616)
    asm.D2 = 64

    // andi.w #15, x (line 618)
    x = x & 15
    // move.w x, D0 (line 619)
    asm.D0 = x
    // add.w len, D0 (line 620)
    asm.D0 = (asm.D0 + len) & 0xffff
    // cmpi.w #16, D0 (line 621)
    // bge.s @normal (line 622)
    if (asm.D0 < 16) {
      // moveq #-1, D1 (line 624)
      asm.D1 = 0xffffffff
      // lsr.w #1, D1 (line 625)
      asm.D1 = asm.instructions.lsr_w(asm.D1, 1)
      // lsr.w len, D1 (line 626)
      asm.D1 = asm.instructions.lsr_w(asm.D1, len)
      // ror.w x, D1 (line 627)
      asm.D1 = asm.instructions.ror_w(asm.D1, x)

      // bsr @oneword (line 629)
      oneword(newScreen, asm, height, dataptr, data)
      // bra @leave (line 630)
    } else {
      // @normal: moveq #-1, D1 (line 632)
      asm.D1 = 0xffffffff
      // lsr.w x, D1 (line 633)
      asm.D1 = asm.instructions.lsr_w(asm.D1, x)
      // not.w D1 (line 634)
      asm.D1 = ~asm.D1 & 0xffff
      // cmp.w #5, height (line 635)
      // beq @quick (line 636)
      if (height === 5) {
        // @quick: (line 683)
        // not.w D1 (line 684)
        asm.D1 = ~asm.D1 & 0xffff
        // or.w D1, (A0) (line 685)
        newScreen.data[asm.A0]! |= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 1]! |= asm.D1 & 0xff
        // or.w D1, 64(A0) (line 686)
        newScreen.data[asm.A0 + 64]! |= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 + 1]! |= asm.D1 & 0xff
        // not.w D1 (line 687)
        asm.D1 = ~asm.D1 & 0xffff
        // and.w D1, 64*2(A0) (line 688)
        newScreen.data[asm.A0 + 64 * 2]! &= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 2 + 1]! &= asm.D1 & 0xff
        // and.w D1, 64*3(A0) (line 689)
        newScreen.data[asm.A0 + 64 * 3]! &= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 3 + 1]! &= asm.D1 & 0xff
        // and.w D1, 64*4(A0) (line 690)
        newScreen.data[asm.A0 + 64 * 4]! &= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 4 + 1]! &= asm.D1 & 0xff
        // and.w D1, 64*5(A0) (line 691)
        newScreen.data[asm.A0 + 64 * 5]! &= (asm.D1 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 5 + 1]! &= asm.D1 & 0xff

        // addq.l #2, A0 (line 693)
        asm.A0 += 2
        // sub.w #15, len (line 694)
        len -= 15
        // add.w x, len (line 695)
        len += x
        // moveq #0, D0 (line 696)
        asm.D0 = 0
        // moveq #-1, D1 (line 697)
        asm.D1 = 0xffffffff
        // bra.s @enter2 (line 698)

        // @enter2: sub.w #32, len (line 707)
        // bge.s @quicklp (line 708)
        while (len >= 32) {
          // @quicklp: move.l D1, (A0) (line 700)
          newScreen.data[asm.A0]! = 0xff
          newScreen.data[asm.A0 + 1]! = 0xff
          newScreen.data[asm.A0 + 2]! = 0xff
          newScreen.data[asm.A0 + 3]! = 0xff
          // move.l D1, 64(A0) (line 701)
          newScreen.data[asm.A0 + 64]! = 0xff
          newScreen.data[asm.A0 + 64 + 1]! = 0xff
          newScreen.data[asm.A0 + 64 + 2]! = 0xff
          newScreen.data[asm.A0 + 64 + 3]! = 0xff
          // move.l D0, 64*2(A0) (line 702)
          newScreen.data[asm.A0 + 64 * 2]! = 0
          newScreen.data[asm.A0 + 64 * 2 + 1]! = 0
          newScreen.data[asm.A0 + 64 * 2 + 2]! = 0
          newScreen.data[asm.A0 + 64 * 2 + 3]! = 0
          // move.l D0, 64*3(A0) (line 703)
          newScreen.data[asm.A0 + 64 * 3]! = 0
          newScreen.data[asm.A0 + 64 * 3 + 1]! = 0
          newScreen.data[asm.A0 + 64 * 3 + 2]! = 0
          newScreen.data[asm.A0 + 64 * 3 + 3]! = 0
          // move.l D0, 64*4(A0) (line 704)
          newScreen.data[asm.A0 + 64 * 4]! = 0
          newScreen.data[asm.A0 + 64 * 4 + 1]! = 0
          newScreen.data[asm.A0 + 64 * 4 + 2]! = 0
          newScreen.data[asm.A0 + 64 * 4 + 3]! = 0
          // move.l D0, 64*5(A0) (line 705)
          newScreen.data[asm.A0 + 64 * 5]! = 0
          newScreen.data[asm.A0 + 64 * 5 + 1]! = 0
          newScreen.data[asm.A0 + 64 * 5 + 2]! = 0
          newScreen.data[asm.A0 + 64 * 5 + 3]! = 0
          // addq.l #4, A0 (line 706)
          asm.A0 += 4
          // sub.w #32, len (line 707)
          len -= 32
        }

        // add.w #32, len (line 710)
        len += 32
        // moveq #-1, D0 (line 711)
        asm.D0 = 0xffffffff
        // lsr.l len, D0 (line 712)
        asm.D0 = asm.instructions.lsr_l(asm.D0, len)

        // not.l D0 (line 714)
        asm.D0 = ~asm.D0 >>> 0
        // or.l D0, (A0) (line 715)
        newScreen.data[asm.A0]! |= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 1]! |= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 2]! |= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 3]! |= asm.D0 & 0xff
        // or.l D0, 64(A0) (line 716)
        newScreen.data[asm.A0 + 64]! |= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 64 + 1]! |= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 64 + 2]! |= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 + 3]! |= asm.D0 & 0xff
        // not.l D0 (line 717)
        asm.D0 = ~asm.D0 >>> 0
        // and.l D0, 64*2(A0) (line 718)
        newScreen.data[asm.A0 + 64 * 2]! &= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 64 * 2 + 1]! &= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 64 * 2 + 2]! &= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 2 + 3]! &= asm.D0 & 0xff
        // and.l D0, 64*3(A0) (line 719)
        newScreen.data[asm.A0 + 64 * 3]! &= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 64 * 3 + 1]! &= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 64 * 3 + 2]! &= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 3 + 3]! &= asm.D0 & 0xff
        // and.l D0, 64*4(A0) (line 720)
        newScreen.data[asm.A0 + 64 * 4]! &= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 64 * 4 + 1]! &= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 64 * 4 + 2]! &= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 4 + 3]! &= asm.D0 & 0xff
        // and.l D0, 64*5(A0) (line 721)
        newScreen.data[asm.A0 + 64 * 5]! &= (asm.D0 >>> 24) & 0xff
        newScreen.data[asm.A0 + 64 * 5 + 1]! &= (asm.D0 >>> 16) & 0xff
        newScreen.data[asm.A0 + 64 * 5 + 2]! &= (asm.D0 >>> 8) & 0xff
        newScreen.data[asm.A0 + 64 * 5 + 3]! &= asm.D0 & 0xff
      } else {
        // bsr @oneword (line 637)
        oneword(newScreen, asm, height, dataptr, data)

        // addq.l #2, A0 (line 639)
        asm.A0 += 2
        // sub.w #15, len (line 640)
        len -= 15
        // add.w x, len (line 641)
        len += x
        // moveq #0, D0 (line 642)
        asm.D0 = 0
        // bra.s @enter1 (line 643)

        // @enter1: sub.w #32, len (line 653)
        // bge.s @slowlp (line 654)
        while (len >= 32) {
          // @slowlp: move.l A0, A1 (line 645)
          let A1 = asm.A0
          // move.w height, D1 (line 646)
          asm.D1 = height
          // move.l dataptr(A6), dp (line 647)
          let dp = dataptr
          // @inner: (line 648)
          for (let i = 0; i <= asm.D1; i++) {
            // move.l (dp)+, (A1) (line 648)
            const val = data[dp++]! >>> 0
            newScreen.data[A1]! = (val >>> 24) & 0xff
            newScreen.data[A1 + 1]! = (val >>> 16) & 0xff
            newScreen.data[A1 + 2]! = (val >>> 8) & 0xff
            newScreen.data[A1 + 3]! = val & 0xff
            // adda.l D2, A1 (line 649)
            A1 += asm.D2
            // dbra D1, @inner (line 650)
          }

          // addq.l #4, A0 (line 652)
          asm.A0 += 4
          // sub.w #32, len (line 653)
          len -= 32
        }

        // @continue: add.w #32, len (line 656)
        len += 32
        // moveq #-1, D1 (line 657)
        asm.D1 = 0xffffffff
        // lsr.l len, D1 (line 658)
        asm.D1 = asm.instructions.lsr_l(asm.D1, len)
        // swap D1 (line 659)
        asm.D1 = asm.instructions.swap(asm.D1)
        // bsr @oneword (line 660)
        oneword(newScreen, asm, height, dataptr, data)
        // addq.l #2, A0 (line 661)
        asm.A0 += 2
        // swap D1 (line 662)
        asm.D1 = asm.instructions.swap(asm.D1)
        // bsr @oneword (line 663)
        oneword(newScreen, asm, height, dataptr, data)
        // bra @leave (line 664)
      }
    }

    // @leave: move.l (SP)+, D3 (line 723)
    asm.D3 = savedD3
    // } (line 724)

    return newScreen
  }

/**
 * Implements @oneword subroutine (lines 666-681)
 */
function oneword(
  screen: MonochromeBitmap,
  asm: ReturnType<typeof build68kArch>,
  height: number,
  dataptr: number,
  data: number[]
): void {
  // @oneword: move.w height, D3 (line 666)
  asm.D3 = height
  // move.w D1, D0 (line 667)
  asm.D0 = asm.D1 & 0xffff
  // not.w D0 (line 668)
  asm.D0 = ~asm.D0 & 0xffff
  // move.l A0, A1 (line 669)
  let A1 = asm.A0
  // move.l dataptr(A6), dp (line 670)
  let dp = dataptr

  // @ow_loop: (line 672)
  for (let i = 0; i <= asm.D3; i++) {
    // tst.l (dp)+ (line 672)
    const val = data[dp++]!
    // bne.s @pos (line 673)
    if (val !== 0) {
      // @pos: or.w D0, (A1) (line 678)
      screen.data[A1]! |= (asm.D0 >>> 8) & 0xff
      screen.data[A1 + 1]! |= asm.D0 & 0xff
    } else {
      // and.w D1, (A1) (line 674)
      screen.data[A1]! &= (asm.D1 >>> 8) & 0xff
      screen.data[A1 + 1]! &= asm.D1 & 0xff
    }
    // adda.l D2, A1 (line 675/679)
    A1 += asm.D2
    // @enterow: dbra D3, @ow_loop (line 676/680)
  }
  // rts (line 677/681)
}
