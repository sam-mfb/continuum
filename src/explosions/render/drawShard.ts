import type { MonochromeBitmap } from '@/bitmap'
import { cloneBitmap } from '@/bitmap'
import { SBARHT, SCRWTH, VIEWHT } from '@/screen/constants'

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
  def: Uint16Array
  height: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, height } = deps

    // Clone the bitmap to ensure immutability
    const result = cloneBitmap(screen)

    // Early exit if nothing to draw
    if (height <= 0 || !def || def.length === 0) {
      return result
    }

    // Vertical clipping
    let startY = y
    let drawHeight = height
    let defOffset = 0

    if (startY < 0) {
      defOffset = -startY
      drawHeight += startY
      startY = 0
    } else if (startY + drawHeight > VIEWHT) {
      drawHeight = VIEWHT - startY
    }

    if (drawHeight <= 0) {
      return result
    }

    // Horizontal clipping
    if (x < -16 || x >= SCRWTH) {
      return result
    }

    // y += SBARHT (Draw.c:446)
    const adjustedY = startY + SBARHT

    // Calculate screen position
    // JSR_WADDRESS (Draw.c:449)
    const baseByteX = Math.floor(x / 8)

    // andi.w #15, x; sub.w #16, x; neg.w x (Draw.c:450-452)
    // This calculates the left shift amount for 16-bit words
    const xBits = x & 15
    const leftShift = 16 - xBits

    // moveq #64, D1 (Draw.c:454) - row offset in bytes
    const rowOffset = result.rowBytes

    // Main drawing loop (Draw.c:457-462)
    for (let row = 0; row < drawHeight; row++) {
      const defIndex = defOffset + row
      if (defIndex >= def.length) break

      // moveq #0, D0; move.w (def)+, D0 (Draw.c:457-458)
      const word = def[defIndex]!
      if (word === 0) continue

      // lsl.l x, D0 (Draw.c:459)
      // Shift the 16-bit word into position for a 32-bit write
      const shiftedData = word << leftShift

      // Calculate screen position for this row
      const screenRow = adjustedY + row
      const byteOffset = screenRow * rowOffset + baseByteX

      // eor.l D0, (A0) (Draw.c:460)
      // XOR the shifted data with the screen
      if (byteOffset >= 0 && byteOffset + 3 < result.data.length) {
        // Extract 4 bytes from the shifted 32-bit value
        const byte0 = (shiftedData >>> 24) & 0xff
        const byte1 = (shiftedData >>> 16) & 0xff
        const byte2 = (shiftedData >>> 8) & 0xff
        const byte3 = shiftedData & 0xff

        // XOR with existing screen data
        result.data[byteOffset]! ^= byte0
        result.data[byteOffset + 1]! ^= byte1
        result.data[byteOffset + 2]! ^= byte2

        // Only write byte3 if it's within bounds
        if (byteOffset + 3 < result.data.length) {
          result.data[byteOffset + 3]! ^= byte3
        }
      }
    }

    return result
  }
}
