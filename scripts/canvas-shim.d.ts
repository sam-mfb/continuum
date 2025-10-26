/**
 * Type shim to provide DOM canvas types in Node.js environment
 * These types are compatible with the 'canvas' package
 */

// Provide minimal DOM canvas types for bitmap utilities
declare class ImageData {
  constructor(width: number, height: number)
  constructor(data: Uint8ClampedArray, width: number, height?: number)
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

interface HTMLCanvasElement {
  width: number
  height: number
}

interface CanvasRenderingContext2D {
  readonly canvas: HTMLCanvasElement
  createImageData(width: number, height: number): ImageData
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData
  putImageData(imageData: ImageData, dx: number, dy: number): void
}
