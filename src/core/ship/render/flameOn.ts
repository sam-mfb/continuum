import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARHT } from '@core/screen/constants'
import { build68kArch } from '@lib/asm/emulator'
import { findBAddress } from '@lib/asm/assemblyMacros'

// From orig/Sources/GW.h
const FCENTER = 3

// From orig/Sources/Draw.c:467-469
const flamexdisp = [
  0, -1, -3, -4, -7, -8, -9, -9, -10, -9, -9, -8, -7, -4, -3, -1, 0, 1, 3, 4, 7,
  8, 9, 9, 10, 9, 9, 8, 7, 4, 3, 1
]

/**
 * Draw ship's engine flame based on rotation
 *
 * See flame_on() in orig/Sources/Draw.c:471-479
 */
export function flameOn(deps: {
  x: number
  y: number
  rot: number
  flames: MonochromeBitmap[]
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x: baseX, y: baseY, rot, flames } = deps

    // x += flamexdisp[rot] - FCENTER
    const x = baseX + flamexdisp[rot]! - FCENTER

    // y += flamexdisp[(rot+(32-8)) & 31] - FCENTER
    // Note: (32-8) = 24, and we need to mask with 31 to keep in bounds
    const y = baseY + flamexdisp[(rot + 24) & 31]! - FCENTER

    // draw_small(x, y, flames[rot], 7)
    return drawSmall({
      x,
      y,
      def: flames[rot]!,
      height: 7
    })(screen)
  }
}

/**
 * Draw small 8-bit wide figure using XOR operation
 *
 * See draw_small() in orig/Sources/Draw.c:503-527
 */
function drawSmall(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  height: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, height } = deps

    if (height <= 0) return screen

    const newScreen = cloneBitmap(screen)
    const adjustedY = y + SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D0: 0,
        D1: height - 1,
        D2: 63 // 64 - 1
      },
      address: {
        A0: findBAddress(0, x, adjustedY)
      }
    })

    // andi.w #7, x
    const xBits = x & 7

    let defIndex = 0

    // @lp loop
    for (let row = 0; row < height; row++) {
      // moveq #0, D0
      // move.b (def)+, D0
      let data = 0
      if (defIndex < def.data.length) {
        data = def.data[defIndex]!
      }
      defIndex++

      // ror.w x, D0
      // This is a 16-bit rotate right - the byte loaded is in the low byte of D0
      // After rotation, bits may spill into both bytes of the 16-bit word
      let wordData = data // Start with byte in low position
      if (xBits > 0) {
        wordData = ((wordData >>> xBits) | (wordData << (16 - xBits))) & 0xffff
      }

      // eor.b D0, (A0)+
      if (asm.A0 < newScreen.data.length) {
        newScreen.data[asm.A0]! ^= wordData & 0xff
      }
      asm.A0++ // Post-increment

      // rol.w #8, D0
      // Rotate left by 8 (swap bytes in 16-bit word)
      wordData = ((wordData << 8) | (wordData >>> 8)) & 0xffff

      // eor.b D0, (A0)
      if (asm.A0 < newScreen.data.length) {
        newScreen.data[asm.A0]! ^= wordData & 0xff
      }

      // adda.w D2, A0
      // Note: A0 was already incremented by 1, so we add D2 (63) to get to next row
      asm.A0 += asm.D2

      // dbf D1, @lp (handled by for loop)
    }

    return newScreen
  }
}
