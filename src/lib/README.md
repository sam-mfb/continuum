# Helper Libraries

Modern utility libraries that support the game implementation. These are not direct ports from the original game but provide necessary infrastructure.

## Libraries

### `asm/`
68K assembly emulator for executing ported assembly code. Provides:
- Instruction set implementation
- Register management
- Macro support for common assembly patterns
- Used for performance-critical routines ported directly from assembly

### `bitmap/`
Monochrome bitmap rendering system. Provides:
- Creation and manipulation of black & white bitmaps
- Efficient pixel operations
- Conversion utilities for different formats
- Canvas rendering adapters
- Core rendering primitive for the entire game

## Usage

These libraries are imported throughout the codebase using the `@lib/*` path alias:
```typescript
import { createMonochromeBitmap } from '@lib/bitmap'
import { emulator } from '@lib/asm'
```