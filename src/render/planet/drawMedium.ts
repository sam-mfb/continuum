import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARHT, SCRWTH, VIEWHT } from '@core/screen'
import { build68kArch } from '@lib/asm'
import { jsrWAddress } from '@lib/asm/assemblyMacros'

/**
 * From draw_medium() in orig/Sources/Draw.c at 348-408
 *
 * Draws medium-sized sprites (fuel cells, craters) with XOR operations.
 * The original had two versions - this implements the second one with XOR.
 */
export function drawMedium(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  height: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y: origY, def, height: origHeight } = deps

    const newScreen = cloneBitmap(screen)

    // Handle vertical clipping (Draw.c:353-359)
    let y = origY
    let height = origHeight
    let defOffset = 0

    if (y < 0) {
      // def -= y * 2; (Draw.c:354)
      // Each row is 4 bytes (32 pixels) = 2 words
      defOffset = -y * 4
      height += y
      y = 0
    } else if (y + height > VIEWHT) {
      height = VIEWHT - y
    }

    // No drawing if completely off screen
    if (height <= 0) {
      return newScreen
    }

    // y += SBARHT; (Draw.c:361)
    const adjustedY = y + SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D3: height - 1, // subq.w #1, D3 (Draw.c:392)
        D4: 0xffffffff, // Clip on left
        D5: 0xffffffff // Clip on right
      },
      address: {
        A0: jsrWAddress(0, x, adjustedY)
      }
    })

    // Early exit if nothing to draw
    if (asm.D3 < 0) {
      return newScreen
    }

    // Clipping logic (Draw.c:367-383)
    if (x < -16) {
      // not.l D4 (Draw.c:370)
      asm.D4 = 0x00000000
    } else if (x < 0) {
      // move.l #0x0000FFFF, D4 (Draw.c:374)
      asm.D4 = 0x0000ffff
    } else if (x >= SCRWTH - 16) {
      // not.w D4; not.w D5 (Draw.c:378-379)
      asm.D4 = asm.D4 ^ 0x0000ffff
      asm.D5 = asm.D5 ^ 0x0000ffff
    } else if (x >= SCRWTH - 32) {
      // not.w D5 (Draw.c:383)
      asm.D5 = asm.D5 ^ 0x0000ffff
    }

    // andi.w #15, x (Draw.c:385)
    const xBits = x & 15
    // move.w #16, D2; sub.w x, D2 (Draw.c:386-387)
    const leftShift = 16 - xBits
    const rightShift = xBits

    const rowOffset = 64 // moveq #64, y (Draw.c:389)
    let defIndex = defOffset

    // Main drawing loop (@loop at Draw.c:394-404)
    do {
      if (defIndex + 3 >= def.data.length) break

      // move.l (def)+, D0 (Draw.c:394)
      let d0 =
        (def.data[defIndex]! << 24) |
        (def.data[defIndex + 1]! << 16) |
        (def.data[defIndex + 2]! << 8) |
        def.data[defIndex + 3]!
      defIndex += 4

      // beq.s @skip (Draw.c:395)
      if (d0 !== 0) {
        // move.w D0, D1 (Draw.c:396)
        const d0Word = d0 & 0xffff

        // lsr.l x, D0 (Draw.c:397)
        d0 = d0 >>> rightShift

        // lsl.w D2, D1 (Draw.c:398)
        let d1 = (d0Word << leftShift) & 0xffff

        // and.l D4, D0 (Draw.c:399)
        d0 = d0 & asm.D4

        // and.w D5, D1 (Draw.c:400)
        d1 = d1 & (asm.D5 & 0xffff)

        // eor.l D0, (A0) (Draw.c:401)
        if (asm.A0 + 3 < newScreen.data.length) {
          const existingData =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          const xorResult = existingData ^ d0
          newScreen.data[asm.A0]! = (xorResult >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (xorResult >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (xorResult >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = xorResult & 0xff
        }

        // eor.w D1, 4(A0) (Draw.c:402)
        if (d1 !== 0 && asm.A0 + 5 < newScreen.data.length) {
          const existingData =
            (newScreen.data[asm.A0 + 4]! << 8) | newScreen.data[asm.A0 + 5]!
          const xorResult = existingData ^ d1
          newScreen.data[asm.A0 + 4]! = (xorResult >>> 8) & 0xff
          newScreen.data[asm.A0 + 5]! = xorResult & 0xff
        }
      }

      // @skip: adda.w y, A0 (Draw.c:403)
      asm.A0 += rowOffset
    } while (asm.instructions.dbra('D3'))

    return newScreen
  }
}
