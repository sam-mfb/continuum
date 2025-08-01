import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARHT, SCRWTH, VIEWHT } from '@/screen/constants'
import { BUNKHT, BUNKROTKINDS, type BunkerSpriteSet } from '@/figs/types'
import { build68kArch } from '@/asm/emulator'
import { jsrWAddress } from '@/asm/assemblyMacros'
import type { Bunker } from '../types'
import { xbcenter, ybcenter } from '@/figs/hardcodedSprites'

/**
 * From do_bunks() in orig/Sources/Bunkers.c at 213-245
 *
 # Selects and calls correct bunker drawing routines
 # for bunkers that are in the viewport
 */
export function doBunks(deps: {
  readonly bunkrec: readonly Bunker[]
  scrnx: number
  scrny: number
  bunkerSprites: BunkerSpriteSet
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { bunkrec, scrnx, scrny, bunkerSprites } = deps

    let newScreen = cloneBitmap(screen)

    // Calculate visible area bounds
    const left = scrnx - 48
    const right = scrnx + SCRWTH + 48

    // Process each bunker
    for (const bp of bunkrec) {
      // Check for end of bunker array (rot < 0 marks end)
      if (bp.rot < 0) break

      // Check if bunker is within horizontal bounds and alive
      if (bp.alive && bp.x > left && bp.x < right) {
        // Get bunker center offsets for this type and rotation
        const ycenter = ybcenter[bp.kind]![bp.rot]!
        const bunky = bp.y - scrny - ycenter

        // Check if bunker is within vertical bounds
        if (bunky > -48 && bunky < VIEWHT) {
          const xcenter = xbcenter[bp.kind]![bp.rot]!
          const bunkx = bp.x - scrnx - xcenter

          // Get the bunker sprite
          const bunkerSprite = bunkerSprites.getSprite(bp.kind, bp.rot)

          // Determine which drawing function to use
          if (bp.kind >= BUNKROTKINDS || bp.rot <= 1 || bp.rot >= 9) {
            // Use XOR drawing for rotating bunkers or up/down facing bunkers
            const align = (bp.x + bp.y + xcenter + ycenter) & 1

            // Convert Uint8Array to MonochromeBitmap with pre-computed background
            const image: MonochromeBitmap = {
              width: 48,
              height: BUNKHT,
              data:
                align === 0
                  ? bunkerSprite.images.background1
                  : bunkerSprite.images.background2,
              rowBytes: 6 // 48 pixels / 8 bits per byte
            }

            newScreen = drawBunker({
              x: bunkx,
              y: bunky,
              def: image
            })(newScreen)
          } else {
            // Use masked drawing for side-facing static bunkers
            const def: MonochromeBitmap = {
              width: 48,
              height: BUNKHT,
              data: bunkerSprite.def,
              rowBytes: 6 // 48 pixels / 8 bits per byte
            }
            const mask: MonochromeBitmap = {
              width: 48,
              height: BUNKHT,
              data: bunkerSprite.mask,
              rowBytes: 6 // 48 pixels / 8 bits per byte
            }

            newScreen = fullBunker({
              x: bunkx,
              y: bunky,
              def: def,
              mask: mask
            })(newScreen)
          }
        }
      }
    }

    return newScreen
  }
}

/**
 * From draw_bunker() in orig/Sources/Draw.c at 715-823
 *
 * Draws a bunker using XOR operations. Used for:
 * - All rotating bunkers (kinds >= BUNKROTKINDS)
 * - Bunkers facing up/down (rot <= 1 or rot >= 9)
 */
