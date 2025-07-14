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
import { SBARHT } from '@/screen/constants'

const main = (): void => {
  // 1. Define the single line to be rendered.
  const singleLine: LineRec[] = [
    {
      id: 'line-0',
      startx: 50,
      starty: 30,
      endx: 50,
      endy: 55,
      length: 25,
      type: LINE_TYPE.N,
      up_down: LINE_DIR.DN,
      kind: LINE_KIND.NORMAL,
      newtype: NEW_TYPE.S,
      nextId: null,
      nextwhId: null
    }
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
    r: bitmap.width
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
  const margin = 20
  const clip = {
    top: singleLine[0]!.starty + SBARHT - margin,
    left: singleLine[0]!.startx - margin,
    bottom: singleLine[0]!.endy + SBARHT + margin,
    right: singleLine[0]!.endx + 10 + margin
  }

  // 8. Visualize the clipped area of the bitmap.
  console.log('--- Single Line Render (Clipped) ---')
  console.log(visualizeBitmap(renderedBitmap, clip))
}

main()
