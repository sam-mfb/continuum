# Bitmap Module

This module provides monochrome (1-bit) bitmap manipulation functionality, designed to emulate the original Macintosh's 512x342 black-and-white display. It enables authentic retro graphics programming with direct pixel manipulation.

## Architecture

### Core Concept

The bitmap system represents pixels as individual bits, where:

- **0** = White (unset pixel)
- **1** = Black (set pixel)

Each byte stores 8 pixels, with the most significant bit (MSB) representing the leftmost pixel. This matches the original Macintosh bitmap format.

### Module Structure

```
bitmap/
├── types.ts        # Core type definitions
├── create.ts       # Bitmap creation and initialization
├── operations.ts   # Pixel manipulation functions
├── conversion.ts   # Bitmap ↔ Canvas conversions
├── adapter.ts      # GameLoop integration
└── index.ts        # Public API exports
```

### Key Types

#### `MonochromeBitmap`

The fundamental data structure representing a black-and-white bitmap:

```typescript
type MonochromeBitmap = {
  data: Uint8Array // Raw bitmap data (1 bit per pixel)
  width: number // Width in pixels
  height: number // Height in pixels
  rowBytes: number // Bytes per row (width / 8)
}
```

#### `BitmapRenderer`

A function that draws to a monochrome bitmap:

```typescript
type BitmapRenderer = (
  bitmap: MonochromeBitmap,
  frame: GameFrameInfo,
  env: GameEnvironment
) => void
```

## Usage

### Basic Pixel Operations

```typescript
import {
  createMonochromeBitmap,
  setPixel,
  clearPixel,
  getPixel
} from './bitmap'

// Create a 512x342 bitmap (Mac screen size)
const bitmap = createMonochromeBitmap(512, 342)

// Set a pixel (make it black)
setPixel(bitmap, 100, 50)

// Clear a pixel (make it white)
clearPixel(bitmap, 100, 50)

// Check if a pixel is set
const isBlack = getPixel(bitmap, 100, 50) // returns boolean

// Toggle a pixel
xorPixel(bitmap, 100, 50)
```

### Drawing Patterns

```typescript
// Create a checkerboard pattern
for (let y = 0; y < bitmap.height; y++) {
  for (let x = 0; x < bitmap.width; x++) {
    if ((x + y) % 2 === 0) {
      setPixel(bitmap, x, y)
    }
  }
}

// Draw a horizontal line
for (let x = 0; x < bitmap.width; x++) {
  setPixel(bitmap, x, 100)
}

// Draw a filled rectangle
for (let y = 50; y < 150; y++) {
  for (let x = 100; x < 200; x++) {
    setPixel(bitmap, x, y)
  }
}
```

### Integration with GameView

The bitmap module integrates seamlessly with the GameView component through a discriminated union pattern:

```typescript
import type { BitmapGameDefinition } from '../app/components/GameView'
import { setPixel } from '../bitmap'

// Define a bitmap renderer
const myRenderer: BitmapRenderer = (bitmap, frame, env) => {
  // Clear bitmap (already done automatically)

  // Draw your graphics
  for (let x = 0; x < bitmap.width; x++) {
    const y = Math.sin(x * 0.1 + frame.totalTime * 0.001) * 50 + bitmap.height / 2
    setPixel(bitmap, x, Math.floor(y))
  }
}

// Create game definition
const myBitmapGame: BitmapGameDefinition = {
  type: 'bitmap',
  name: 'My Bitmap Game',
  bitmapRenderer: myRenderer,
  bitmapOptions: {
    foregroundColor: 'black',
    backgroundColor: 'white'
  }
}

// Use in GameView
<GameView games={[myBitmapGame]} />
```

### Canvas Conversion

Convert between bitmap and canvas representations:

```typescript
import { bitmapToCanvas, canvasToBitmap, bitmapToImageData } from './bitmap'

// Render bitmap to canvas
const ctx = canvas.getContext('2d')
bitmapToCanvas(bitmap, ctx, {
  foregroundColor: 'black',
  backgroundColor: 'white'
})

// Convert canvas content to bitmap (with threshold)
const bitmap = canvasToBitmap(ctx, 0, 0, width, height, 128)

// Get ImageData for direct pixel access
const imageData = bitmapToImageData(bitmap, {
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF'
})
```

## Performance Considerations

### Bit Operations

- Pixel operations work directly on bytes using bit masks
- Byte-aligned operations (x coordinates that are multiples of 8) are fastest
- The MSB-first bit order matches the original Macintosh format

### Memory Layout

- Each row is padded to byte boundaries
- Total memory usage: `rowBytes * height` bytes
- For 512x342: 64 bytes/row × 342 rows = 21,888 bytes

### Optimization Tips

1. **Batch Operations**: Modify multiple pixels in the same byte together
2. **Row-wise Access**: Process pixels row by row for better cache locality
3. **Avoid Repeated Conversions**: Convert to canvas only once per frame
4. **Use Byte Operations**: When possible, work with entire bytes instead of individual bits

## Example: Dithering Pattern

Create a gray appearance using alternating pixels:

```typescript
const grayPattern: BitmapRenderer = bitmap => {
  // Floyd-Steinberg dithering pattern
  const pattern = [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0]
  ]

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (pattern[y % 4][x % 4]) {
        setPixel(bitmap, x, y)
      }
    }
  }
}
```

## Compatibility

This module is designed to closely match the original Macintosh bitmap format:

- 1 bit per pixel (monochrome)
- MSB-first bit ordering
- Row-based memory layout
- Direct pixel manipulation

This enables authentic recreation of classic Mac graphics and makes it easier to port original 68K assembly code that manipulates screen memory directly.
