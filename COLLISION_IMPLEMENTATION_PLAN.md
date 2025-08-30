# Collision Implementation Plan

## Overview
This document outlines the plan for implementing missing collision detection systems in the Continuum port, based on the analysis in `arch/COLLISION.md`.

## Current State

### Implemented Collisions ✅
- Ship vs terrain walls (pixel collision via `checkFigure`)
- Ship vs bounce walls (via `checkForBounce`)
- Ship shots vs walls (predictive via `setLife`)
- Bunker shots movement and rendering

### Missing Collisions ❌
- Ship shots hitting bunkers
- Ship hitting bunkers (may already work, needs verification)
- Bunker shots hitting walls
- Bunker shots hitting ship (may already work, needs verification)
- Explosion effects for destroyed bunkers

## Implementation Plan

### 1. Ship Shots Hit Bunkers

**Location**: `shotsSlice.moveShipshots` action

**Approach**: 
- Use proximity detection (not pixel collision) as per original (Play.c:767-784)
- For each active shipshot, check against each alive bunker:
  1. Bounding box check first (cheap early rejection)
  2. Then `xyindistance()` with `BRADIUS` (circular collision)
  3. For certain bunker types, check firing angle with `legal_angle()`
  4. Handle "hardy" bunkers (DIFF bunkers with certain rotations need multiple hits)

**Implementation notes**:
- Already have `checkBunkerCollision` function that needs to be called
- Set shot's `lifecount = 0` on hit
- Decrement bunker's hit counter or set `alive = false`
- Trigger explosion at bunker position

**Code locations**:
- `/src/shots/shotsSlice.ts` - Add to `moveShipshots` action
- `/src/shots/checkBunkerCollision.ts` - Existing function to integrate
- `/src/explosions/explosionsSlice.ts` - Add bunker explosion action

### 2. Ship Hits (or Gets Near) Bunker

**Location**: After ship movement in main game loop

**Approach**:
- **For collision (death)**: Use pixel collision after bunkers are drawn
  - Bunkers are already being drawn in the correct order (after terrain, before collision check)
  - The existing `checkFigure` call should already detect this!
  - May need to verify bunkers are drawn with solid pixels

- **For shield proximity** (if implementing shield): 
  - When shield active, check proximity to bunkers
  - Similar to fuel cell collection

**Implementation notes**:
- Should already work if bunkers are drawn correctly
- Test to verify pixel collision is working
- No additional code needed if working correctly

**Verification steps**:
1. Confirm bunkers are drawn before `checkFigure` call
2. Verify bunker sprites have solid collision masks
3. Test ship flying into bunker

### 3. Bunker Shots Hit Walls

**Location**: `shotsSlice.moveBullets` action

**Approach**: 
- Use predictive collision like ship shots
- When bunker shot is created in `bunkShoot`:
  1. Calculate shot trajectory
  2. Check intersection with all wall lines
  3. Set `lifecount` to expire at collision frame
  4. For bounce walls, set `btime` for bounce physics

**Implementation notes**:
- Reuse `setLife` function from ship shots
- Call during shot creation, not every frame
- Need to handle world wrapping for toroidal worlds

**Code locations**:
- `/src/shots/bunkShoot.ts` - Add `setLife` call when creating shots
- `/src/shots/setLife.ts` - Existing predictive collision function
- `/src/shots/shotsSlice.ts` - Ensure `moveBullets` respects lifecount

### 4. Bunker Shots Hit Ship

**Location**: In main render loop, similar to ship collision check

**Approach**:
- **Without shield**: Use pixel collision
  - Draw bunker shots before ship collision check
  - They should trigger the existing `checkFigure` call
  
- **With shield** (when implemented): Use proximity detection
  - Check each bunkshot against ship position
  - Use `xyindistance()` with `SHRADIUS`
  - Destroy shots within shield radius before drawing

**Implementation notes**:
- Bunker shots are already being drawn with `drawDotSafe`
- Should already trigger collision if drawn before `checkFigure`
- May need to adjust drawing order

**Verification steps**:
1. Confirm bunker shots are drawn before `checkFigure`
2. Verify `drawDotSafe` creates solid pixels
3. Test ship getting hit by bunker shot

### 5. Explosion System for Bunkers

**Location**: New explosion handling in explosions slice

**Approach**:
- When bunker is destroyed, create explosion:
  1. Generate sparks at bunker position
  2. Use `EXPLSPARKS` (20) sparks for bunker death
  3. Each spark has random velocity and lifetime
  4. Render sparks as small white dots

**Implementation notes**:
- Already have explosion system for ship
- Extend to handle bunker explosions
- Use bunker-specific constants from GW.h

**Code locations**:
- `/src/explosions/explosionsSlice.ts` - Add `createBunkerExplosion` action
- `/src/explosions/constants.ts` - Add bunker explosion constants
- Game loop - Call explosion creation when bunker destroyed

**Constants from GW.h**:
```
EXPLSPARKS = 20    // number of sparks in bunker death
SPARKLIFE = 10     // minimum life of spark
SPADDLIFE = 10     // possible longer than SPARKLIFE
SPARKSLOW = 7      // slow factor (1=stop, ...)
SP_SPEED16 = 40    // speed factor of spark (*16)
```

## Drawing Order Critical Path

