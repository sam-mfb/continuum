# Status Bar State Refactoring Plan

## Overview
Refactor state management to eliminate duplication between shipSlice and statusSlice, with status bar rendering happening at the orchestration level (shipMoveBitmap.ts).

## Current Issues
- Fuel and lives/deadCount are duplicated between shipSlice and statusSlice
- Synchronization complexity between slices
- Unclear ownership of state

## Proposed Solution
- **shipSlice**: Owns `fuel`, `lives`, `deadCount` (ship/player vitals)
- **statusSlice**: Owns `score`, `bonus`, `level`, `message` (game progress/UI)
- **Status bar rendering**: Orchestrator gathers data from both slices

## Implementation Plan

### Phase 1: Remove Redundant State from statusSlice

#### 1.1 Remove from statusSlice
- Remove `fuel` field from StatusState type
- Remove `lives` field from StatusState type  
- Remove these from initialState
- Remove/deprecate actions that update fuel/lives in statusSlice:
  - `updateFuel`
  - `updateLives`
  - Any other related actions

#### 1.2 Add missing fields to shipSlice
- Add `lives: number` to ShipState type
- Initialize with proper starting value (typically 3)
- Update actions:
  - `killShip`: Should decrement lives when ship dies
  - `respawnShip`: Should check lives before respawning
  - Add `resetLives` action for game reset
  - Add `setLives` action if needed for initialization

### Phase 2: Update Status Bar Rendering Functions

#### 2.1 Make render functions pure
Convert status bar functions to pure functions that accept data as parameters:

```typescript
// Before (reads from state):
export const updateSbar = (state: StatusState) => (bitmap: MonochromeBitmap) => ...

// After (accepts parameters):
export const updateSbar = (data: {
  fuel: number
  lives: number
  score: number
  bonus: number
  level: number
  message?: string
}) => (bitmap: MonochromeBitmap) => ...
```

#### 2.2 Update individual write functions
- `writeFuel`: Accept fuel value as parameter
- `writeLives`: Accept lives value as parameter
- `writeScore`: Accept score value as parameter
- `writeBonus`: Accept bonus value as parameter
- `writeLevel`: Accept level value as parameter

### Phase 3: Add Status Bar to shipMoveBitmap.ts

#### 3.1 Import status functions
```typescript
import { newSbar, updateSbar } from '@/status/render'
import { SBARHT } from '@/screen/constants'
```

#### 3.2 Initialize status bar
In `initializeGame()`:
```typescript
// Get initial values from state after initialization
const initialState = store.getState()

// Initialize status bar from actual state values
const initialStatusData = {
  fuel: initialState.ship.fuel,
  lives: initialState.ship.lives,
  score: initialState.status.score,
  bonus: initialState.status.bonus,
  level: initialState.status.level,
  message: initialState.status.message
}

// Render initial status bar
renderedBitmap = newSbar(initialStatusData)(renderedBitmap)
```

#### 3.3 Update status bar each frame
In the renderer, after getting finalState:
```typescript
// Gather status data from multiple slices
const statusData = {
  fuel: finalState.ship.fuel,
  lives: finalState.ship.lives,
  score: finalState.status.score,
  bonus: finalState.status.bonus,
  level: finalState.status.level,
  message: finalState.status.message
}

// Update status bar (before main game rendering)
renderedBitmap = updateSbar(statusData)(renderedBitmap)
```

### Phase 4: Handle Game Events

#### 4.1 Score updates
- Bunker destroyed:
  ```typescript
  store.dispatch(statusSlice.actions.addScore(SCOREBUNK))
  ```
- Fuel collected:
  ```typescript
  store.dispatch(statusSlice.actions.addScore(SCOREFUEL))
  ```

#### 4.2 Lives management
- Ship death:
  ```typescript
  // In killShip action
  state.lives--
  state.deadCount = DEAD_TIME
  ```
- Game over check:
  ```typescript
  if (state.lives <= 0) {
    // Handle game over
  }
  ```

#### 4.3 Level progression
- Keep in statusSlice as it's game progress
- Update when all bunkers destroyed or other level complete conditions

### Phase 5: Testing & Cleanup

#### 5.1 Test scenarios
- [ ] Ship death decrements lives correctly
- [ ] Fuel consumption displays in real-time
- [ ] Fuel collection updates display
- [ ] Score updates when bunkers destroyed
- [ ] Score updates when fuel collected
- [ ] Lives display updates on death/respawn
- [ ] Status bar doesn't flicker or corrupt
- [ ] Game over when lives reach 0

#### 5.2 Cleanup tasks
- [ ] Remove deprecated actions from statusSlice
- [ ] Update all imports/exports
- [ ] Update type definitions
- [ ] Remove any duplicate state management code
- [ ] Update tests to reflect new structure

## Technical Considerations

### Rendering Order
1. Clear screen/background
2. Draw game viewport (craters, walls, ship, etc.)
3. Draw status bar on top (y=0 to y=SBARHT)

### Coordinate System
- Status bar: y = 0 to SBARHT (20 pixels)
- Game viewport: y = SBARHT to bitmap.height
- No overlap or interference

### State Access Pattern
```typescript
// Orchestrator pattern in shipMoveBitmap.ts
const shipState = store.getState().ship
const statusState = store.getState().status

const statusBarData = {
  // From ship slice
  fuel: shipState.fuel,
  lives: shipState.lives,
  
  // From status slice  
  score: statusState.score,
  bonus: statusState.bonus,
  level: statusState.level,
  message: statusState.message
}
```

## Benefits

1. **Single Source of Truth**: Each piece of state has exactly one owner
2. **No Synchronization Issues**: No need to keep slices in sync
3. **Clear Ownership**: 
   - Ship owns its vitals (fuel, lives, deadCount)
   - Status owns game progress (score, bonus, level)
4. **Natural Data Flow**: Orchestrator already coordinates between slices
5. **Matches Original Architecture**: Original C code had these as global variables
6. **Pure Functions**: Status bar rendering becomes pure and testable
7. **Maintainability**: Clearer separation of concerns

## Migration Steps

1. **Create feature branch** for refactoring
2. **Update types** in both slices
3. **Update reducers** and actions
4. **Convert render functions** to pure functions
5. **Update orchestrator** (shipMoveBitmap.ts)
6. **Test thoroughly**
7. **Remove deprecated code**
8. **Update documentation**

## Risks & Mitigations

- **Risk**: Breaking existing functionality
  - **Mitigation**: Incremental changes with testing at each step

- **Risk**: Performance impact from gathering state
  - **Mitigation**: State gathering is minimal overhead, happens once per frame

- **Risk**: Incorrect state updates
  - **Mitigation**: Careful testing of all state transitions

## Success Criteria

- No duplicate state between slices
- Status bar displays correctly in shipMoveBitmap
- All game events update appropriate state
- No visual glitches or timing issues
- Code is cleaner and more maintainable