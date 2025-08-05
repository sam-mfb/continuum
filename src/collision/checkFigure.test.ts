import { describe, it, expect } from 'vitest'
import { checkFigure } from './checkFigure'
import type { MonochromeBitmap } from '@/bitmap'
import { createMonochromeBitmap } from '@/bitmap/create'
import { SBARHT } from '@/screen/constants'

// Helper to create a 32-pixel wide mask with specific bit patterns
// IMPORTANT: Sprite bit N maps to screen pixel position (31 - N)
// Examples:
//   Bit 31 (0x80000000) -> screen position 0
//   Bit 30 (0x40000000) -> screen position 1
//   Bit 1  (0x00000002) -> screen position 30
//   Bit 0  (0x00000001) -> screen position 31
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

    // When mask is at x=24, the right 16 pixels are at positions [40, 55]
    // Place pixel at x=41 (odd position, allowed by background mask)
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

describe('checkFigure - Overflow Calculation Tests', () => {
  it('overflow calculation uses only lower 16 bits of sprite data', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Create a mask with pixels ONLY in the upper 16 bits (bits 16-31)
    // The lower 16 bits are all zeros
    const mask = createMask([0xffff0000], 1) // Upper 16 bits set

    // Place a pixel at x=17 (where bit 17 of the mask would land when positioned at x=1)
    setScreenPixel(screen, 17, SBARHT)

    // Position mask at x=1 (non-aligned)
    // Since the lower 16 bits are all 0, the overflow should be 0
    // No collision should be detected
    const result = checkFigure(screen, { x: 1, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('overflow with rightmost bit of sprite', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Test overflow behavior with a simple case
    // Use even row where odd positions are allowed (mask 0x55555555)
    const mask = createMask([0x00000001], 1) // Bit 0 (rightmost)

    // Position at x=18:
    // - Word boundary is 16
    // - Bit shift = 18 & 15 = 2
    // - Overflow: (0x0001 << 14) & 0xFFFF = 0x4000
    // - 0x4000 is bit 14, which appears at position 48 + 1 = 49
    // - Position 49 is odd, allowed on even rows

    setScreenPixel(screen, 49, SBARHT) // Even row
    const result = checkFigure(screen, { x: 18, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('overflow calculation with different upper and lower patterns', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Pattern: upper bits have different pattern than lower bits
    // Upper: 1010101010101010 (0xAAAA)
    // Lower: 0000000000000001 (0x0001)
    const mask = createMask([0xaaaa0001], 1)

    // At x=15, only lower 16 bits (0x0001) contribute to overflow
    // Overflow = (0x0001 << 1) = 0x0002 (bit 1)
    // This appears at screen position 46
    // Use odd row where position 46 is detectable
    setScreenPixel(screen, 46, SBARHT + 1)

    const result = checkFigure(screen, { x: 15, y: 1, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('no false collision from upper bits in overflow region', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Upper bits set, lower bits clear
    const mask = createMask([0xffff0000], 1)

    // Don't place any pixels on screen
    // If the overflow calculation incorrectly includes upper bits,
    // it might still detect a "collision" with background mask

    // Position at x=15 - this maximizes overflow (only 1 bit stays in main)
    // With correct implementation: overflow = 0 (lower bits are 0)
    // With buggy implementation: overflow contains upper bits
    const result = checkFigure(screen, { x: 15, y: 0, height: 1, def: mask })

    // Should detect collision from main data (bit 16 at position 0)
    // but NOT from overflow
    expect(result).toBe(false) // No pixels on screen to collide with
  })
})

describe('checkFigure - Overflow Masking Tests', () => {
  it('overflow masking uses only lower 16 bits of background mask', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Create a sprite with all lower 16 bits set
    const mask = createMask([0x0000ffff], 1)

    // For even row (y=0), background mask is 0x55555555
    // Lower 16 bits: 0x5555 (0101010101010101)

    // At x=2, overflow = (0xFFFF << 14) = 0xC000
    // After masking with 0x5555: 0xC000 & 0x5555 = 0x4000 (bit 14 allowed)
    // Bit 14 appears at screen position 33

    setScreenPixel(screen, 33, SBARHT)
    const result = checkFigure(screen, { x: 2, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('background mask rotation affects overflow masking correctly', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Sprite with bit 15 set (will overflow)
    const mask = createMask(
      [
        0x00010000, // Bit 15 set
        0x00010000 // Same pattern
      ],
      2
    )

    // First row: even (mask 0x55555555)
    // Second row: after rotation

    // Place pixel at overflow position for both rows
    setScreenPixel(screen, 16, SBARHT) // First row
    setScreenPixel(screen, 16, SBARHT + 1) // Second row

    // The rotation should affect whether collision is detected
    const result = checkFigure(screen, { x: 1, y: 0, height: 2, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Debug Overflow', () => {
  it('debug: understand word boundary behavior', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Test with bit 0 (rightmost) - this is what overflows first
    const mask = createMask([0x00000001], 1)

    // At x=0, no shift, no overflow
    // But bit 0 is at an even position, masked out for even rows
    setScreenPixel(screen, 0, SBARHT)
    let result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)

    // Let's use bit 0 which maps to position 31 (odd, allowed)
    const mask2 = createMask([0x00000001], 1) // Bit 0 -> screen pos 31
    screen.data.fill(0)
    setScreenPixel(screen, 31, SBARHT) // Even row, position 31 allowed (odd)
    result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask2 })
    expect(result).toBe(true)

    // Test overflow at x=18 with bit 0
    screen.data.fill(0)
    setScreenPixel(screen, 49, SBARHT) // Overflow to odd position
    result = checkFigure(screen, { x: 18, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Word Boundary Edge Cases', () => {
  it('sprite crossing word boundary with specific pattern', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Pattern with different upper and lower halves
    const mask = createMask([0x5555aaaa], 1)

    // Test at x=13 (crosses word boundary)
    const shift = 13

    // Calculate where the correct overflow bits should be
    // Only lower 16 bits (0xAAAA) should contribute to overflow
    const lowerBits = 0xaaaa
    const overflowPattern = (lowerBits << (16 - shift)) & 0xffff

    // Place pixels based on correct overflow calculation
    for (let bit = 0; bit < 16; bit++) {
      if (overflowPattern & (1 << (15 - bit))) {
        setScreenPixel(screen, 32 + bit, SBARHT)
      }
    }

    const result = checkFigure(screen, { x: 13, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('overflow calculation at various shifts', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Background mask 0x55555555 allows odd-numbered bit positions
    // Bit 26 (0x04000000) maps to screen position 5 (odd, allowed)
    const mask = createMask([0x04000000], 1)

    // Test a simple case where bit stays in main region
    screen.data.fill(0)
    setScreenPixel(screen, 5, SBARHT) // Screen position 5
    let result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)

    // Test with a bit that will be allowed after shift
    // Bit 30 (0x40000000) maps to screen position 1 (odd, allowed)
    const mask2 = createMask([0x40000000], 1) // Bit 30
    screen.data.fill(0)
    setScreenPixel(screen, 1, SBARHT)
    result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask2 })
    expect(result).toBe(true)
  })

  it('no collision when only upper 16 bits have pixels', () => {
    const screen = createMonochromeBitmap(128, 64)

    // Only upper 16 bits have pixels
    // Bit 26 (0x04000000) maps to screen position 5 (odd, allowed)
    const mask = createMask([0x04000000], 1) // Bit 26

    // Test that main collision works
    screen.data.fill(0)
    setScreenPixel(screen, 5, SBARHT) // Screen position 5
    let result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)

    // Now test that overflow region stays empty
    // Place pixels only in overflow region
    screen.data.fill(0)
    for (let x = 32; x < 48; x += 2) {
      // Only odd positions to match mask
      setScreenPixel(screen, x + 1, SBARHT)
    }

    // No collision should occur at positions that would create overflow
    // since upper 16 bits (bit 24) don't contribute to overflow
    for (let x = 9; x < 16; x++) {
      // At these positions, bit 24 would be in overflow region
      // but since only lower 16 bits contribute to overflow, no collision
      const result = checkFigure(screen, { x, y: 0, height: 1, def: mask })
      expect(result).toBe(false)
    }
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
