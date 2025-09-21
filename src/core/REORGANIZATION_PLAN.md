# Core Package Export Reorganization Plan

## Objectives
1. Each package exports only from `index.ts` OR also from `render/index.ts` if it has a render/ subdirectory
2. No duplicate exports between `index.ts` and `render/index.ts`
3. Export only what is actually used by existing code
4. Remove all imports from outside the `core/` directory

## Phase 1: Fix External Dependencies ✅ COMPLETED
**Priority: High | Risk: Low**

### 1.1 Remove game dependencies from transition package ✅
- **File**: `src/core/transition/transitionThunks.ts`
- **Problem**: Imports from `@/game/store` and `@/game/levelManager`
- **Solution IMPLEMENTED**:
  - Refactored to use callback pattern for level transitions
  - Created `TransitionRootState` type to avoid importing from game/store
  - Refactored transition system to eliminate global state
  - Created `FizzTransitionService` to manage transition state
  - Made `addStatusBar` and `createTargetBitmap` callbacks passed from consumer
  - Moved `starBackground` to `transition/render/`
  - Created `starBackgroundWithShip` helper function

### 1.2 Remove game dependency from ship package ✅
- **File**: `src/core/ship/shipSlice.ts`
- **Problem**: Imports `SHIPSTART` from `../../game/constants`
- **Solution IMPLEMENTED**:
  - Moved `SHIPSTART` constant into `src/core/ship/constants.ts`
  - Updated game/constants to re-export from core/ship for backward compatibility

## Phase 2: Create Missing Structure
**Priority: High | Risk: Low**

### 2.1 Add index.ts to highscore package
- Create `src/core/highscore/index.ts`
- Export:
  ```typescript
  export * from './types';
  export { highscoreSlice } from './highscoreSlice';
  export { highscoreMiddleware } from './highscoreMiddleware';
  ```

### 2.2 Create render/index.ts for packages with render subdirectories
Create `render/index.ts` for:
- `explosions`
- `planet`
- `ship`
- `shots`

## Phase 3: Resolve Duplicate Exports ✅ COMPLETED
**Priority: Medium | Risk: Medium**

### 3.1 Screen package ✅
- **Status**: Already correctly re-exporting from `./render`
- No duplicates found

### 3.2 Status package ✅
- **Status**: Already correctly re-exporting from `./render`
- No duplicates found

### 3.3 Walls package ✅
- **Status**: Already correctly re-exporting from `./render`
- No duplicates found

## Phase 4: Clean Up Unused Exports
**Priority: Low | Risk: Low**

### 4.1 Remove unused optimized functions
Remove from exports (keep implementation if needed for future):
- `screen/render/index.ts`: Remove `viewClearOptimized`, `setScreenOptimized`
- `status/render/index.ts`: Remove `sbarClearOptimized`

### 4.2 Remove internal-only exports from planet
Stop exporting from `planet/index.ts`:
- `drawMedium` (only used internally)
- `fullBunker` (only used internally)

### 4.3 Review rarely used exports
Consider removing or marking as internal:
- `shared`: `generateLineId` (only used by planet internally)
- `screen`: `clearPoint` (only used internally)
- Various shot functions that are only used internally

## Phase 5: Standardize Export Patterns
**Priority: Medium | Risk: Low**

### 5.1 Explosions package
Move render exports to `render/index.ts`:
```typescript
// src/core/explosions/render/index.ts
export { drawExplosions } from './drawExplosions';
export { drawShard } from './drawShard';
export { drawSparkSafe } from './drawSparkSafe';

// src/core/explosions/index.ts
// Remove direct render imports, re-export from render
export * from './render';
```

### 5.2 Planet package
Move render exports to `render/index.ts`:
```typescript
// src/core/planet/render/index.ts
export { doBunks, drawBunker } from './bunker';
export { drawCraters } from './drawCraters';
export { drawFuels } from './drawFuels';
// Don't export drawMedium and fullBunker (internal only)

// src/core/planet/index.ts
// Re-export from render
export * from './render';
```

### 5.3 Ship package
Move render exports to `render/index.ts`:
```typescript
// src/core/ship/render/index.ts
export { drawFigure } from './drawFigure';
export { eraseFigure } from './eraseFigure';
export { flameOn } from './flameOn';
export { fullFigure } from './fullFigure';
export { grayFigure } from './grayFigure';
export { shiftFigure } from './shiftFigure';

// src/core/ship/index.ts
// Re-export from render
export * from './render';
```

### 5.4 Shots package
Move render exports to `render/index.ts`:
```typescript
// src/core/shots/render/index.ts
export { blackSmall } from './blackSmall';
export { drawDotSafe } from './drawDotSafe';
export { drawShipShot } from './drawShipShot';
export { drawStrafe } from './drawStrafe';

// src/core/shots/index.ts
// Re-export from render
export * from './render';
```

## Phase 6: Update Import Statements
**Priority: High | Risk: Medium**

### 6.1 Update all imports to use package index files
- Search and replace all direct file imports to use package index
- Example: Change `from '@/core/planet/planetSlice'` to `from '@/core/planet'`

### 6.2 Update store.ts to import slices from index files
- Change direct slice imports to use package exports
- This ensures consistency and maintainability

## Implementation Order

1. **Phase 1** - Fix external dependencies (blocks other work)
2. **Phase 2** - Create missing structure (foundation)
3. **Phase 3** - Resolve duplicate exports (cleanup)
4. **Phase 5** - Standardize export patterns (consistency)
5. **Phase 6** - Update import statements (final integration)
6. **Phase 4** - Clean up unused exports (optimization)

## Testing Strategy

After each phase:
1. Run `npm run typecheck` to ensure no type errors
2. Run `npm run lint` to check for import issues
3. Run `npm run build:game` to verify build success
4. Run `npm run test` to ensure no test failures

## Rollback Plan

- Commit after each successful phase
- Tag each phase completion for easy rollback
- Keep a backup branch before starting reorganization

## Success Metrics

- ✅ No duplicate exports between index.ts and render/index.ts
- ✅ All packages have consistent export structure
- ✅ No imports from outside core/ directory (except @lib/)
- ✅ All tests pass
- ✅ Build succeeds without warnings
- ✅ No unused exports (or clearly documented why kept)

## Notes

- The `@lib/` imports are acceptable as they're shared utilities
- Redux slices should always be exported from package index
- Render functions should be in `render/index.ts` when that structure exists
- Consider future maintainability when removing "unused" exports that might be useful for debugging/demos