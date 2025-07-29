import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'
import { build68kArch } from '@/asm/emulator'
import { findWAddress } from '@/asm/assemblyMacros'

// Shot patterns from orig/Sources/Draw.c:620-621
const FILLED_SHOT = [0x6000, 0xf000, 0xf000, 0x6000]
const EMPTY_SHOT = [0x6000, 0x9000, 0x9000, 0x6000]

// Generate explosion random table like the original
// From orig/Sources/Main.c:1096 and Sound.c:62
//
// TODO: Currently not used in our implementation
//
// const EXPL_LO_PER = 50
// const EXPL_ADD_PER = 206
//
// const generateExplRands = (): Uint8Array => {
//   const table = new Uint8Array(128)
//
//   // Use a seeded random for consistency
//   let seed = 0x5678
//   const random = (): number => {
//     seed = (seed * 1103515245 + 12345) & 0x7fffffff
//     return seed / 0x7fffffff
//   }
//
//   for (let i = 0; i < 128; i++) {
//     table[i] = EXPL_LO_PER + Math.floor(random() * EXPL_ADD_PER)
//   }
//
//   return table
// }
//
// const EXPL_RANDS = generateExplRands()

// Static random counter that persists between calls
let randCounter = 1

/**
 * Draw the ship's bullets/shots on the bitmap
 *
 * See draw_shipshot() in orig/Sources/Draw.c:617-669
 */
export function drawShipShot(deps: {
  x: number
  y: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y } = deps

    const newScreen = cloneBitmap(screen)

    const adjustedY = y + SBARHT

    // Update random counter
    if (!--randCounter) {
      randCounter = Math.floor(Math.random() * 63) + 64
    }

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D2: 3 // loop counter for 4 rows
      },
      address: {
        A0: findWAddress(0, x, adjustedY)
      }
    })

    // and.w #15, x
    const xBits = x & 15

    // sub.w #16, x
    // neg.w x   /* x is left rot */
    const leftRot = 16 - xBits

    // Original code gets random value but then unconditionally branches to @empty
    // moveq #3, D0
    // and.b (data), D0
    // bra.s @empty - UNCONDITIONAL BRANCH! Always draws empty shots
    // The filled shot code exists but is never reached due to this branch

    // Draw empty shot (@empty/@eloop)
    for (let i = 0; i < 4; i++) {
      // moveq #0, D0  /* filled version is mask */
      // move.w (A1)+, D0
      let mask = FILLED_SHOT[i]!

      // lsl.l x, D0
      mask = mask << leftRot

      // not.l D0
      mask = ~mask >>> 0

      // moveq #0, D1
      // move.w (data)+, D1
      let data = EMPTY_SHOT[i]!

      // lsl.l x, D1
      data = data << leftRot

      // and.l (A0), D0
      // Read current screen data
      let screenData = 0
      if (asm.A0 < newScreen.data.length - 3) {
        screenData =
          (newScreen.data[asm.A0]! << 24) |
          (newScreen.data[asm.A0 + 1]! << 16) |
          (newScreen.data[asm.A0 + 2]! << 8) |
          newScreen.data[asm.A0 + 3]!
      }

      // Apply mask and combine with data
      const result = (screenData & mask) | data

      // move.l D0, (A0)
      if (asm.A0 < newScreen.data.length - 3) {
        newScreen.data[asm.A0]! = (result >>> 24) & 0xff
        newScreen.data[asm.A0 + 1]! = (result >>> 16) & 0xff
        newScreen.data[asm.A0 + 2]! = (result >>> 8) & 0xff
        newScreen.data[asm.A0 + 3]! = result & 0xff
      }

      // adda.w #64, A0
      asm.A0 += 64
    }

    return newScreen
  }
}
