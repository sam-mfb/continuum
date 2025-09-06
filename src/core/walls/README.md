# Walls Module

Manages collision walls and line segments for planet surfaces and barriers. Handles wall creation, packing/unpacking, and collision detection for terrain boundaries.

## Key Files
- `wallsSlice.ts` - Redux slice for wall state management
- `createLine.ts` - Line segment creation and wall generation
- `packLine.ts` / `unpackLine.ts` - Wall data compression and storage
- `unpack.ts` - Wall data decompression and initialization
- `render/` - Wall and line segment rendering
- `init/` - Wall initialization and setup utilities
- `whiteBitmaps.ts` - Wall collision bitmap generation

## Original Source
Based on original wall logic from `orig/Sources/Walls.c` and terrain collision systems.