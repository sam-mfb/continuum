/**
 * Core types for bitmap manipulation and rendering
 */

/**
 * Represents a monochrome screen bitmap
 * Each byte holds 8 pixels (1 bit per pixel)
 * Matches the original Macintosh display format.
 *
 * IMPORTANT: Bit ordering within bytes is big-endian:
 * - Leftmost pixel (x=0) is the Most Significant Bit (0x80)
 * - Rightmost pixel (x=7) is the Least Significant Bit (0x01)
 *
 * Example byte 0xA5 (10100101) represents pixels: ■ □ ■ □ □ ■ □ ■
 *
 * This matches the original 68000 Mac architecture and is used
 * consistently throughout the codebase for rendering and collision detection.
 *
 * For example, the original Mac screen used by the
 * game is a 512 x 342 bitmap. Sprites in the game
 * are typically 32 x 8n bitmaps.
 */
export type MonochromeBitmap = {
  /** Raw bitmap data - each byte holds 8 pixels (big-endian bit order) */
  data: Uint8Array
  /** Width in pixels (512 for Mac screen) */
  width: number
  /** Height in pixels (342 for Mac screen) */
  height: number
  /** Bytes per row (width / 8) */
  rowBytes: number
}

/**
 * Frame timing information
 * Contains only timing data for the current frame
 */
export type FrameInfo = {
  /** Total frames since start */
  frameCount: number
  /** Milliseconds since last frame */
  deltaTime: number
  /** Total milliseconds since start */
  totalTime: number
  /** Expected ms between frames (1000/fps) */
  targetDelta: number
}

/**
 * Keyboard input state
 * Contains keyboard state for the current frame
 */
export type KeyInfo = {
  /** Currently pressed keys */
  keysDown: Set<string>
  /** Keys pressed this frame */
  keysPressed: Set<string>
  /** Keys released this frame */
  keysReleased: Set<string>
}

/**
 * Frame information passed to bitmap renderers (DEPRECATED)
 * Contains timing and input state for the current frame
 * @deprecated Use FrameInfo and KeyInfo separately
 */
export type GameFrameInfo = {
  // Timing
  /** Total frames since start */
  frameCount: number
  /** Milliseconds since last frame */
  deltaTime: number
  /** Total milliseconds since start */
  totalTime: number
  /** Expected ms between frames (1000/fps) */
  targetDelta: number

  // Input
  /** Currently pressed keys */
  keysDown: Set<string>
  /** Keys pressed this frame */
  keysPressed: Set<string>
  /** Keys released this frame */
  keysReleased: Set<string>
}

/**
 * Environment information for the game
 * Contains display dimensions and target framerate
 */
export type GameEnvironment = {
  /** Display width in pixels */
  width: number
  /** Display height in pixels */
  height: number
  /** Target frames per second */
  fps: number
}

/**
 * Function that renders a monochrome bitmap
 * Creates and returns a new bitmap for each frame
 */
export type BitmapRenderer = (
  frame: FrameInfo,
  keys: KeyInfo
) => MonochromeBitmap

/**
 * Function that renders to a monochrome bitmap (DEPRECATED)
 * Returns a new bitmap rather than mutating the input
 * @deprecated Use the new BitmapRenderer signature
 */
export type LegacyBitmapRenderer = (
  bitmap: MonochromeBitmap,
  frame: GameFrameInfo,
  env: GameEnvironment
) => MonochromeBitmap

/**
 * Options for converting bitmap to canvas
 */
export type BitmapToCanvasOptions = {
  /** Color for set pixels (1s) */
  foregroundColor?: string // Default: 'black'
  /** Color for unset pixels (0s) */
  backgroundColor?: string // Default: 'white'
}

/**
 * Rectangle type for region operations
 */
export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}
