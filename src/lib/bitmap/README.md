# Bitmap Library

Monochrome (1-bit) bitmap manipulation for recreating original Macintosh 512x342 black-and-white graphics. Provides authentic retro graphics programming with direct pixel manipulation.

## Purpose and Functionality

Emulates the original Mac's bitmap format where each pixel is represented as a single bit (0=white, 1=black). Enables faithful recreation of classic Mac graphics and easy porting of original assembly code.

## Main APIs/Exports

- `createMonochromeBitmap(width, height)` - Creates new bitmap
- `setPixel()`, `clearPixel()`, `getPixel()`, `xorPixel()` - Pixel operations
- `bitmapToCanvas()`, `canvasToBitmap()` - Canvas conversion utilities
- `BitmapRenderer` type for GameView integration

## Usage Examples

```typescript
import { createMonochromeBitmap, setPixel } from '@/lib/bitmap'

// Create 512x342 bitmap (Mac screen size)
const bitmap = createMonochromeBitmap(512, 342)

// Draw pixels
setPixel(bitmap, 100, 50) // Set pixel to black
clearPixel(bitmap, 100, 51) // Set pixel to white
```
