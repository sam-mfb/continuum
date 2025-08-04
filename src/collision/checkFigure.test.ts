import { describe, it, expect } from 'vitest'
import { checkFigure } from './checkFigure'
import type { MonochromeBitmap } from '@/bitmap'
import { createMonochromeBitmap } from '@/bitmap/create'
import { SBARHT } from '@/screen/constants'

// Helper to create a 32-pixel wide mask with specific bit patterns
function createMask(patterns: number[], height: number): MonochromeBitmap {
  const mask = createMonochromeBitmap(32, height)
  for (let y = 0; y < height && y < patterns.length; y++) {
    const pattern = patterns[y]!
    // Write 32 bits as 4 bytes
    const rowOffset = y * mask.rowBytes
    mask.data[rowOffset] = (pattern >>> 24) & 0xff
    mask.data[rowOffset + 1] = (pattern >>> 16) & 0xff
    mask.data[rowOffset + 2] = (pattern >>> 8) & 0xff
    mask.data[rowOffset + 3] = pattern & 0xff
  }
  return mask
}

// Helper to set a pixel on the screen
function setScreenPixel(screen: MonochromeBitmap, x: number, y: number): void {
  const byteIndex = y * screen.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> x % 8
  if (byteIndex < screen.data.length) {
    screen.data[byteIndex] = (screen.data[byteIndex] ?? 0) | bitMask
  }
}

// Helper to fill screen row with pattern
function fillScreenRow(
  screen: MonochromeBitmap,
  y: number,
  pattern: number
): void {
  const rowOffset = y * screen.rowBytes
  // Fill row with repeating 32-bit pattern
  for (let x = 0; x < screen.rowBytes; x += 4) {
    if (x + 3 < screen.rowBytes) {
      screen.data[rowOffset + x] = (pattern >>> 24) & 0xff
      screen.data[rowOffset + x + 1] = (pattern >>> 16) & 0xff
      screen.data[rowOffset + x + 2] = (pattern >>> 8) & 0xff
      screen.data[rowOffset + x + 3] = pattern & 0xff
    }
  }
}

