# Kill Ship Implementation Plan

## Overview
This document outlines the plan for implementing ship death mechanics in the Continuum port, decomposing the original `kill_ship()` function into modern Redux architecture.

## Original C Code Reference
The original `kill_ship()` function (`Play.c:685-700`) performs several operations:
1. Sets `dead_count = DEAD_TIME` (death animation timer)
2. Disables ship controls (flaming, thrusting, refueling, shielding)
3. Destroys nearby bunkers within `KILLRADIUS` 
4. Triggers ship explosion animation
5. Plays death sound

## Modern Redux Architecture

Instead of a monolithic `kill_ship()` function, we'll decompose the functionality into composed Redux actions that respect slice boundaries:

### 1. Ship State Management (shipSlice)

**Location**: `/src/ship/shipSlice.ts`

**New Reducer**: `killShip`
```typescript
killShip: (state) => {
  state.dead_count = DEAD_TIME  // Start death countdown
  state.flaming = false         // Stop all ship activities
  state.thrusting = false
  state.refueling = false
  state.shielding = false
  // Note: vx, vy preserved - ship continues drifting while dead
}
```

**Additional Reducers**:
```typescript
decrementDeadCount: (state) => {
  if (state.dead_count > 0) {
    state.dead_count--
    if (state.dead_count === 0) {
      // Trigger respawn logic here or via listener
      state.x = state.startx  // Reset position
      state.y = state.starty
      state.vx = 0           // Stop movement
      state.vy = 0
      state.fuel = STARTING_FUEL
    }
  }
}
```

**State Additions**:
```typescript
interface ShipState {
  // ... existing state ...
  dead_count: number  // Countdown timer for death animation
  startx: number      // Respawn position
  starty: number
}
```

### 2. Bunker Death Blast (planetSlice)

**Location**: `/src/planet/planetSlice.ts`

**New Reducer**: `killBunker`
```typescript
killBunker: (state, action: PayloadAction<{ index: number }>) => {
  const bunker = state.bunkers[action.payload.index]
  if (bunker) {
    bunker.alive = false
    // Note: Explosion triggered separately from game loop
  }
}
```

### 3. Explosion Management (explosionsSlice)

**Location**: `/src/explosions/explosionsSlice.ts`

Already implemented as `startShipDeath` action - creates 100-spark explosion.

### 4. Game Loop Integration

**Location**: `/src/app/games/shipMoveBitmap.ts`

#### Collision Detection and Death Trigger
```typescript
// After ship movement, check for collision
const dead_count = state.ship.dead_count

if (dead_count === 0) {  // Only check collision if alive
  if (checkFigure(shipx - SCENTER, shipy - SCENTER, 
                  shipMask, SHIPHT)) {
    // Ship collision detected - trigger death sequence
    
    // (a) Update ship state
    store.dispatch(killShip())
    
    // (b) Death blast - destroy nearby bunkers
    const bunkers = store.getState().planet.bunkers
    bunkers.forEach((bunker, index) => {
      if (bunker.alive && 
          xyindistance(bunker.x - globalx, 
                      bunker.y - globaly, KILLRADIUS)) {
        store.dispatch(killBunker({ index }))
        store.dispatch(addScore(SCOREBUNK))
        // Trigger bunker explosion
        store.dispatch(startExplosion({
          x: bunker.x,
          y: bunker.y,
          dir: bunker.rot,
          kind: bunker.kind
        }))
      }
    })
    
    // (c) Start ship explosion
    store.dispatch(startShipDeath({ x: globalx, y: globaly }))
    
    // (d) Play death sound
    // playSound(DEATH_SOUND)
  }
}
```

#### Main Loop Death Handling
```typescript
// In main game loop
const dead_count = state.ship.dead_count

// Skip ship-related operations when dead
if (dead_count === 0) {
  // Draw ship shadow (gray_figure)
  // Erase figure for collision hole
  // Check for bounce
  // Check figure for collision (above)
  // Draw ship
  // Handle controls
} else {
  // Ship is dead - just decrement counter
  store.dispatch(decrementDeadCount())
}

// Always draw explosions (independent lifecycle)
// Draw flames if needed (even during death for momentum flames)
```

## Drawing Order Changes

When `dead_count > 0`:
1. Skip ship shadow (`gray_figure`)
2. Skip ship erase (`erase_figure`) 
3. Skip collision check (`check_figure`)
4. Skip ship drawing (`full_figure`)
5. Continue drawing explosions and other elements

## Constants Required

From `GW.h`:
```c
DEAD_TIME = 60      // Frames of death animation
KILLRADIUS = 100    // Radius for bunker death blast
SCOREBUNK = 50      // Points for destroying bunker
STARTING_FUEL = 1000 // Fuel on respawn
```

## Implementation Steps

1. **Add dead_count to shipSlice state**
   - Add field to ShipState interface
   - Initialize to 0

2. **Implement killShip reducer in shipSlice**
   - Set dead_count = DEAD_TIME
   - Disable all ship controls

3. **Implement decrementDeadCount reducer in shipSlice**
   - Decrement if > 0
   - Handle respawn when reaches 0

4. **Implement killBunker reducer in planetSlice**
   - Set bunker.alive = false

5. **Update shipMoveBitmap.ts**
   - Add collision check with death trigger
   - Add death blast loop
   - Conditionally skip ship operations when dead
   - Add dead_count decrement

6. **Add constants**
   - Define DEAD_TIME, KILLRADIUS, etc.

## Testing Strategy

1. **Basic Death**:
   - Fly ship into wall
   - Verify ship disappears
   - Verify explosion appears
   - Verify respawn after DEAD_TIME frames

2. **Death Blast**:
   - Place ship near bunkers
   - Trigger death
   - Verify nearby bunkers destroyed
   - Verify distant bunkers unaffected

3. **Control Lockout**:
   - Verify no control response during dead_count > 0
   - Verify controls resume after respawn

4. **Momentum Preservation**:
   - Verify ship velocity continues during death
   - Verify explosion follows momentum path

## Notes

- The decomposed approach is more maintainable than the original monolithic function
- Each slice maintains its own domain of responsibility
- The game loop orchestrates the cross-slice interactions
- This pattern can be reused for other complex game events