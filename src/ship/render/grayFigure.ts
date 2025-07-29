import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { jsrWAddress } from '@/asm/assemblyMacros'

/**
 * Gray Figure: reasserts background gray under the figure for
 * later call to shift_figure.
 *
 * See gray_figure() in orig/Sources/Draw.c:151-184
 */
export function grayFigure(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  background: readonly [number, number]
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, background } = deps

    const newScreen = cloneBitmap(screen)

    // register long gray = background[y & 1]
    let gray = background[y & 1]!

    const adjustedY = y + SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D2: 0,
        D3: def.height - 1
      },
      address: {
        A0: jsrWAddress(0, x, adjustedY)
      }
    })

    // andi.w #15, x
    const xBits = x & 15

    // moveq #16, D2
    asm.D2 = 16

    // sub.w x, D2
    asm.D2 = asm.D2 - xBits

    // moveq #64, y (used as the row offset)
    const rowOffset = 64

    // Process each row of the figure
    let defIndex = 0

    // @loop: move.l (def)+, D0
    while (true) {
      // Read 32 bits from def
      let data = 0
      if (defIndex < def.data.length) {
        // Read up to 4 bytes, handling case where we have fewer bytes
        for (let i = 0; i < 4 && defIndex + i < def.data.length; i++) {
          data = (data << 8) | def.data[defIndex + i]!
        }
      }
      defIndex += 4

      // beq.s @skip - skip if data is zero
      if (data !== 0) {
        // move.w D0, D1
        const d1 = data & 0xffff

        // lsr.l x, D0
        const d0 = data >>> xBits

        // lsl.w D2, D1
        const d1Shifted = (d1 << asm.D2) & 0xffff

        // and.l gray, D0
        const d0Masked = d0 & gray

        // and.w gray, D1
        const d1Masked = d1Shifted & (gray & 0xffff)

        // or.l D0, (A0)
        if (asm.A0 < newScreen.data.length - 3) {
          let screenData =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          screenData = screenData | d0Masked
          newScreen.data[asm.A0]! = (screenData >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (screenData >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (screenData >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = screenData & 0xff
        }

        // or.w D1, 4(A0)
        if (asm.A0 + 4 < newScreen.data.length - 1) {
          let screenData =
            (newScreen.data[asm.A0 + 4]! << 8) | newScreen.data[asm.A0 + 5]!
          screenData = screenData | d1Masked
          newScreen.data[asm.A0 + 4]! = (screenData >>> 8) & 0xff
          newScreen.data[asm.A0 + 5]! = screenData & 0xff
        }
      }

      // @skip: adda.l y, A0
      asm.A0 += rowOffset

      // ror.l #1, gray
      gray = ((gray >>> 1) | (gray << 31)) >>> 0

      // dbf D3, @loop
      if (!asm.instructions.dbra('D3')) {
        break
      }
    }

    return newScreen
  }
}

