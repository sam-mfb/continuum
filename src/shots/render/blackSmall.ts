import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { findBAddress } from '@/asm/assemblyMacros'

/**
 * Draw small black pattern on the bitmap (8-bit patterns)
 * Uses OR operation to set bits
 *
 * See black_small() in orig/Sources/Draw.c:530-554
 */
export function blackSmall(deps: {
  x: number
  y: number
  def: number[] // 8-bit values (char array in original)
  height: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, height } = deps

    const newScreen = cloneBitmap(screen)

    if (height <= 0) {
      return newScreen
    }

    const adjustedY = y + SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {},
      address: {
        A0: findBAddress(0, x, adjustedY)
      }
    })

    // andi.w #7, x
    const xBits = x & 7

    // moveq #64-1, D2
    const D2 = 63

    // move.w height(A6), D1
    // subq.w #1, D1
    const loopCount = height - 1

    // @lp loop
    for (let i = 0; i <= loopCount; i++) {
      // moveq #0, D0
      // move.b (def)+, D0
      let D0 = def[i]! & 0xff

      // ror.w x, D0
      // Rotate right by xBits positions (16-bit rotation)
      D0 = ((D0 >>> xBits) | (D0 << (16 - xBits))) & 0xffff

      // or.b D0, (A0)+
      if (asm.A0 < newScreen.data.length) {
        newScreen.data[asm.A0]! |= D0 & 0xff
      }
      asm.A0++

      // rol.w #8, D0
      // Rotate left by 8 positions (swap bytes in 16-bit word)
      D0 = ((D0 << 8) | (D0 >>> 8)) & 0xffff

      // or.b D0, (A0)
      if (asm.A0 < newScreen.data.length) {
        newScreen.data[asm.A0]! |= D0 & 0xff
      }

      // adda.w D2, A0
      asm.A0 += D2
    }

    return newScreen
  }
}
