# Junctions.c Function Mapping

Direct one-to-one mapping of C functions from Junctions.c to pure JavaScript modules.

## Initialization Functions

### init_walls()

**Original**: `void init_walls(void)` - Junctions.c
**Pure JS**: `src/walls/init/initWalls.ts`

```typescript
// Main orchestrator (pure composition)
export function initWalls(walls: LineRec[]): {
  organizedWalls: Record<string, LineRec>
  kindPointers: Record<LineKind, string>
  firstWhite: string
  junctions: JunctionRec[]
  whites: WhiteRec[]
  updatedWalls: LineRec[]
}

// Sub-functions (pure logic)
function organizeWallsByKind(walls: LineRec[]): {
  organizedWalls: Record<string, LineRec>
  kindPointers: Record<LineKind, string>
}

function findFirstWhiteWalls(walls: LineRec[]): string

function detectWallJunctions(walls: LineRec[]): JunctionRec[]
```

### init_whites()

**Original**: `void init_whites(void)` - Junctions.c
**Pure JS**: `src/walls/init/initWhites.ts`

```typescript
// Main orchestrator (pure composition)
export function initWhites(
  walls: LineRec[],
  junctions: JunctionRec[]
): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
}

// Sub-functions (pure logic)
function sortWhitesByX(whites: WhiteRec[]): WhiteRec[]

function mergeOverlappingWhites(whites: WhiteRec[]): WhiteRec[]
```

### norm_whites()

**Original**: `void norm_whites(void)` - Junctions.c
**Pure JS**: `src/walls/init/normWhites.ts`

```typescript
export function normWhites(walls: LineRec[]): WhiteRec[]
```

### close_whites()

**Original**: `void close_whites(void)` - Junctions.c
**Pure JS**: `src/walls/init/closeWhites.ts`

```typescript
// Main orchestrator (pure composition)
export function closeWhites(walls: LineRec[]): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
}

// Sub-functions (pure logic)
function findCloseWallPairs(walls: LineRec[]): Array<[LineRec, LineRec]>

function processCloseWalls(wallPairs: Array<[LineRec, LineRec]>): {
  patches: WhiteRec[]
  wallUpdates: Array<{ wallId: string; h1?: number; h2?: number }>
}

function updateWallOptimization(
  walls: LineRec[],
  updates: Array<{ wallId: string; h1?: number; h2?: number }>
): LineRec[]
```

### one_close()

**Original**: `void one_close(line1p, line2p)` - Junctions.c
**Pure JS**: `src/walls/init/oneClose.ts`

```typescript
export function oneClose(
  wall1: LineRec,
  wall2: LineRec
): {
  patches: WhiteRec[]
  wall1Updates: { h1?: number; h2?: number }
  wall2Updates: { h1?: number; h2?: number }
}
```

### white_hash_merge()

**Original**: `void white_hash_merge(void)` - Junctions.c
**Pure JS**: `src/walls/init/whiteHashMerge.ts`

```typescript
export function whiteHashMerge(
  whites: WhiteRec[],
  junctions: JunctionRec[]
): WhiteRec[] // whites with hash patterns added
```

## Notes

- Each JavaScript module exports a single main function that corresponds to the C function
- Helper functions within each module are private implementation details
- All functions are pure: no mutations, no side effects
- The giant switch statement in `one_close()` will be handled internally within that module
- Sorting and merging operations that were done in-place in C return new arrays in JS

