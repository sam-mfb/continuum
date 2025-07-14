/**
 * A function to visualize MonochromeBitmap objects in the terminal.
 */

import type { MonochromeBitmap } from './types'
import { getPixel } from './operations'

type ClipRect = {
  top: number
  left: number
  bottom: number
  right: number
}

/**
 * Generates a string visualization of a MonochromeBitmap.
 * @param bitmap The bitmap to visualize.
 * @param clip An optional rectangle to limit the visualized area.
 * @returns A string representing the bitmap, with '█' for black pixels and ' ' for white pixels.
 */
export const visualizeBitmap = (
  bitmap: MonochromeBitmap,
  clip?: ClipRect,
): string => {
  const top = Math.max(0, clip?.top ?? 0)
  const left = Math.max(0, clip?.left ?? 0)
  const bottom = Math.min(bitmap.height, clip?.bottom ?? bitmap.height)
  const right = Math.min(bitmap.width, clip?.right ?? bitmap.width)

  if (top >= bottom || left >= right) {
    return ''
  }

  const lines: string[] = []
  const contentWidth = right - left
  const gutterWidth = String(bottom - 1).length

  const ruler = Array.from({ length: contentWidth }, (_, i) => {
    const x = left + i
    return (x + 1) % 10 === 0 ? '|' : ' '
  }).join('')

  const header = ' '.repeat(gutterWidth + 1) + ruler
  lines.push(header)

  for (let y = top; y < bottom; y++) {
    const rowNum = String(y).padStart(gutterWidth, ' ')
    let rowContent = ''
    for (let x = left; x < right; x++) {
      rowContent += getPixel(bitmap, x, y) ? '█' : ' '
    }
    lines.push(rowNum + ' ' + rowContent)
  }

  lines.push(header)
  return lines.join('\n')
}