export function drawBunker(deps: {
  x: number
  y: number
  def: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def } = deps

    // if (x <= -48 || x >= SCRWTH) return; (Draw.c:721-722)
    if (x <= -48 || x >= SCRWTH) {
      return screen
    }

    const newScreen = cloneBitmap(screen)

    // height = (VIEWHT - 1) - y; (Draw.c:724)
    let height = VIEWHT - 1 - y
    if (height > BUNKHT - 1) {
      height = BUNKHT - 1
    }

    // Handle negative y (Draw.c:727-731)
    let adjustedY = y
    let defOffset = 0
    if (y < 0) {
      // def -= ((y << 1) + y) << 1; // -y * 6 bytes per row
      defOffset = -y * 6
      height += y
      adjustedY = 0
    }

    // y += SBARHT; (Draw.c:732)
    adjustedY += SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D3: height,
        D4: 0xffffffff, // Clip on left
        D5: 0xffffffff // Clip on right
      },
      address: {
        A0: jsrWAddress(0, x, adjustedY)
      }
    })

    // Clipping logic (Draw.c:740-765)
    if (x < -32) {
      asm.D4 = 0x00000000
      asm.D5 = 0x0000ffff
    } else if (x < -16) {
      asm.D4 = 0x00000000
    } else if (x < 0) {
      asm.D4 = 0x0000ffff
    } else if (x >= SCRWTH - 16) {
      asm.D5 = 0x00000000
      asm.D4 = asm.D4 ^ 0x0000ffff
    } else if (x >= SCRWTH - 32) {
      asm.D5 = 0x00000000
    } else if (x >= SCRWTH - 48) {
      asm.D5 = asm.D5 ^ 0x0000ffff
    }

    // and.w #15, x (Draw.c:767)
    const xBits = x & 15
    // moveq #16, y; sub.w x, y (Draw.c:768-769)
    const leftShift = 16 - xBits
    const rightShift = xBits

    // lsl.l x, D4; lsr.l y, D5 (Draw.c:773-774)
    asm.D4 = (asm.D4 << rightShift) >>> 0
    asm.D5 = asm.D5 >>> leftShift

    const rowOffset = 64 // moveq #64, D2 (Draw.c:770)
    let defIndex = defOffset

    // Skip leading blank lines (@skip0s loop at Draw.c:776-783)
    // Match original behavior: advance screen pointer BEFORE checking
    while (true) {
      // adda.w D2, A0 - advance screen pointer first
      asm.A0 += rowOffset

      if (defIndex + 5 >= def.data.length) {
        return newScreen // Past end of data
      }

      // move.w (def)+, D0; or.l (def)+, D0
      const word1 = (def.data[defIndex]! << 8) | def.data[defIndex + 1]!
      const long2 =
        (def.data[defIndex + 2]! << 24) |
        (def.data[defIndex + 3]! << 16) |
        (def.data[defIndex + 4]! << 8) |
        def.data[defIndex + 5]!
      defIndex += 6

      // Check if non-zero (dbne checks for not equal)
      if (word1 !== 0 || long2 !== 0) {
        // Found non-blank line - back up both pointers
        // subq.w #6, def; suba.w D2, A0
        defIndex -= 6
        asm.A0 -= rowOffset
        break
      }

      // dbne D3, @skip0s - decrements D3 and branches if not -1
      asm.D3--
      if (asm.D3 < 0) {
        // beq @leave - all lines were blank
        return newScreen
      }
    }

    // D3 now contains the remaining height after skipping blank lines

    // Main drawing loop (@loop at Draw.c:785-819)
    do {
      if (defIndex + 5 >= def.data.length) break

      // move.l (def), D0 (Draw.c:785)
      let d0 =
        (def.data[defIndex]! << 24) |
        (def.data[defIndex + 1]! << 16) |
        (def.data[defIndex + 2]! << 8) |
        def.data[defIndex + 3]!

      // and.l D4, D0 (Draw.c:786)
      d0 = d0 & asm.D4

      if (d0 === 0) {
        // @onlyright case (Draw.c:802-811)
        defIndex += 2 // Skip left word

        // move.l (def)+, D1 (Draw.c:804) - Corrected data fetching
        let d1 =
          (def.data[defIndex]! << 24) |
          (def.data[defIndex + 1]! << 16) |
          (def.data[defIndex + 2]! << 8) |
          def.data[defIndex + 3]!
        defIndex += 4

        // and.l D5, D1 (Draw.c:805)
        d1 = d1 & asm.D5

        if (d1 !== 0) {
          // lsl.l y, D1 (Draw.c:807)
          d1 = (d1 << leftShift) >>> 0

          // eor.l D1, 4(A0) (Draw.c:808)
          if (asm.A0 + 7 < newScreen.data.length) {
            const existingData =
              (newScreen.data[asm.A0 + 4]! << 24) |
              (newScreen.data[asm.A0 + 5]! << 16) |
              (newScreen.data[asm.A0 + 6]! << 8) |
              newScreen.data[asm.A0 + 7]!
            const xorResult = existingData ^ d1
            newScreen.data[asm.A0 + 4]! = (xorResult >>> 24) & 0xff
            newScreen.data[asm.A0 + 5]! = (xorResult >>> 16) & 0xff
            newScreen.data[asm.A0 + 6]! = (xorResult >>> 8) & 0xff
            newScreen.data[asm.A0 + 7]! = xorResult & 0xff
          }
        }
      } else {
        // Normal case or @onlyleft case
        defIndex += 2 // addq.w #2, def (Draw.c:788)

        // move.l (def)+, D1 (Draw.c:789)
        let d1 =
          (def.data[defIndex]! << 24) |
          (def.data[defIndex + 1]! << 16) |
          (def.data[defIndex + 2]! << 8) |
          def.data[defIndex + 3]!
        defIndex += 4

        // and.l D5, D1 (Draw.c:790)
        d1 = d1 & asm.D5

        if (d1 === 0) {
          // @onlyleft case (Draw.c:814-818)
          // lsr.l x, D0 (Draw.c:815)
          d0 = d0 >>> rightShift

          // eor.l D0, (A0) (Draw.c:816)
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
        } else {
          // @normal case (Draw.c:793-796)
          // lsr.l x, D0; lsl.l y, D1 (Draw.c:793-794)
          d0 = d0 >>> rightShift
          d1 = (d1 << leftShift) >>> 0

          // eor.l D0, (A0) (Draw.c:795)
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

          // eor.l D1, 4(A0) (Draw.c:796)
          if (asm.A0 + 7 < newScreen.data.length) {
            const existingData =
              (newScreen.data[asm.A0 + 4]! << 24) |
              (newScreen.data[asm.A0 + 5]! << 16) |
              (newScreen.data[asm.A0 + 6]! << 8) |
              newScreen.data[asm.A0 + 7]!
            const xorResult = existingData ^ d1
            newScreen.data[asm.A0 + 4]! = (xorResult >>> 24) & 0xff
            newScreen.data[asm.A0 + 5]! = (xorResult >>> 16) & 0xff
            newScreen.data[asm.A0 + 6]! = (xorResult >>> 8) & 0xff
            newScreen.data[asm.A0 + 7]! = xorResult & 0xff
          }
        }
      }

      // @nextline: adda.l D2, A0 (Draw.c:797)
      asm.A0 += rowOffset
    } while (asm.instructions.dbra('D3'))

    return newScreen
  }
}

