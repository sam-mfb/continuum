import type { MonochromeBitmap } from '@/bitmap'
import { BACKGROUND_PATTERNS } from '../screen/constants'

/**
 * Checks if the figure to be drawn will collide with non-background
 * black pixels on the screen.
 *
 * See check-figure() at orig/Source/Draw.c:227-273
 */
export function checkFigure(
  screen: MonochromeBitmap,
  args: {
    x: number
    y: number
    height: number
    /** actual bytes of figure to be drawn (serves the purpose of *def ptr in original code **/
    defIndex: Uint8Array
  }
): boolean {
  // TODO: implement
  return false
}
