/**
 * A Node.js script to visualize the rendering of a single wall line.
 *
 * Usage:
 * vite-node src/walls/scripts/single-line-render.ts
 */

import { createMonochromeBitmap, setPixel } from '../../bitmap'
import { visualizeBitmap } from '../../bitmap/visualize'
import type { LineRec } from '../types'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from '../types'
import { initWalls } from '../init'
import { whiteTerrain, blackTerrain } from '../render'

const main = () => {
  // 1. Define the single line to be rendered.
  const singleLine: LineRec[] = [
    {
      id: 'test-line',
      startx: 200,
      starty: 100,
      endx: 200,
      endy: 150,
      length: 50,
      type: LINE_TYPE.N,
      up_down: LINE_DIR.DN,
      kind: LINE_KIND.NORMAL,
      newtype: NEW_TYPE.S,
      nextId: null,
      nextwhId: null,
    },
  ]

  // 2. Initialize the wall system state.
  const wallState = initWalls(singleLine)

  // 3. Create a bitmap to render on.
  const bitmap = createMonochromeBitmap(512, 342)

  // 4. Create a gray crosshatch background.
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if ((x + y) % 2 === 0) {
        setPixel(bitmap, x, y)
      }
    }
  }

  // 5. Set up the viewport for rendering.
  const viewport = {
    x: 0,
    y: 0,
    b: bitmap.height,
    r: bitmap.width,
  }

  // 6. Render the white and black terrain.
  let renderedBitmap = whiteTerrain(bitmap, {
    ...wallState,
    viewport,
    worldwidth: bitmap.width,
  })

  renderedBitmap = blackTerrain(renderedBitmap, {
    ...wallState,
    thekind: LINE_KIND.NORMAL,
    viewport,
    worldwidth: bitmap.width,
  })

  // 7. Define the clipping rectangle with a 50px margin.
  const margin = 50
  const clip = {
    top: singleLine[0].starty - margin,
    left: singleLine[0].startx - margin,
    bottom: singleLine[0].endy + margin,
    right: singleLine[0].endx + margin,
  }

  // 8. Visualize the clipped area of the bitmap.
  console.log('--- Single Line Render (Clipped) ---')
  console.log(visualizeBitmap(renderedBitmap, clip))
}

main()