/**
 * From full_bunker() in orig/Sources/Draw.c at 826-941
 *
 * Draws a bunker using mask and definition. Used for:
 * - Side-facing static bunkers (rot between 2 and 8)
 */
export function fullBunker(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  mask: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, def, mask } = deps

    // if (x <= -48 || x >= SCRWTH) return; (Draw.c:832-833)
    if (x <= -48 || x >= SCRWTH) {
      return screen
    }

    const newScreen = cloneBitmap(screen)

    // height = (VIEWHT - 1) - y; (Draw.c:835)
    let height = VIEWHT - 1 - y
    if (height > BUNKHT - 1) {
      height = BUNKHT - 1
    }

    // Handle negative y (Draw.c:838-843)
    let adjustedY = y
    let defOffset = 0
    let maskOffset = 0
    if (y < 0) {
      // def -= ((y << 1) + y) << 1; // -y * 6 bytes per row
      defOffset = -y * 6
      maskOffset = -y * 6
      height += y
      adjustedY = 0
    }

    // y += SBARHT; (Draw.c:844)
    adjustedY += SBARHT

    // Create 68K emulator instance
    const asm = build68kArch({
      data: {
        D3: height,
        D4: 0xffffffff, // Clip on left
        D5: 0xffffffff // Clip on right
      },
      address: {
        A0: jsrWAddress(0, x, adjustedY)
      }
    })

    // Clipping logic (Draw.c:853-877)
    if (x < -32) {
      asm.D4 = 0x00000000
      asm.D5 = 0x0000ffff
    } else if (x < -16) {
      asm.D4 = 0x00000000
    } else if (x < 0) {
      asm.D4 = 0x0000ffff
    } else if (x >= SCRWTH - 16) {
      asm.D5 = 0x00000000
      asm.D4 = asm.D4 ^ 0x0000ffff
    } else if (x >= SCRWTH - 32) {
      asm.D5 = 0x00000000
    } else if (x >= SCRWTH - 48) {
      asm.D5 = asm.D5 ^ 0x0000ffff
    }

    // and.w #15, x (Draw.c:879)
    const xBits = x & 15
    // moveq #16, y; sub.w x, y (Draw.c:880-881)
    const leftShift = 16 - xBits
    const rightShift = xBits

    const rowOffset = 64 // moveq #64, D2 (Draw.c:882)
    let defIndex = defOffset
    let maskIndex = maskOffset

    // Skip leading blank lines (@skip0s loop at Draw.c:886-896)
    // Match original behavior: advance screen pointer BEFORE checking
    while (true) {
      // adda.w D2, A0 - advance screen pointer first
      asm.A0 += rowOffset
      // addq.w #6, def
      defIndex += 6

      if (maskIndex + 5 >= mask.data.length) {
        return newScreen // Past end of data
      }

      // move.w (mask)+, D0; or.l (mask)+, D0
      const word1 = (mask.data[maskIndex]! << 8) | mask.data[maskIndex + 1]!
      const long2 =
        (mask.data[maskIndex + 2]! << 24) |
        (mask.data[maskIndex + 3]! << 16) |
        (mask.data[maskIndex + 4]! << 8) |
        mask.data[maskIndex + 5]!
      maskIndex += 6

      // Check if non-zero (dbne checks for not equal)
      if (word1 !== 0 || long2 !== 0) {
        // Found non-blank line - back up all pointers
        // subq.w #6, mask; subq.w #6, def; suba.w D2, A0
        maskIndex -= 6
        defIndex -= 6
        asm.A0 -= rowOffset
        break
      }

      // dbne D3, @skip0s - decrements D3 and branches if not -1
      asm.D3--
      if (asm.D3 < 0) {
        // beq @leave - all lines were blank
        return newScreen
      }
    }

    // D3 now contains the remaining height after skipping blank lines

    // Main drawing loop (@loop at Draw.c:898-927)
    while (asm.D3 >= 0) {
      if (maskIndex + 3 >= mask.data.length) break

      // move.l (mask)+, D0 (Draw.c:898)
      let d0 =
        (mask.data[maskIndex]! << 24) |
        (mask.data[maskIndex + 1]! << 16) |
        (mask.data[maskIndex + 2]! << 8) |
        mask.data[maskIndex + 3]!
      maskIndex += 4

      if (d0 === 0) {
        // @onlyright case (Draw.c:931-937)
        defIndex += 4 // Skip left longword
        asm.A0 += 4

        if (maskIndex + 1 < mask.data.length) {
          const d2 = (mask.data[maskIndex]! << 8) | mask.data[maskIndex + 1]!
          maskIndex += 2

          if (d2 === 0) {
            break // quit if 0 in mask
          }

          // Continue with right side processing
          // lsl.l y, D2 (Draw.c:914)
          let d2Full = (d2 << leftShift) >>> 0

          // and.l D5, D2 (Draw.c:915)
          d2Full = d2Full & asm.D5

          // not.l D2 (Draw.c:916)
          d2Full = ~d2Full >>> 0

          // and.l (A0), D2 (Draw.c:917)
          if (asm.A0 + 3 < newScreen.data.length) {
            const screenData =
              (newScreen.data[asm.A0]! << 24) |
              (newScreen.data[asm.A0 + 1]! << 16) |
              (newScreen.data[asm.A0 + 2]! << 8) |
              newScreen.data[asm.A0 + 3]!
            d2Full = d2Full & screenData
          }

          // Get def data for right side
          if (defIndex + 1 < def.data.length) {
            const d3 = (def.data[defIndex]! << 8) | def.data[defIndex + 1]!
            defIndex += 2

            // lsl.l y, D3 (Draw.c:920)
            let d3Full = (d3 << leftShift) >>> 0

            // and.l D5, D3 (Draw.c:921)
            d3Full = d3Full & asm.D5

            // or.l D3, D2 (Draw.c:922)
            d2Full = d2Full | d3Full

            // move.l D2, (A0) (Draw.c:923)
            if (asm.A0 + 3 < newScreen.data.length) {
              newScreen.data[asm.A0]! = (d2Full >>> 24) & 0xff
              newScreen.data[asm.A0 + 1]! = (d2Full >>> 16) & 0xff
              newScreen.data[asm.A0 + 2]! = (d2Full >>> 8) & 0xff
              newScreen.data[asm.A0 + 3]! = d2Full & 0xff
            }
          }
        }
      } else {
        // Normal case - process left side first
        // move.w D0, D2 (Draw.c:900)
        const d2Word = d0 & 0xffff

        // lsr.l x, D0 (Draw.c:901)
        d0 = d0 >>> rightShift

        // and.l D4, D0 (Draw.c:902)
        d0 = d0 & asm.D4

        // not.l D0 (Draw.c:903)
        d0 = ~d0 >>> 0

        // and.l (A0), D0 (Draw.c:904)
        if (asm.A0 + 3 < newScreen.data.length) {
          const screenData =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          d0 = d0 & screenData
        }

        // move.l (def)+, D1 (Draw.c:905)
        let d1 = 0
        if (defIndex + 3 < def.data.length) {
          d1 =
            (def.data[defIndex]! << 24) |
            (def.data[defIndex + 1]! << 16) |
            (def.data[defIndex + 2]! << 8) |
            def.data[defIndex + 3]!
        }
        defIndex += 4

        // move.w D1, D3 (Draw.c:906)
        const d3Word = d1 & 0xffff

        // lsr.l x, D1 (Draw.c:907)
        d1 = d1 >>> rightShift

        // and.l D4, D1 (Draw.c:908)
        d1 = d1 & asm.D4

        // or.l D1, D0 (Draw.c:909)
        d0 = d0 | d1

        // move.l D0, (A0)+ (Draw.c:910)
        if (asm.A0 + 3 < newScreen.data.length) {
          newScreen.data[asm.A0]! = (d0 >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (d0 >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (d0 >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = d0 & 0xff
        }
        asm.A0 += 4

        // Process right side
        // swap D2; move.w (mask)+, D2 (Draw.c:912-913)
        let d2Full = 0
        if (maskIndex + 1 < mask.data.length) {
          const highWord = d2Word
          const lowWord =
            (mask.data[maskIndex]! << 8) | mask.data[maskIndex + 1]!
          d2Full = (highWord << 16) | lowWord
          maskIndex += 2
        }

        // lsl.l y, D2 (Draw.c:914)
        d2Full = (d2Full << leftShift) >>> 0

        // and.l D5, D2 (Draw.c:915)
        d2Full = d2Full & asm.D5

        // not.l D2 (Draw.c:916)
        d2Full = ~d2Full >>> 0

        // and.l (A0), D2 (Draw.c:917)
        if (asm.A0 + 3 < newScreen.data.length) {
          const screenData =
            (newScreen.data[asm.A0]! << 24) |
            (newScreen.data[asm.A0 + 1]! << 16) |
            (newScreen.data[asm.A0 + 2]! << 8) |
            newScreen.data[asm.A0 + 3]!
          d2Full = d2Full & screenData
        }

        // swap D3; move.w (def)+, D3 (Draw.c:918-919)
        let d3Full = 0
        if (defIndex + 1 < def.data.length) {
          const highWord = d3Word
          const lowWord = (def.data[defIndex]! << 8) | def.data[defIndex + 1]!
          d3Full = (highWord << 16) | lowWord
          defIndex += 2
        }

        // lsl.l y, D3 (Draw.c:920)
        d3Full = (d3Full << leftShift) >>> 0

        // and.l D5, D3 (Draw.c:921)
        d3Full = d3Full & asm.D5

        // or.l D3, D2 (Draw.c:922)
        d2Full = d2Full | d3Full

        // move.l D2, (A0) (Draw.c:923)
        if (asm.A0 + 3 < newScreen.data.length) {
          newScreen.data[asm.A0]! = (d2Full >>> 24) & 0xff
          newScreen.data[asm.A0 + 1]! = (d2Full >>> 16) & 0xff
          newScreen.data[asm.A0 + 2]! = (d2Full >>> 8) & 0xff
          newScreen.data[asm.A0 + 3]! = d2Full & 0xff
        }
      }

      // @nextline: adda.w #64-4, A0 (Draw.c:925)
      asm.A0 += 64 - 4

      // subq.w #1, height(A6); bge.s @loop (Draw.c:926-927)
      asm.D3--
    }

    return newScreen
  }
}
