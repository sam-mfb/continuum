import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'

/**
 * From draw_bunker() in orig/Sources/Draw.c at 715-823
 */
export function drawBunker(deps: {
  x: number
  y: number
  def: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const newScreen = cloneBitmap(screen)
    // TODO:Implement
    return newScreen
  }
}

/**
 * From full_bunker() in orig/Sources/Draw.c at 826-941
 */
export function fullBunker(deps: {
  x: number
  y: number
  def: MonochromeBitmap
  mask: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const newScreen = cloneBitmap(screen)
    //TODO: Implement
    return newScreen
  }
}