describe('checkFigure - Basic Collision Detection', () => {
  it('No collision - empty screen', () => {
    const screen = createMonochromeBitmap(128, 64) // Wider than 48 pixels for overflow tests
    const mask = createMask([0x80000000], 1) // Single pixel in top-left of mask

    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('Simple collision - aligned position', () => {
    const screen = createMonochromeBitmap(128, 64)
    // For y=0 + SBARHT=24 (even row), background mask is 0x55555555
    // Bit 1 is set (position x=1), so place pixel there
    const mask = createMask([0x40000000], 1) // Single pixel at x=1

    // Place pixel at (1, 24) - where checkFigure will actually look
    setScreenPixel(screen, 1, SBARHT)

    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('Simple collision - unaligned position', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x80000000], 1) // Single pixel in top-left

    // Place pixel at (5, 24)
    setScreenPixel(screen, 5, SBARHT)

    // Position mask at x=5 to collide
    const result = checkFigure(screen, { x: 5, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('No collision - mask misses object', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x80000000], 1) // Single pixel in top-left

    // Place pixel at (10, 0)
    setScreenPixel(screen, 10, 0)

    // Position mask at x=0 (won't overlap with pixel at x=10)
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })
})

describe('checkFigure - Background Pattern Tests', () => {
  // Background patterns from the original game
  const PATTERN_EVEN = 0xaaaaaaaa // 10101010...
  const PATTERN_ODD = 0x55555555 // 01010101...

  it('Background pattern ignored - even row', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0xffffffff], 1) // Full row of pixels

    // Fill row at y=SBARHT (y=24, even row) with dither pattern
    fillScreenRow(screen, SBARHT, PATTERN_EVEN)

    // Should not collide with background pattern on even row
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('Background pattern ignored - odd row', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0xffffffff], 1) // Full row of pixels

    // Fill row at y=SBARHT+1 (y=25, odd row) with dither pattern
    fillScreenRow(screen, SBARHT + 1, PATTERN_ODD)

    // Should not collide with background pattern on odd row
    const result = checkFigure(screen, { x: 0, y: 1, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('Collision through background - even row', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixels only at "white" background positions for even row
    // For even row, background mask is PATTERN_ODD (0x55555555)
    // So we want pixels where background would be white (1s in mask)
    const mask = createMask([0x55555555], 1)

    // Fill screen with background pattern AND an object
    fillScreenRow(screen, SBARHT, PATTERN_EVEN)
    // Add object pixels at white background positions
    const rowOffset = SBARHT * screen.rowBytes
    if (rowOffset < screen.data.length) {
      screen.data[rowOffset] = (screen.data[rowOffset] ?? 0) | 0x55 // Add pixels where background is white
    }

    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('Collision through background - odd row', () => {
    const screen = createMonochromeBitmap(128, 64)
    // For odd row, background mask is PATTERN_EVEN (0xaaaaaaaa)
    const mask = createMask([0xaaaaaaaa], 1)

    // Fill screen with background pattern AND an object
    fillScreenRow(screen, SBARHT + 1, PATTERN_ODD)
    // Add object pixels at white background positions
    const rowByteIndex = (SBARHT + 1) * screen.rowBytes
    if (rowByteIndex < screen.data.length) {
      screen.data[rowByteIndex] = (screen.data[rowByteIndex] ?? 0) | 0xaa
    }

    const result = checkFigure(screen, { x: 0, y: 1, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('50% resolution - no collision at black background positions', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x80000000], 1) // Single pixel at x=0

    // Place a screen pixel at x=0 (a "black" background position for even rows)
    setScreenPixel(screen, 0, SBARHT)

    // Even though both mask and screen have pixels at (0,0),
    // collision is NOT detected because x=0 is filtered by background mask
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('50% resolution - collision only at white background positions', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x40000000], 1) // Single pixel at x=1

    // Place a screen pixel at x=1 (a "white" background position for even rows)
    setScreenPixel(screen, 1, SBARHT)

    // Collision IS detected because x=1 is allowed by background mask
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('50% resolution - pattern changes between rows', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Two-row mask with pixels at x=0 on both rows
    const mask = createMask([0x80000000, 0x80000000], 2)

    // Place pixels at x=0 on both rows
    setScreenPixel(screen, 0, SBARHT) // Row 0 + SBARHT
    setScreenPixel(screen, 0, SBARHT + 1) // Row 1 + SBARHT

    // For even row (y=0+SBARHT=24): x=0 is black position (no collision)
    // For odd row (y=1+SBARHT=25): x=0 is white position (collision detected)
    const result = checkFigure(screen, { x: 0, y: 0, height: 2, def: mask })
    expect(result).toBe(true) // Collision on second row
  })

  it('Background mask rotation for multi-line sprites', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a 2-row mask with all pixels set
    const mask = createMask([0xffffffff, 0xffffffff], 2)

    // Fill screen with standard dithered background pattern
    fillScreenRow(screen, SBARHT, PATTERN_EVEN) // y=SBARHT: 10101010...
    fillScreenRow(screen, SBARHT + 1, PATTERN_ODD) // y=SBARHT+1: 01010101...

    // Place a single object pixel at (x=0, y=SBARHT+1)
    // This pixel is at a position where:
    // - Row 0 background mask (0x55555555) would ignore it (bit 0 is 0)
    // - Row 1 background mask after rotation (0x2AAAAAAA) would NOT ignore it (bit 0 is 1)
    setScreenPixel(screen, 0, SBARHT + 1)

    // Test 2-row mask starting at (0,0)
    // If implementation correctly rotates the background mask for each row,
    // it should detect the collision at (0,SBARHT+1)
    const result = checkFigure(screen, { x: 0, y: 0, height: 2, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Overflow Testing', () => {
  it('Overflow collision - right edge', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixel at right edge that would overflow
    const mask = createMask([0x00000001], 1) // Rightmost pixel

    // Place pixel at x=47 (within 48-pixel check region)
    setScreenPixel(screen, 47, SBARHT)

    // Position mask at x=16 so rightmost pixel lands at x=47
    const result = checkFigure(screen, { x: 16, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('No overflow collision beyond 48 pixels', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x00000001], 1) // Rightmost pixel

    // For x=17, word boundary starts at x=16, check region is [16, 64)
    // Place pixel at x=64 (outside check region)
    setScreenPixel(screen, 64, 0)

    // Position mask at x=17 so rightmost pixel would be at x=48
    // But pixel at x=64 is outside the check region
    const result = checkFigure(screen, { x: 17, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('Partial overflow - sprite crossing word boundary', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixels in the right half (bits 16-31)
    const mask = createMask([0x0000ffff], 1) // Right 16 pixels of 32-pixel mask

    // When mask is at x=24:
    // - Left 16 pixels (empty) are at positions [24, 39]
    // - Right 16 pixels (filled) are at positions [40, 55]
    // Place pixel at x=41 to collide with mask pixels
    // But x=41 falls on even position, so for y=0 it would be masked out
    // Use x=40 instead (bit position where background mask allows detection)
    setScreenPixel(screen, 41, SBARHT)

    // For x=24, word boundary starts at x=16, check region is [16, 64)
    const result = checkFigure(screen, { x: 24, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - 50% Resolution Behavior', () => {
  it('50% resolution - thin objects can be invisible to collision', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a 1-pixel wide vertical line mask
    const mask = createMask(
      [
        0x80000000, // x=0
        0x80000000, // x=0
        0x80000000, // x=0
        0x80000000 // x=0
      ],
      4
    )

    // Place a vertical line on screen at x=0
    for (let y = 0; y < 4; y++) {
      setScreenPixel(screen, 0, SBARHT + y)
    }

    // No collision detected because x=0 is filtered on even rows
    // Only odd rows (y=1,3) could detect collision, but that's just 50%
    const result = checkFigure(screen, { x: 0, y: 0, height: 4, def: mask })
    expect(result).toBe(true) // Collision on odd rows
  })

  it('50% resolution - wide objects always detectable', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a 2-pixel wide mask - guaranteed to have pixels on white positions
    const mask = createMask([0xc0000000], 1) // Pixels at x=0 and x=1

    // Place pixels at both positions
    setScreenPixel(screen, 0, SBARHT)
    setScreenPixel(screen, 1, SBARHT)

    // Even though x=0 is filtered, x=1 ensures collision detection
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Complex Scenarios', () => {
  it('Complex shape collision', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a complex mask shape (like a ship)
    const mask = createMask(
      [
        0x00180000, // Row 0:    ##
        0x003c0000, // Row 1:   ####
        0x007e0000, // Row 2:  ######
        0x00ff0000, // Row 3: ########
        0x007e0000, // Row 4:  ######
        0x003c0000, // Row 5:   ####
        0x00180000 // Row 6:    ##
      ],
      7
    )

    // Place some terrain on screen that intersects with the mask
    for (let y = 2; y < 5; y++) {
      for (let x = 8; x < 16; x++) {
        setScreenPixel(screen, x, SBARHT + y)
      }
    }

    // Position mask to collide with terrain
    const result = checkFigure(screen, { x: 0, y: 0, height: 7, def: mask })
    expect(result).toBe(true)
  })

  it('Near miss scenarios', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a mask with specific pixels
    const mask = createMask(
      [
        0x80000000, // Pixel at x=0
        0x40000000, // Pixel at x=1
        0x20000000 // Pixel at x=2
      ],
      3
    )

    // Place pixels that are adjacent but don't overlap
    setScreenPixel(screen, 3, 0) // Just to the right
    setScreenPixel(screen, 0, 3) // Just below

    // Should not collide
    const result = checkFigure(screen, { x: 0, y: 0, height: 3, def: mask })
    expect(result).toBe(false)
  })
})
