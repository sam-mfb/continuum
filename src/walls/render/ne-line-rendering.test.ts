import { describe, it, expect } from 'vitest'
import { createMonochromeBitmap, setPixel, getPixel } from '../../bitmap'
import type { LineRec } from '../types'
import { LINE_KIND, NEW_TYPE } from '../types'
import { createWall } from '../unpack'
import { initWalls } from '../init'
import { whiteTerrain, blackTerrain } from '../render'

describe('NE line rendering', () => {
  it('renders continuous black line including pixels at y=110 and y=111', () => {
    // Create the NE wall line
    const singleLine: LineRec[] = [
      createWall(190, 108, 25, NEW_TYPE.NE, LINE_KIND.NORMAL, 6)
    ]

    // Initialize wall system
    const wallState = initWalls(singleLine)

    const offset = 14
    const viewport = {
      x: 0 + offset,
      y: 0,
      b: 342,
      r: 512 + offset
    }

    // Create bitmap with crosshatch background
    const bitmap = createMonochromeBitmap(512, 342)
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        const worldX = x + viewport.x
        const worldY = y + viewport.y
        if ((worldX + worldY) % 2 === 0) {
          setPixel(bitmap, x, y)
        }
      }
    }

    // Render white terrain
    let renderedBitmap = whiteTerrain({
      ...wallState,
      viewport,
      worldwidth: bitmap.width
    })(bitmap)

    // Render black terrain
    renderedBitmap = blackTerrain({
      ...wallState,
      thekind: LINE_KIND.NORMAL,
      viewport,
      worldwidth: bitmap.width
    })(renderedBitmap)

    // Find two contiguous black pixels on line 112
    let baseX = -1
    for (let x = 0; x < 511; x++) {
      if (getPixel(renderedBitmap, x, 112) && getPixel(renderedBitmap, x + 1, 112)) {
        baseX = x
        break
      }
    }
    
    // Make sure we found the black line
    expect(baseX).not.toBe(-1)
    
    // Check the diagonal pattern with slope of 1
    // Line 112 - should pass (base position)
    expect(getPixel(renderedBitmap, baseX, 112)).toBe(true)
    expect(getPixel(renderedBitmap, baseX + 1, 112)).toBe(true)
    
    // Line 109 - should pass (three pixels to the right)
    expect(getPixel(renderedBitmap, baseX + 3, 109)).toBe(true)
    expect(getPixel(renderedBitmap, baseX + 4, 109)).toBe(true)
    
    // Line 111 - currently fails, but should pass when bug is fixed (one pixel to the right)
    expect(getPixel(renderedBitmap, baseX + 1, 111)).toBe(true)
    expect(getPixel(renderedBitmap, baseX + 2, 111)).toBe(true)
    
    // Line 110 - currently fails, but should pass when bug is fixed (two pixels to the right)
    expect(getPixel(renderedBitmap, baseX + 2, 110)).toBe(true)
    expect(getPixel(renderedBitmap, baseX + 3, 110)).toBe(true)
  })
})