Based on COLLISION.md, the correct order is:

1. Clear screen
2. Draw non-lethal objects (fuel, craters, shadows)
3. `erase_figure` - punch ship-shaped hole
4. Check bounce walls (with own erase if needed)
5. Draw lethal objects:
   - Normal terrain
   - **Bunkers** ← Already correct in `shipMoveBitmap.ts`
   - **Bunker shots** ← Need to verify this is before ship collision
6. `check_figure` for ship collision
7. Draw ship
8. Draw ship shots

### Current Implementation in shipMoveBitmap.ts

The current drawing order (lines ~300-450) is:
1. Clear screen (viewClear)
2. Gray figure (ship shadow)
3. White terrain
4. Ghost terrain
5. Erase figure
6. Check for bounce
7. Normal terrain
8. **Bunkers** (line ~410) ✅ Correct position
9. Check figure (collision)
10. Ship
11. Ship shots
12. **Bunker shots** (line ~500) ❌ After collision check!

**ISSUE FOUND**: Bunker shots are drawn AFTER the collision check, so they won't kill the ship!

### Fix Required
Move bunker shot rendering to happen before `checkFigure` call (around line 405, after bunkers).

## Key Design Principles

### Three Collision Methods

1. **Pixel collision** (`check_figure`):
   - Ship vs terrain/bunkers/bunker shots
   - Most accurate for large, slow-moving objects
   - Handles complex shapes perfectly

2. **Proximity detection** (`xyindist`, `xyindistance`):
   - Bullets vs bunkers
   - Shield interactions
   - Fast circular collision detection

3. **Predictive/Line intersection** (`set_life`):
   - Bullets vs terrain walls
   - Calculates entire trajectory at shot creation
   - Enables precise bounce calculations

### Important Rules

1. **Drawing order determines lethality**:
   - Objects drawn before `erase_figure` can't kill ship
   - Objects drawn after final erase are lethal

2. **Collision masks vs visual sprites**:
   - Use separate collision masks for pixel detection
   - Allows gameplay tuning independent of visuals

3. **Performance considerations**:
   - Bounding box checks before expensive operations
   - Predictive collision avoids per-frame checks
   - Proximity detection for small/round objects

## Testing Strategy

### Phase 1: Verify Existing Systems
1. **Ship hitting bunker**:
   - Should already work via pixel collision
   - Test: Fly ship directly into bunker
   - Expected: Ship explodes

2. **Bunker shots hitting ship**:
   - Currently broken due to drawing order
   - After fix: Test getting shot by bunker
   - Expected: Ship explodes

### Phase 2: Implement New Collisions
1. **Ship shots vs bunkers**:
   - Test: Shoot at bunkers
   - Expected: Bunker explodes after appropriate hits
   - Special: DIFF bunkers with rotation 2 need 3 hits

2. **Bunker shots vs walls**:
   - Test: Let bunker shoot at wall
   - Expected: Shot disappears at wall
   - Special: Bounce walls should cause ricochet

### Phase 3: Visual Feedback
1. **Bunker explosions**:
   - Test: Destroy bunker
   - Expected: 20 sparks fly outward

2. **Multi-hit feedback**:
   - Test: Shoot hardy bunker
   - Expected: Visual indication of damage

### Phase 4: Edge Cases
1. **World wrapping**:
   - Test near world edges
   - Collisions should work across wrap boundary

2. **Simultaneous collisions**:
   - Multiple shots hitting same bunker
   - Ship and shot hitting bunker simultaneously

3. **Performance**:
   - Many bunkers shooting simultaneously
   - No frame drops or slowdown

## Implementation Priority

1. **Critical Fix**: Move bunker shot drawing before collision check
2. **High Priority**: Ship shots vs bunkers (core gameplay)
3. **High Priority**: Bunker shots vs walls (shot lifecycle)
4. **Medium Priority**: Bunker explosions (visual feedback)
5. **Low Priority**: Multi-hit bunker effects

## Files to Modify

### Immediate Fixes
- `/src/app/games/shipMoveBitmap.ts` - Fix bunker shot drawing order

### Collision Implementation
- `/src/shots/shotsSlice.ts` - Add bunker collision to moveShipshots
- `/src/shots/bunkShoot.ts` - Add wall collision prediction
- `/src/shots/checkBunkerCollision.ts` - Integrate into shot movement

### Visual Effects
- `/src/explosions/explosionsSlice.ts` - Add bunker explosions
- `/src/explosions/constants.ts` - Add bunker explosion parameters

### Testing
- Create test scenarios for each collision type
- Verify against original game behavior

## Success Criteria

- [ ] Ship dies when hitting bunker
- [ ] Ship dies when hit by bunker shot
- [ ] Bunkers explode when hit by ship shots
- [ ] Hardy bunkers require multiple hits
- [ ] Bunker shots disappear at walls
- [ ] Bunker shots bounce off bounce walls
- [ ] Bunker explosions show sparks
- [ ] All collisions work across world wrap
- [ ] Performance remains smooth

## Notes

- The original game uses different collision methods for different scenarios for good reasons (performance, accuracy, predictability)
- We should maintain this design rather than trying to use one universal collision system
- The drawing order is critical and must be preserved exactly
- Testing against the original game behavior is essential