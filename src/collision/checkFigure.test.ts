import { describe, it, expect } from 'vitest'
import { checkFigure } from './checkFigure'
import type { MonochromeBitmap } from '@/bitmap'
import { createMonochromeBitmap } from '@/bitmap/create'

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
function setScreenPixel(screen: MonochromeBitmap, x: number, y: number) {
  const byteIndex = y * screen.rowBytes + Math.floor(x / 8)
  const bitMask = 0x80 >> (x % 8)
  screen.data[byteIndex] |= bitMask
}

// Helper to fill screen row with pattern
function fillScreenRow(screen: MonochromeBitmap, y: number, pattern: number) {
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
  it('1. No collision - empty screen', () => {
    const screen = createMonochromeBitmap(128, 64) // Wider than 48 pixels for overflow tests
    const mask = createMask([0x80000000], 1) // Single pixel in top-left of mask
    
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('2. Simple collision - aligned position', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x80000000], 1) // Single pixel in top-left
    
    // Place pixel at (0, 0)
    setScreenPixel(screen, 0, 0)
    
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('3. Simple collision - unaligned position', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x80000000], 1) // Single pixel in top-left
    
    // Place pixel at (5, 0)
    setScreenPixel(screen, 5, 0)
    
    // Position mask at x=5 to collide
    const result = checkFigure(screen, { x: 5, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('4. No collision - mask misses object', () => {
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
  const PATTERN_ODD = 0x55555555  // 01010101...

  it('5. Background pattern ignored - even row', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0xffffffff], 1) // Full row of pixels
    
    // Fill even row (y=0) with dither pattern
    fillScreenRow(screen, 0, PATTERN_EVEN)
    
    // Should not collide with background pattern on even row
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('6. Background pattern ignored - odd row', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0xffffffff], 1) // Full row of pixels
    
    // Fill odd row (y=1) with dither pattern
    fillScreenRow(screen, 1, PATTERN_ODD)
    
    // Should not collide with background pattern on odd row
    const result = checkFigure(screen, { x: 0, y: 1, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('7. Collision through background - even row', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixels only at "white" background positions for even row
    // For even row, background mask is PATTERN_ODD (0x55555555)
    // So we want pixels where background would be white (1s in mask)
    const mask = createMask([0x55555555], 1)
    
    // Fill screen with background pattern AND an object
    fillScreenRow(screen, 0, PATTERN_EVEN)
    // Add object pixels at white background positions
    screen.data[0] |= 0x55 // Add pixels where background is white
    
    const result = checkFigure(screen, { x: 0, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('8. Collision through background - odd row', () => {
    const screen = createMonochromeBitmap(128, 64)
    // For odd row, background mask is PATTERN_EVEN (0xaaaaaaaa)
    const mask = createMask([0xaaaaaaaa], 1)
    
    // Fill screen with background pattern AND an object
    fillScreenRow(screen, 1, PATTERN_ODD)
    // Add object pixels at white background positions
    screen.data[screen.rowBytes] |= 0xaa
    
    const result = checkFigure(screen, { x: 0, y: 1, height: 1, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Overflow Testing', () => {
  it('9. Overflow collision - right edge', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixel at right edge that would overflow
    const mask = createMask([0x00000001], 1) // Rightmost pixel
    
    // Place pixel at x=47 (within 48-pixel check region)
    setScreenPixel(screen, 47, 0)
    
    // Position mask at x=16 so rightmost pixel lands at x=47
    const result = checkFigure(screen, { x: 16, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })

  it('10. No overflow collision beyond 48 pixels', () => {
    const screen = createMonochromeBitmap(128, 64)
    const mask = createMask([0x00000001], 1) // Rightmost pixel
    
    // Place pixel at x=48 (outside 48-pixel check region)
    setScreenPixel(screen, 48, 0)
    
    // Position mask at x=17 so rightmost pixel would be at x=48
    const result = checkFigure(screen, { x: 17, y: 0, height: 1, def: mask })
    expect(result).toBe(false)
  })

  it('11. Partial overflow', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Mask with pixels that will partially overflow
    const mask = createMask([0x0000ffff], 1) // Right half of mask has pixels
    
    // Place pixel at x=40 (will be hit by overflowing pixels)
    setScreenPixel(screen, 40, 0)
    
    // Position mask at x=25 so right pixels overflow and hit x=40
    const result = checkFigure(screen, { x: 25, y: 0, height: 1, def: mask })
    expect(result).toBe(true)
  })
})

describe('checkFigure - Complex Scenarios', () => {
  it('17. Complex shape collision', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a complex mask shape (like a ship)
    const mask = createMask([
      0x00180000, // Row 0:    ##
      0x003c0000, // Row 1:   ####
      0x007e0000, // Row 2:  ######
      0x00ff0000, // Row 3: ########
      0x007e0000, // Row 4:  ######
      0x003c0000, // Row 5:   ####
      0x00180000  // Row 6:    ##
    ], 7)
    
    // Place some terrain on screen that intersects with the mask
    for (let y = 2; y < 5; y++) {
      for (let x = 8; x < 16; x++) {
        setScreenPixel(screen, x, y)
      }
    }
    
    // Position mask to collide with terrain
    const result = checkFigure(screen, { x: 0, y: 0, height: 7, def: mask })
    expect(result).toBe(true)
  })

  it('18. Near miss scenarios', () => {
    const screen = createMonochromeBitmap(128, 64)
    // Create a mask with specific pixels
    const mask = createMask([
      0x80000000, // Pixel at x=0
      0x40000000, // Pixel at x=1
      0x20000000  // Pixel at x=2
    ], 3)
    
    // Place pixels that are adjacent but don't overlap
    setScreenPixel(screen, 3, 0) // Just to the right
    setScreenPixel(screen, 0, 3) // Just below
    
    // Should not collide
    const result = checkFigure(screen, { x: 0, y: 0, height: 3, def: mask })
    expect(result).toBe(false)
  })
})