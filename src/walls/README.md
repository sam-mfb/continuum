# Wall System

This directory contains the wall (line) creation and rendering system for Continuum.

## Line Creation Flow

The complete flow for creating and preparing lines matches the original Continuum workflow:

```typescript
import { createLine } from './createLine'
import { packLine } from './packLine'
import { unpackLine } from './unpackLine'

// 1. Create a line (editor logic)
const created = createLine(100, 100, 150, 100, {
  kind: LINE_KIND.NORMAL,
  safeMode: false
})

// 2. Pack the line (save to file format)
// This strips calculated fields to save space
const packed = packLine(created)
// packed only contains: startx, starty, length, type, up_down, kind

// 3. Unpack the line (load from file format)
// This recalculates endpoints and other derived fields
const unpacked = unpackLine(packed, 'line-1')

// 4. Initialize walls for rendering
store.dispatch(wallsActions.initWalls({ walls: [unpacked] }))
```

## Key Functions

### `createLine(x1, y1, x2, y2, options)`
Creates a line from two points with angle snapping and constraints:
- Snaps to one of 8 directions (N, NNE, NE, ENE, E, ESE, SE, SSE)
- Calculates length using Manhattan distance
- Forces odd lengths for diagonal lines (NNE, ENE)
- Stores lines left-to-right (smallest x first)
- Based on the original editor's `linestuff()` function

### `packLine(line)`
Reduces a complete line to minimal storage format:
- Keeps only: startx, starty, length, type, up_down, kind
- Removes calculated fields: endx, endy, newtype, id
- Saves ~57% storage space
- Based on `pack_planet()` function

### `unpackLine(packed, id?)`
Reconstructs a complete line from packed data:
- Recalculates endpoints using xlength/ylength lookup tables
- Forces odd lengths for NNE/ENE lines
- Computes newtype field
- Based on `unpack_planet()` and `parsePlanet()` functions

## Coordinate System

The game uses a rotated coordinate system:
- Screen East (right) = Game North (LINE_TYPE.N)
- Screen North (up) = Game East (LINE_TYPE.E)
- This is why horizontal lines have type N and vertical lines have type E

## Testing

Run all wall-related tests:
```bash
npm run test -- src/walls/
```

Key test files:
- `createLine.test.ts` - Line creation logic
- `lineFlow.integration.test.ts` - Complete create->pack->unpack flow
- `init/*.test.ts` - Wall initialization and rendering preparation