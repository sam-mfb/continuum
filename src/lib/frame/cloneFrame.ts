import type { Frame } from './types'

/**
 * Creates a shallow clone of a Frame.
 * The drawables array is cloned, but individual drawable objects are not.
 */
export function cloneFrame(frame: Frame): Frame {
  return {
    width: frame.width,
    height: frame.height,
    drawables: [...frame.drawables]
  }
}
