# Shield System Implementation Plan

## Overview

This document outlines the implementation plan for the shield system in our Redux-based architecture, with references to the original C code for each feature. The shield system provides temporary invulnerability by destroying incoming bullets within a circular protection zone.

## State Management

### Shield State in Ship Slice

The ship slice will own all shield-related state, matching the original's global variables:

```typescript
// shipSlice state additions
{
  shielding: boolean,      // Original: int shielding (Play.c:71)
  fuel: number,            // Original: long fuel (Play.c:65)
  refueling: boolean,      // Original: int refueling (Play.c:72)
  // ... existing ship state
}
```

## Feature Implementation

### 1. Manual Shield Activation

**Original Implementation** (Play.c:507-527):

```c
if ( (pressed & KEY_SHIELD) && fuel)
{   shielding = TRUE;
    start_sound(SHLD_SOUND);
    fuel_minus(FUELSHIELD);
    refueling = FALSE;
    // ... fuel cell collection
}
else
    shielding = FALSE;
```

**Our Implementation** - In `shipControlThunk`:

```typescript
// Check for shield control and fuel availability
if (controlsPressed.includes(ShipControl.SHIELD) && state.ship.fuel > 0) {
  dispatch(shipSlice.actions.shieldActivate()) // Sets shielding=true, refueling=false
  dispatch(shipSlice.actions.consumeFuel(FUELSHIELD)) // 83 units/frame (GW.h:139)
  // Fuel cell collection handled in same thunk (see section 3)
} else {
  dispatch(shipSlice.actions.shieldDeactivate())
}
```

### 2. Enemy Bullet Protection

**Original Implementation** (Play.c:830-837):

```c
if (shielding && sp->x > left && sp->x < right &&
        sp->y > top && sp->y < bot &&
        xyindistance(sp->x - globalx, sp->y - globaly, SHRADIUS))
{
    sp->lifecount = sp->btime = 0;
    sp->strafedir = -1;
    continue;  // Skip drawing
}
```

**Our Implementation** - In `moveBullets` reducer action:

First, update the action payload type to include ship data:

```typescript
// In shotsSlice.ts - update moveBullets action payload
moveBullets: (
  state,
  action: PayloadAction<{
    worldwidth: number
    worldwrap: boolean
    readonly walls: readonly LineRec[]
    // Add ship-related fields for shield protection
    shipGlobalX?: number
    shipGlobalY?: number
    shielding?: boolean
  }>
) => {
  const { worldwidth, worldwrap, walls, shipGlobalX, shipGlobalY, shielding } =
    action.payload

  // Process each bunker shot
  state.bunkshots = state.bunkshots.map(shot => {
    // Clear justDied flag from previous frame
    let updatedShot = { ...shot, justDied: false }

    // Skip completely dead shots
    if (shot.lifecount <= 0) {
      return updatedShot
    }

    // Check shield protection BEFORE moving (Play.c:830-838)
    if (shielding && shipGlobalX !== undefined && shipGlobalY !== undefined) {
      // Bounding box for optimization (Play.c:822-825)
      const left = shipGlobalX - SCENTER // SCENTER = 15 (GW.h:75)
      const right = shipGlobalX + SCENTER
      const top = shipGlobalY - SCENTER
      const bot = shipGlobalY + SCENTER

      // Bounding box check first (Play.c:830-831)
      if (shot.x > left && shot.x < right && shot.y > top && shot.y < bot) {
        // Precise distance check (Play.c:832-833)
        // SHRADIUS = 12 (GW.h:77)
        if (
          xyindistance(shot.x - shipGlobalX, shot.y - shipGlobalY, SHRADIUS)
        ) {
          // Destroy bullet (Play.c:835-837)
          updatedShot.lifecount = 0 // Terminate bullet
          updatedShot.btime = 0 // Cancel bounce timer
          updatedShot.strafedir = -1 // Cancel strafing
          updatedShot.justDied = true // Mark for final frame render
          return updatedShot // Skip further processing
        }
      }
    }

    // Move the shot (only if not destroyed by shield)
    updatedShot = moveShot(updatedShot, { worldwidth, worldwrap })

    // Handle wall bounce... (existing code continues)
  })
}
```

