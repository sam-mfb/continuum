import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'

/**
 * Draw the bunker's bullets/shots on the bitmap
 *
 * See DRAW_SHOT() in orig/Sources/Macros.h:18-25
 */
export function drawShot(deps: {
  x: number
  y: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    // TODO: Implement shot drawing based on DRAW_SHOT macro
    // This would use drawDotSafe from ./drawDotSafe.ts
    // For now, just return the screen unchanged
    void deps // Suppress unused variable warning
    
    const newScreen = cloneBitmap(screen)
    return newScreen
  }
}
