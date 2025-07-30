import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { jsrWAddress } from '@/asm/assemblyMacros'

/**
 * Shift Figure: draws the figure only where there is
 * gray under it currently. Used for shadow.
 *
 * See shift_figure() in orig/Sources/Draw.c:191-226
 */
export function shiftFigure(deps: {
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
    let xBits = x & 15

    // addq.w #1, x /* put _shifted_ in place */
    xBits = xBits + 1

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
        // When xBits is 16, this shifts all bits out, resulting in 0
        let d0 = xBits < 32 ? data >>> xBits : 0

        // lsl.w D2, D1
        // When D2 is 0, no shift occurs
        let d1Shifted = asm.D2 < 16 ? (d1 << asm.D2) & 0xffff : 0

        // and.l (A0), D0
        if (asm.A0 < newScreen.data.length - 3) {
          const screenData1 =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          d0 = d0 & screenData1
        }

        // and.w 4(A0), D1
        if (asm.A0 + 5 < newScreen.data.length) {
          const screenData2 =
            (newScreen.data[asm.A0 + 4]! << 8) | newScreen.data[asm.A0 + 5]!
          d1Shifted = d1Shifted & screenData2
        } else {
          d1Shifted = 0 // If we can't read, treat as no gray present
        }

        // move.w #0, CCR (clear carry flag)
        // roxl.w #1, D1 (rotate left through extend/carry)
        // The carry flag starts at 0, so the first roxl shifts in 0
        const d1MSB = (d1Shifted >>> 15) & 1
        d1Shifted = ((d1Shifted << 1) | 0) & 0xffff

        // roxl.l #1, D0 (rotate left through extend/carry)
        // This uses the carry from the previous roxl (which is the old MSB of D1)
        d0 = ((d0 << 1) | d1MSB) >>> 0

        // or.l D0, (A0)
        if (asm.A0 < newScreen.data.length - 3) {
          let screenData =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          screenData = screenData | d0
          newScreen.data[asm.A0]! = (screenData >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (screenData >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (screenData >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = screenData & 0xff
        }

        // or.w D1, 4(A0)
        if (asm.A0 + 5 < newScreen.data.length) {
          let screenData =
            (newScreen.data[asm.A0 + 4]! << 8) | newScreen.data[asm.A0 + 5]!
          screenData = screenData | d1Shifted
          newScreen.data[asm.A0 + 4]! = (screenData >>> 8) & 0xff
          newScreen.data[asm.A0 + 5]! = screenData & 0xff
        }
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
