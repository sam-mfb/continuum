/**
 * A Node.js script to visualize the rendering of a single wall line.
 *
 * Usage:
 * vite-node src/walls/scripts/single-line-render.ts
 */

import { createMonochromeBitmap, setPixel } from '@lib/bitmap'
import { visualizeBitmap } from '@lib/bitmap/visualize'
import type { LineRec } from '../types'
import { LINE_KIND, NEW_TYPE } from '../types'
import { createWall } from '../unpack'
import { initWalls } from '../init'
import { whiteTerrain, blackTerrain } from '../render'
import { SBARHT } from '@core/screen'

const main = (): void => {
  // 1. Define the single line to be rendered using createWall.
  const singleLine: LineRec[] = [
    // NEW_TYPE.SSE (2) - South-Southeast
    createWall(120, 30, 25, NEW_TYPE.SSE, LINE_KIND.NORMAL, 0)
  ]

  // 2. Initialize the wall system state.
  const wallState = initWalls(singleLine)

  // 3. Set up the viewport for rendering.
  const viewport = {
    x: 0,
    y: 0,
    b: 342,
    r: 512
  }

  // 4. Create a bitmap to render on.
  const bitmap = createMonochromeBitmap(512, 342)

  // 5. Create a gray crosshatch background.
  // IMPORTANT: Pattern must be based on world coordinates, not screen coordinates
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const worldX = x + viewport.x
      const worldY = y + viewport.y
      if ((worldX + worldY) % 2 === 0) {
        setPixel(bitmap, x, y)
      }
    }
  }

  // 6. Render the white and black terrain.
  let renderedBitmap = whiteTerrain({
    ...wallState,
    viewport,
    worldwidth: bitmap.width
  })(bitmap)

  renderedBitmap = blackTerrain({
    ...wallState,
    thekind: LINE_KIND.NORMAL,
    viewport,
    worldwidth: bitmap.width
  })(renderedBitmap)

  // 7. Define the clipping rectangle with a 50px margin.
  const marginbig = 20
  const marginsmall = 10
  const clip = {
    top: singleLine[0]!.starty + SBARHT - marginsmall,
    left: singleLine[0]!.startx - marginsmall,
    bottom: singleLine[0]!.endy + SBARHT + marginsmall,
    right: singleLine[0]!.endx + marginbig
  }

  // 8. Visualize the clipped area of the bitmap.
  console.log('--- Single Line Render (Clipped) ---')
  console.log(visualizeBitmap(renderedBitmap, clip))
}

main()
