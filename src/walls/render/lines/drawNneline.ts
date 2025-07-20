/**
 * @fileoverview Corresponds to draw_nneline() from orig/Sources/Draw.c:997
 * Draws a north-north-east diagonal line (1 right for every 2 up)
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'
import { jsrBAddress, negIfNeg } from '../../../asm/assemblyMacros'

/**
 * Draw a north-north-east diagonal line (1 pixel right for every 2 pixels up)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: positive for down, negative/zero for up
 * @see orig/Sources/Draw.c:997 draw_nneline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNneline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x, y, len: lenParam, dir } = deps
    let len = lenParam
    
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    
    // Right edge clipping (lines 1001-1002)
    if (x + (len >> 1) + 1 >= SCRWTH) {
      len -= 1 + (len & 0x0001)
    }

    // Calculate byte address using JSR_BADDRESS (line 1006)
    let A0 = jsrBAddress(0, x, y)

    // andi.w #7, x (line 1007)
    const xBit = x & 7

    // move.w #3<<6, D0 -> lsr.b x, D0 (lines 1008-1009)
    // Initial mask: 0xC0 (11000000) shifted right by bit position
    let D0 = 0xC0 >> xBit

    // move.w #64, D2 -> NEGIFNEG (lines 1011-1012)
    const D2 = negIfNeg(64, dir)

    // move.w len(A6), D3 (line 1013)
    let D3 = len

    // @drawit: cmp.w #7, x -> beq @skip_pre (lines 1015-1016)
    if (xBit !== 7) {
      // @preloop (lines 1018-1029)
      preloop: while (true) {
        // or.b D0, (A0) (line 1018)
        if (A0 >= 0 && A0 < newScreen.data.length) {
          newScreen.data[A0]! |= D0
        }
        
        // adda.w D2, A0 (line 1019)
        A0 += D2
        
        // subq.w #1, D3 (line 1020)
        D3--
        
        // blt @leave (line 1021)
        if (D3 < 0) return newScreen
        
        // or.b D0, (A0) - second pixel in pair (line 1023)
        if (A0 >= 0 && A0 < newScreen.data.length) {
          newScreen.data[A0]! |= D0
        }
        
        // adda.w D2, A0 (line 1024)
        A0 += D2
        
        // ror.b #1, D0 (line 1025)
        const carry = D0 & 1
        D0 = ((D0 >> 1) | (carry << 7)) & 0xFF
        
        // dbcs D3, @preloop (line 1026)
        // dbcs: if carry set, decrement D3 and branch if D3 >= 0
        // if carry clear, fall through without decrementing
        if (carry) {
          D3--
          if (D3 >= 0) continue
        }
        
        // subq.w #1, D3 - dbcc missed this! (line 1028)
        D3--
        
        // blt @leave (line 1029)
        if (D3 < 0) return newScreen
        
        break // Exit preloop and continue to skip_pre
      }
    }

    // @skip_pre (lines 1031-1047)
    // moveq #0x80-0x100, D0 (line 1032)
    D0 = 0x80
    
    // First cross-byte pair (lines 1033-1037)
    // or.b #1, (A0) (line 1033)
    if (A0 >= 0 && A0 < newScreen.data.length) {
      newScreen.data[A0]! |= 0x01
    }
    // or.b D0, 1(A0) (line 1034)
    if (A0 + 1 >= 0 && A0 + 1 < newScreen.data.length) {
      newScreen.data[A0 + 1]! |= 0x80
    }
    
    // adda.w D2, A0 (line 1035)
    A0 += D2
    
    // subq.w #1, D3 (line 1036)
    D3--
    
    // blt @leave (line 1037)
    if (D3 < 0) return newScreen
    
    // Second cross-byte pair (lines 1038-1042)
    // or.b #1, (A0) (line 1038)
    if (A0 >= 0 && A0 < newScreen.data.length) {
      newScreen.data[A0]! |= 0x01
    }
    // or.b D0, 1(A0) (line 1039)
    if (A0 + 1 >= 0 && A0 + 1 < newScreen.data.length) {
      newScreen.data[A0 + 1]! |= 0x80
    }
    
    // adda.w D2, A0 (line 1040)
    A0 += D2
    
    // subq.w #1, D3 (line 1041)
    D3--
    
    // blt @leave (line 1042)
    if (D3 < 0) return newScreen
    
    // addq.w #1, A0 (line 1044)
    A0++
    
    // tst.w D2 -> branch to uploop or dnloop (lines 1045-1047)
    if (D2 < 0) {
      // @uploop (lines 1049-1078)
      while (true) {
        // @enteruplp: sub.w #16, D3 (line 1076)
        D3 -= 16
        // bge @uploop (line 1077)
        if (D3 < 0) break
        
        // Unrolled loop for 16 pixels going up
        // moveq #0xC0-0x100, D0 -> or.b D0, (A0) (lines 1049-1050)
        if (A0 >= 0 && A0 < newScreen.data.length) {
          newScreen.data[A0]! |= 0xC0
        }
        // or.b D0, -64*1(A0) (line 1051)
        if (A0 - 64 >= 0 && A0 - 64 < newScreen.data.length) {
          newScreen.data[A0 - 64]! |= 0xC0
        }
        
        // moveq #0x60, D0 (line 1052)
        // or.b D0, -64*2(A0) and -64*3(A0) (lines 1053-1054)
        if (A0 - 128 >= 0 && A0 - 128 < newScreen.data.length) {
          newScreen.data[A0 - 128]! |= 0x60
        }
        if (A0 - 192 >= 0 && A0 - 192 < newScreen.data.length) {
          newScreen.data[A0 - 192]! |= 0x60
        }
        
        // moveq #0x30, D0 (line 1055)
        // or.b D0, -64*4(A0) and -64*5(A0) (lines 1056-1057)
        if (A0 - 256 >= 0 && A0 - 256 < newScreen.data.length) {
          newScreen.data[A0 - 256]! |= 0x30
        }
        if (A0 - 320 >= 0 && A0 - 320 < newScreen.data.length) {
          newScreen.data[A0 - 320]! |= 0x30
        }
        
        // moveq #0x18, D0 (line 1058)
        // or.b D0, -64*6(A0) and -64*7(A0) (lines 1059-1060)
        if (A0 - 384 >= 0 && A0 - 384 < newScreen.data.length) {
          newScreen.data[A0 - 384]! |= 0x18
        }
        if (A0 - 448 >= 0 && A0 - 448 < newScreen.data.length) {
          newScreen.data[A0 - 448]! |= 0x18
        }
        
        // moveq #0x0C, D0 (line 1061)
        // or.b D0, -64*8(A0) and -64*9(A0) (lines 1062-1063)
        if (A0 - 512 >= 0 && A0 - 512 < newScreen.data.length) {
          newScreen.data[A0 - 512]! |= 0x0C
        }
        if (A0 - 576 >= 0 && A0 - 576 < newScreen.data.length) {
          newScreen.data[A0 - 576]! |= 0x0C
        }
        
        // moveq #0x06, D0 (line 1064)
        // or.b D0, -64*10(A0) and -64*11(A0) (lines 1065-1066)
        if (A0 - 640 >= 0 && A0 - 640 < newScreen.data.length) {
          newScreen.data[A0 - 640]! |= 0x06
        }
        if (A0 - 704 >= 0 && A0 - 704 < newScreen.data.length) {
          newScreen.data[A0 - 704]! |= 0x06
        }
        
        // moveq #0x03, D0 (line 1067)
        // or.b D0, -64*12(A0) and -64*13(A0) (lines 1068-1069)
        if (A0 - 768 >= 0 && A0 - 768 < newScreen.data.length) {
          newScreen.data[A0 - 768]! |= 0x03
        }
        if (A0 - 832 >= 0 && A0 - 832 < newScreen.data.length) {
          newScreen.data[A0 - 832]! |= 0x03
        }
        
        // moveq #0x01, D0 (line 1070)
        // or.b D0, -64*14(A0) (line 1071)
        if (A0 - 896 >= 0 && A0 - 896 < newScreen.data.length) {
          newScreen.data[A0 - 896]! |= 0x01
        }
        // or.b #1<<7, -64*14+1(A0) (line 1072)
        if (A0 - 895 >= 0 && A0 - 895 < newScreen.data.length) {
          newScreen.data[A0 - 895]! |= 0x80
        }
        // or.b D0, -64*15(A0) (line 1073)
        if (A0 - 960 >= 0 && A0 - 960 < newScreen.data.length) {
          newScreen.data[A0 - 960]! |= 0x01
        }
        // or.b #1<<7, -64*15+1(A0) (line 1074)
        if (A0 - 959 >= 0 && A0 - 959 < newScreen.data.length) {
          newScreen.data[A0 - 959]! |= 0x80
        }
        
        // suba.w #64*16-1, A0 (line 1075)
        A0 -= (64 * 16 - 1)
      }
    } else {
      // @dnloop (lines 1080-1108)
      while (true) {
        // @enterdnlp: sub.w #16, D3 (line 1107)
        D3 -= 16
        // bge @dnloop (line 1108)
        if (D3 < 0) break
        
        // Unrolled loop for 16 pixels going down
        // moveq #0xC0-0x100, D0 -> or.b D0, (A0) (lines 1080-1081)
        if (A0 >= 0 && A0 < newScreen.data.length) {
          newScreen.data[A0]! |= 0xC0
        }
        // or.b D0, 64*1(A0) (line 1082)
        if (A0 + 64 >= 0 && A0 + 64 < newScreen.data.length) {
          newScreen.data[A0 + 64]! |= 0xC0
        }
        
        // moveq #0x60, D0 (line 1083)
        // or.b D0, 64*2(A0) and 64*3(A0) (lines 1084-1085)
        if (A0 + 128 >= 0 && A0 + 128 < newScreen.data.length) {
          newScreen.data[A0 + 128]! |= 0x60
        }
        if (A0 + 192 >= 0 && A0 + 192 < newScreen.data.length) {
          newScreen.data[A0 + 192]! |= 0x60
        }
        
        // moveq #0x30, D0 (line 1086)
        // or.b D0, 64*4(A0) and 64*5(A0) (lines 1087-1088)
        if (A0 + 256 >= 0 && A0 + 256 < newScreen.data.length) {
          newScreen.data[A0 + 256]! |= 0x30
        }
        if (A0 + 320 >= 0 && A0 + 320 < newScreen.data.length) {
          newScreen.data[A0 + 320]! |= 0x30
        }
        
        // moveq #0x18, D0 (line 1089)
        // or.b D0, 64*6(A0) and 64*7(A0) (lines 1090-1091)
        if (A0 + 384 >= 0 && A0 + 384 < newScreen.data.length) {
          newScreen.data[A0 + 384]! |= 0x18
        }
        if (A0 + 448 >= 0 && A0 + 448 < newScreen.data.length) {
          newScreen.data[A0 + 448]! |= 0x18
        }
        
        // moveq #0x0C, D0 (line 1092)
        // or.b D0, 64*8(A0) and 64*9(A0) (lines 1093-1094)
        if (A0 + 512 >= 0 && A0 + 512 < newScreen.data.length) {
          newScreen.data[A0 + 512]! |= 0x0C
        }
        if (A0 + 576 >= 0 && A0 + 576 < newScreen.data.length) {
          newScreen.data[A0 + 576]! |= 0x0C
        }
        
        // moveq #0x06, D0 (line 1095)
        // or.b D0, 64*10(A0) and 64*11(A0) (lines 1096-1097)
        if (A0 + 640 >= 0 && A0 + 640 < newScreen.data.length) {
          newScreen.data[A0 + 640]! |= 0x06
        }
        if (A0 + 704 >= 0 && A0 + 704 < newScreen.data.length) {
          newScreen.data[A0 + 704]! |= 0x06
        }
        
        // moveq #0x03, D0 (line 1098)
        // or.b D0, 64*12(A0) and 64*13(A0) (lines 1099-1100)
        if (A0 + 768 >= 0 && A0 + 768 < newScreen.data.length) {
          newScreen.data[A0 + 768]! |= 0x03
        }
        if (A0 + 832 >= 0 && A0 + 832 < newScreen.data.length) {
          newScreen.data[A0 + 832]! |= 0x03
        }
        
        // moveq #0x01, D0 (line 1101)
        // or.b D0, 64*14(A0) (line 1102)
        if (A0 + 896 >= 0 && A0 + 896 < newScreen.data.length) {
          newScreen.data[A0 + 896]! |= 0x01
        }
        // or.b #1<<7, 64*14+1(A0) (line 1103)
        if (A0 + 897 >= 0 && A0 + 897 < newScreen.data.length) {
          newScreen.data[A0 + 897]! |= 0x80
        }
        // or.b D0, 64*15(A0) (line 1104)
        if (A0 + 960 >= 0 && A0 + 960 < newScreen.data.length) {
          newScreen.data[A0 + 960]! |= 0x01
        }
        // or.b #1<<7, 64*15+1(A0) (line 1105)
        if (A0 + 961 >= 0 && A0 + 961 < newScreen.data.length) {
          newScreen.data[A0 + 961]! |= 0x80
        }
        
        // adda.w #64*16+1, A0 (line 1106)
        A0 += (64 * 16 + 1)
      }
    }

    // @post: add.w #16, D3 (line 1110)
    D3 += 16
    
    // moveq #0xC0-0x100, D0 (line 1111)
    D0 = 0xC0
    
    // @postloop (lines 1112-1127)
    while (true) {
      // or.b D0, (A0) (line 1112)
      if (A0 >= 0 && A0 < newScreen.data.length) {
        newScreen.data[A0]! |= D0
      }
      
      // adda.w D2, A0 (line 1113)
      A0 += D2
      
      // subq.w #1, D3 (line 1114)
      D3--
      
      // blt.s @leave (line 1115)
      if (D3 < 0) return newScreen
      
      // or.b D0, (A0) - second pixel in pair (line 1117)
      if (A0 >= 0 && A0 < newScreen.data.length) {
        newScreen.data[A0]! |= D0
      }
      
      // adda.w D2, A0 (line 1118)
      A0 += D2
      
      // lsr.b #1, D0 (line 1119)
      D0 = (D0 >> 1) & 0xFF
      
      // dbf D3, @postloop (line 1120)
      D3--
      if (D3 >= 0) continue
      
      // tst.b D0 (line 1122)
      if (D0 !== 0) break // bne.s @leave (line 1123)
      
      // Handle final cross-byte pixels (lines 1124-1127)
      // suba.w D2, A0 (line 1124)
      A0 -= D2
      // or.b #0x80, 1(A0) (line 1125)
      if (A0 + 1 >= 0 && A0 + 1 < newScreen.data.length) {
        newScreen.data[A0 + 1]! |= 0x80
      }
      // suba.w D2, A0 (line 1126)
      A0 -= D2
      // or.b #0x80, 1(A0) (line 1127)
      if (A0 + 1 >= 0 && A0 + 1 < newScreen.data.length) {
        newScreen.data[A0 + 1]! |= 0x80
      }
      
      break
    }

    return newScreen
  }
