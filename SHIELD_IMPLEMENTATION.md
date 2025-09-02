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
  dispatch(shipSlice.actions.setShielding(true))
  dispatch(shipSlice.actions.consumeFuel(FUELSHIELD)) // 83 units/frame (GW.h:139)
  dispatch(shipSlice.actions.setRefueling(false))
  // Fuel cell collection handled separately (see section 3)
} else {
  dispatch(shipSlice.actions.setShielding(false))
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

**Our Implementation** - In `moveBullets` thunk:
```typescript
export const moveBullets = createAsyncThunk(
  'shots/moveBullets',
  async (params: MoveBulletsParams, { getState }) => {
    const state = getState() as RootState
    const bullets = state.shots.bunkshots
    
    // Check shield protection if active
    if (state.ship.shielding) {
      // Calculate global ship position (Play.c:273-274 pattern)
      const shipGlobalX = state.screen.screenx + state.ship.shipx
      const shipGlobalY = state.screen.screeny + state.ship.shipy
      
      // Bounding box for optimization (Play.c:822-825)
      const left = shipGlobalX - SCENTER   // SCENTER = 15 (GW.h:75)
      const right = shipGlobalX + SCENTER
      const top = shipGlobalY - SCENTER
      const bot = shipGlobalY + SCENTER
      
      const processedBullets = bullets.map(bullet => {
        // Bounding box check first (Play.c:830-831)
        if (bullet.x > left && bullet.x < right && 
            bullet.y > top && bullet.y < bot) {
          
          // Precise distance check (Play.c:832-833)
          // SHRADIUS = 12 (GW.h:77)
          if (xyindistance(bullet.x - shipGlobalX, 
                          bullet.y - shipGlobalY, SHRADIUS)) {
            // Destroy bullet (Play.c:835-837)
            return {
              ...bullet,
              lifecount: 0,      // Terminate bullet
              btime: 0,          // Cancel bounce timer
              strafedir: -1,     // Cancel strafing
              justDied: true     // Prevent rendering this frame
            }
          }
        }
        
        // Normal bullet movement if not destroyed
        return moveShot(bullet, params)
      })
      
      return processedBullets
    }
    
    // No shield - normal bullet movement
    return bullets.map(b => moveShot(b, params))
  }
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

**Our Implementation** - Orchestrated in `shipMoveBitmap.ts`:
```typescript
// After processing ship controls
const prevShielding = state.ship.shielding
store.dispatch(shipControl({ controlsPressed, gravity }))
const newState = store.getState()

// Check if shield just activated (Play.c:507-508 timing)
if (!prevShielding && newState.ship.shielding) {
  // Calculate global ship position
  const shipGlobalX = newState.screen.screenx + newState.ship.shipx
  const shipGlobalY = newState.screen.screeny + newState.ship.shipy
  
  // Check all fuel cells (Play.c:512-524)
  const collectedFuels: number[] = []
  
  newState.planet.fuels.forEach((fuel, index) => {
    if (fuel.alive) {
      const xdif = shipGlobalX - fuel.x
      const ydif = shipGlobalY - fuel.y
      
      // FRADIUS check (Play.c:516)
      if (xyindist(xdif, ydif, FRADIUS)) {
        collectedFuels.push(index)
      }
    }
  })
  
  // Dispatch collection actions if any fuel cells found
  if (collectedFuels.length > 0) {
    // Update planet state (Play.c:518-519)
    store.dispatch(planetSlice.actions.collectFuelCells({
      indices: collectedFuels,
      setCurrentFig: FUELFRAMES  // For explosion animation
    }))
    
    // Add fuel to ship (Play.c:520)
    // FUELGAIN = 2000 (assumed from game balance)
    store.dispatch(shipSlice.actions.addFuel(
      collectedFuels.length * FUELGAIN
    ))
    
    // TODO: Add score when implemented (Play.c:521)
    // store.dispatch(scoreSlice.actions.addScore(SCOREFUEL * collectedFuels.length))
    
    // TODO: Play sound when implemented (Play.c:522)
    // playSound(FUEL_SOUND)
  }
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
      if (xyindistance(shot.x - shipPosition.x, 
                       shot.y - shipPosition.y, SHRADIUS)) {
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
    x: finalState.ship.shipx - SCENTER,  // Same position as ship
    y: finalState.ship.shipy - SCENTER,
    def: shieldSprite.bitmap              // shield_def (Figs.c:71)
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
- `FRADIUS` - Fuel cell collection radius (value TBD from testing)
- `FUELGAIN = 2000` - Fuel gained per cell (estimated from game balance)
- `SCENTER = 15` - Half ship width for positioning (GW.h:75)
- `SHIPHT = 32` - Ship/shield sprite height (GW.h:73)
- `SCOREFUEL` - Score for collecting fuel cell (when score implemented)

## State Flow Summary

1. **Shield Activation**: 
   - User presses SPACE → shipControlThunk → shipSlice.setShielding(true)
   - Orchestrator detects activation → triggers fuel cell collection

2. **Bullet Protection**:
   - moveBullets thunk reads ship.shielding → processes bullets → returns destroyed list

3. **Self-Hit Feedback**:
   - moveShipshots detects self-hit → sets flag → orchestrator activates feedback

4. **Rendering**:
   - shipMoveBitmap reads final state → draws shield overlay if active

This architecture maintains Redux best practices while faithfully reproducing the original game mechanics.