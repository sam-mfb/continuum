import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { jsrWAddress } from '@/asm/assemblyMacros'

/**
 * Draw Figure:  puts the 32 by HEIGHT figure on the screen
 * at given spot.  Used to draw the ship.
 *
 * See draw_figure() in orig/Sources/Draw.c:32-60
 */
export function drawFigure(deps: {
  x: number
  y: number
  def: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def } = deps

    const newScreen = cloneBitmap(screen)

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

        // or.l D0, (A0)
        asm.instructions.or_l(newScreen.data, asm.A0, d0)

        // or.w D1, 4(A0)
        asm.instructions.or_w(newScreen.data, asm.A0 + 4, d1Shifted)
      }

      // @skip: adda.l y, A0
      asm.A0 += rowOffset

      // dbf D3, @loop
      if (!asm.instructions.dbra('D3')) {
        break
      }
    }

    return newScreen
  }
}