And in the orchestrator (e.g., `shipMoveBitmap.ts`) where `moveBullets` is dispatched:

```typescript
// Calculate ship's global position for shield protection
const shipGlobalX = finalState.screen.screenx + finalState.ship.shipx
const shipGlobalY = finalState.screen.screeny + finalState.ship.shipy

// Dispatch moveBullets with ship data
store.dispatch(
  shotsSlice.actions.moveBullets({
    worldwidth,
    worldwrap,
    walls,
    // Include ship data for shield protection
    shipGlobalX,
    shipGlobalY,
    shielding: finalState.ship.shielding
  })
)
```

### 3. Fuel Cell Collection on Shield Activation

**Original Implementation** (Play.c:512-524):

```c
for(fp=fuels; fp->x < 10000; fp++)
{
    xdif = globalx - fp->x;
    ydif = globaly - fp->y;
    if (fp->alive && xyindist(xdif, ydif, FRADIUS))
    {
        fp->alive = FALSE;
        fp->currentfig = FUELFRAMES;
        fuel_minus(-FUELGAIN);  /* wow, a kludge! */
        score_plus(SCOREFUEL);
        start_sound(FUEL_SOUND);
    }
}
```

**Our Implementation** - In `shipControlThunk` (immediately after shield activation):

```typescript
// Inside shipControlThunk, right after shield activation:
if (pressed.has(ShipControl.SHIELD) && ship.fuel > 0) {
  dispatch(shipSlice.actions.shieldActivate())
  dispatch(shipSlice.actions.consumeFuel(FUELSHIELD))

  // Collect fuel cells immediately when shield activates (Play.c:512-524)
  const collectedFuels: number[] = []
  const globalx = screen.screenx + ship.shipx
  const globaly = screen.screeny + ship.shipy

  planet.fuels.forEach((fuel, index) => {
    if (fuel.alive) {
      const xdif = globalx - fuel.x
      const ydif = globaly - fuel.y
      // FRADIUS = 30 (GW.h:138)
      if (xyindist(xdif, ydif, FRADIUS)) {
        collectedFuels.push(index)
      }
    }
  })

  if (collectedFuels.length > 0) {
    // Update planet state - mark fuels as dead and start animation
    dispatch(planetSlice.actions.collectFuelCells(collectedFuels))
    // Add fuel to ship (collectFuel already multiplies by FUELGAIN internally)
    dispatch(shipSlice.actions.collectFuel(collectedFuels.length))
    // TODO: Add score when implemented
    // TODO: Play FUEL_SOUND
  }
}
```

**Required planetSlice action:**

```typescript
// In planetSlice reducers:
collectFuelCells: (state, action: PayloadAction<number[]>) => {
  const indices = action.payload
  indices.forEach(index => {
    if (state.fuels[index]) {
      state.fuels[index].alive = false
      state.fuels[index].currentfig = FUELFRAMES // Start explosion animation
    }
  })
}
```

### 4. Self-Hit Shield Feedback

**Original Implementation** (Play.c:787-794):

```c
if (xyindistance(sp->x - globalx, sp->y - globaly, SHRADIUS) &&
    !dead_count)
{
    shielding = TRUE;
    start_sound(SHLD_SOUND);
    sp->lifecount = sp->btime = 0;
    break;
}
```

**Our Implementation** - In `moveShipshots` action:

```typescript
// In shotsSlice
moveShipshots: (state, action) => {
  const { shipPosition, shipAlive } = action.payload
  let selfHitDetected = false

  state.shipshots = state.shipshots.map(shot => {
    // Check for self-hit (Play.c:787-789)
    if (shot.lifecount > 0 && shipAlive) {
      if (
        xyindistance(shot.x - shipPosition.x, shot.y - shipPosition.y, SHRADIUS)
      ) {
        selfHitDetected = true
        // Destroy the bullet (Play.c:792)
        return { ...shot, lifecount: 0, btime: 0 }
      }
    }

    // Normal shot movement
    return moveShot(shot)
  })

  // Store flag for consumer to handle
  state.selfHitShield = selfHitDetected
}

// In shipMoveBitmap.ts, after moveShipshots dispatch:
const shotsState = store.getState().shots
if (shotsState.selfHitShield) {
  // Activate shield for one frame (Play.c:790)
  store.dispatch(shipSlice.actions.activateShieldFeedback())
  // Note: Shield will deactivate next frame unless KEY_SHIELD is held

  // TODO: Play sound (Play.c:791)
  // playSound(SHLD_SOUND)
}
```

