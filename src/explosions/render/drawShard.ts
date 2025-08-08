import type { MonochromeBitmap } from '@/bitmap'
import { cloneBitmap } from '@/bitmap'
import { SBARHT, SCRWTH, VIEWHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { jsrWAddress } from '@/asm/assemblyMacros'

/**
 * Draw a shard (explosion debris) sprite
 * From orig/Sources/Draw.c at draw_shard():441-464
 *
 * Draws a 16-pixel wide sprite using XOR operations.
 * Shards are rotatable debris pieces from destroyed bunkers.
 *
 * @param deps - Drawing dependencies
 * @param deps.x - Screen x coordinate (0-based, relative to viewport)
 * @param deps.y - Screen y coordinate (0-based, relative to viewport)
 * @param deps.def - The shard sprite data (16-bit words)
 * @param deps.height - Height of the shard in pixels
 * @returns Transform function that draws the shard on a bitmap
 */
export function drawShard(deps: {
  x: number
  y: number
  def: Uint16Array // 1 word (2 bytes) per row
  height: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
  const { x, y: origY, def, height: origHeight } = deps

    const newScreen = cloneBitmap(screen)

    // Early out
    if (origHeight <= 0 || def.length === 0) return newScreen

  // Horizontal clipping guard relative to actual bitmap width
  if (x < -16 || x >= newScreen.width) return newScreen

    // Vertical clipping (match Draw.c style)
    let y = origY
    let height = origHeight
    let defRowOffset = 0 // in rows

    if (y < 0) {
      defRowOffset = -y
      height += y
      y = 0
    } else if (y + height > VIEWHT) {
      height = VIEWHT - y
    }
    if (height <= 0) return newScreen

    const adjustedY = y + SBARHT

    // Setup 68k emulator context similar to drawMedium
    const asm = build68kArch({
      data: {
        D3: height - 1,
        D4: 0xffffffff,
        D5: 0xffffffff
      },
      address: {
        A0: jsrWAddress(0, x, adjustedY)
      }
    })

    // Clipping masks (reuse drawMedium logic; works for 16px-wide shards)
    if (x < -16) {
      asm.D4 = 0x00000000
    } else if (x < 0) {
      asm.D4 = 0x0000ffff
    } else if (x >= SCRWTH - 16) {
      asm.D4 = asm.D4 ^ 0x0000ffff
      asm.D5 = asm.D5 ^ 0x0000ffff
    } else if (x >= SCRWTH - 32) {
      asm.D5 = asm.D5 ^ 0x0000ffff
    }

    // Shift amounts
    const xBits = x & 15
    const leftShift = 16 - xBits

    // Row stride (Mac playfield)
    const rowOffset = 64

    // Iterate rows
    let rowIndex = defRowOffset
    do {
      if (rowIndex >= def.length) break
      const word = def[rowIndex] || 0
      rowIndex++

      if (word !== 0) {
        // moveq #0, D0; move.w (def)+, D0; lsl.l x, D0
        let d0 = (word << leftShift) >>> 0 // 32-bit logical

        // and.l D4, D0 (clip)
        d0 = d0 & asm.D4

        // eor.l D0, (A0)
        if (asm.A0 >= 0 && asm.A0 + 3 < newScreen.data.length) {
          const existing =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          const xr = (existing ^ d0) >>> 0
          newScreen.data[asm.A0]! = (xr >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (xr >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (xr >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = xr & 0xff
        }
      }

      // Advance to next scanline
      asm.A0 += rowOffset
    } while (asm.instructions.dbra('D3'))

    return newScreen
  }
}
