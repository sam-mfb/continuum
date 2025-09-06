import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARHT } from '@core/screen/constants'
import { build68kArch } from '@lib/asm/emulator'
import { jsrWAddress } from '@lib/asm/assemblyMacros'

/**
 * Full Figure: takes both mask & def, and puts the figure.
 * The mask is used to clear the background before drawing the figure.
 *
 * See full_figure() in orig/Sources/Draw.c:103-144
 */
export function fullFigure(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  mask: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, mask } = deps

    const newScreen = cloneBitmap(screen)

    const adjustedY = y + SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D2: 0,
        D3: def.height - 1,
        D4: 0,
        D5: 0
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
    let maskIndex = 0

    // @loop: move.l (mask)+, D4
    while (true) {
      // Read 32 bits from mask
      let maskData = 0
      if (maskIndex < mask.data.length) {
        // Read up to 4 bytes, handling case where we have fewer bytes
        for (let i = 0; i < 4 && maskIndex + i < mask.data.length; i++) {
          maskData = (maskData << 8) | mask.data[maskIndex + i]!
        }
      }
      maskIndex += 4

      // bne.s @notskip - if mask is zero, skip this row
      if (maskData === 0) {
        // addq.w #4, def
        defIndex += 4
        // bra.s @skip
      } else {
        // @notskip: move.w D4, D5
        // D5 gets the low word of the mask data (same as D4 initially)
        const d5Word = maskData & 0xffff

        // lsr.l x, D4
        const d4Shifted = maskData >>> xBits

        // lsl.w D2, D5
        // When D2 is 16, this shifts all bits out of the 16-bit word
        const d5Shifted = asm.D2 < 16 ? (d5Word << asm.D2) & 0xffff : 0

        // not.l D4
        // not.w D5
        const d4Not = ~d4Shifted >>> 0
        const d5Not = ~d5Shifted & 0xffff

        // and.l (A0), D4
        // and.w 4(A0), D5
        // In the original, D4 and D5 are loaded with the inverted mask values,
        // then ANDed with screen memory
        let d4Result = d4Not
        let d5Result = d5Not

        // Read the screen data
        let screenData1 = 0
        let screenData2 = 0

        if (asm.A0 + 3 < newScreen.data.length) {
          screenData1 =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
        }

        if (asm.A0 + 5 < newScreen.data.length) {
          screenData2 =
            (newScreen.data[asm.A0 + 4]! << 8) | newScreen.data[asm.A0 + 5]!
        }

        d4Result = screenData1 & d4Result
        d5Result = screenData2 & d5Result

        // move.l (def)+, D0
        // Read 32 bits from def
        let defData = 0
        if (defIndex < def.data.length) {
          for (let i = 0; i < 4 && defIndex + i < def.data.length; i++) {
            defData = (defData << 8) | def.data[defIndex + i]!
          }
        }
        defIndex += 4

        // beq.s @skip - only apply def if non-zero
        if (defData !== 0) {
          // move.w D0, D1
          const d1 = defData & 0xffff

          // lsr.l x, D0
          const d0 = defData >>> xBits

          // lsl.w D2, D1
          // When D2 is 16, this shifts all bits out of the 16-bit word
          const d1Shifted = asm.D2 < 16 ? (d1 << asm.D2) & 0xffff : 0

          // or.l D0, D4
          d4Result = d4Result | d0

          // or.w D1, D5
          d5Result = d5Result | d1Shifted
        }

        // move.l D4, (A0)
        if (asm.A0 + 3 < newScreen.data.length) {
          newScreen.data[asm.A0]! = (d4Result >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (d4Result >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (d4Result >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = d4Result & 0xff
        }

        // move.w D5, 4(A0)
        if (asm.A0 + 5 < newScreen.data.length) {
          newScreen.data[asm.A0 + 4]! = (d5Result >>> 8) & 0xff
          newScreen.data[asm.A0 + 5]! = d5Result & 0xff
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