### 5. Firing Restriction While Shielding

**Original Implementation** (Play.c:534):

```c
if(i<NUMBULLETS && !shielding)
{   // Create new bullet
```

**Our Implementation** - Already exists in shipControlThunk:

```typescript
// In shipControl thunk
if (controlsPressed.includes(ShipControl.FIRE)) {
  const state = getState()

  // Check shielding prevents firing (Play.c:534)
  if (!state.ship.shielding) {
    // Find available bullet slot and create shot
    // ... existing bullet creation logic
  }
}
```

### 6. Shield Visual Rendering

**Original Implementation** (Play.c:252-255):

```c
if (shielding)
{   move_bullets();
    erase_figure(shipx-SCENTER, shipy-SCENTER, shield_def, SHIPHT);
}
```

**Our Implementation** - In `shipMoveBitmap.ts` after ship rendering (line ~715):

```typescript
// Draw shield effect if active (Play.c:252-255)
if (finalState.ship.shielding) {
  // Move bullets handled earlier in the frame

  // Draw shield using erase_figure (Play.c:254)
  const shieldSprite = spriteService.getShieldSprite()
  renderedBitmap = eraseFigure({
    x: finalState.ship.shipx - SCENTER, // Same position as ship
    y: finalState.ship.shipy - SCENTER,
    def: shieldSprite.bitmap // shield_def (Figs.c:71)
  })(renderedBitmap)
}
```

## Drawing Order Considerations

The original game's drawing order is critical for shield functionality (Play.c:219-256):

1. **Lines 238-239**: If NOT shielding, `move_bullets()` called early (bullets can hit ship)
2. **Lines 244-249**: Ship collision check and drawing
3. **Lines 252-255**: If shielding, `move_bullets()` called AFTER ship (bullets destroyed before draw)

Our implementation must maintain this order in `shipMoveBitmap.ts`:

```typescript
// Around line 575
if (!finalState.ship.shielding) {
  // Draw bullets early - they can collide with ship
  drawBunkShots()
}

// Ship drawing around line 710
drawShip()

// After ship drawing
if (finalState.ship.shielding) {
  // Bullets already destroyed by moveBullets thunk
  // Just draw the shield effect
  drawShield()
}
```

## Constants Reference

From the original source files:

- `SHRADIUS = 12` - Shield protection radius in pixels (GW.h:77)
- `FUELSHIELD = 83` - Fuel consumed per frame while shielding (GW.h:139)
- `FRADIUS = 30` - Distance from fuel to pick it up (GW.h:138)
- `FUELGAIN = 2000` - Amount of fuel gained from cell (GW.h:140)
- `SCENTER = 15` - Half ship width for positioning (GW.h:75)
- `SHIPHT = 32` - Ship/shield sprite height (GW.h:73)
- `FUELFRAMES = 8` - Number of animation frames for fuel explosion
- `SCOREFUEL` - Score for collecting fuel cell (when score implemented)

## State Flow Summary

1. **Shield Activation**:

   - User presses SPACE → shipControlThunk → shipSlice.setShielding(true)
   - Orchestrator detects activation → triggers fuel cell collection

2. **Bullet Protection**:

   - Orchestrator calculates ship global position → passes to moveBullets reducer
   - moveBullets reducer checks shield protection → destroys bullets in shield radius

3. **Self-Hit Feedback**:

   - moveShipshots detects self-hit → sets flag → orchestrator activates feedback

4. **Rendering**:
   - shipMoveBitmap reads final state → draws shield overlay if active

This architecture maintains Redux best practices while faithfully reproducing the original game mechanics.
