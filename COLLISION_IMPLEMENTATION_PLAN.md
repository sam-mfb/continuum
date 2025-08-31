# Collision Implementation Plan

## Overview

This document outlines the plan for implementing missing collision detection systems in the Continuum port, based on the analysis in `arch/COLLISION.md` and citations from the original C source code.

**Primary C Source Files Referenced**:

- `Play.c` - Main game loop and collision checks
- `Bunkers.c` - Bunker management and shooting
- `Terrain.c` - Wall collision prediction (`set_life` function)
- `Draw.c` - Pixel collision detection (`check_figure` function)
- `GW.h` - Game constants and definitions

## Current State

### Implemented Collisions ✅

- Ship vs terrain walls (pixel collision via `checkFigure`)
- Ship vs bounce walls (via `checkForBounce`)
- Ship shots vs walls (predictive via `setLife`)
- Bunker shots movement and rendering
- Ship hitting bunkers (pixel collision working correctly)
- Bunker explosions (sparks and shards implemented)
- Distance functions (`xyindist` and `xyindistance` fully implemented)
- Bunker destruction on ship death (within SKILLBRADIUS)
- Crater creation for omnidirectional bunkers

### Missing Collisions ❌

- Ship shots hitting bunkers
- Bunker shots hitting walls
- Bunker shots hitting ship (may already work, needs verification)

## Implementation Plan

### 1. Ship Shots Hit Bunkers

**Location**: `shotsSlice.moveShipshots` action

**Original C Code Reference**: `Play.c:760-814` (move_shipshots function)

**Approach**:

- Use proximity detection (not pixel collision) as per original
- For each active shipshot, check against each alive bunker:
  1. Bounding box check first (cheap early rejection) - `Play.c:763-766`
  2. Then `xyindistance()` with `BRADIUS` (circular collision) - `Play.c:771`
  3. For certain bunker types, check firing angle with `legal_angle()` - `Play.c:772-774`
  4. Handle "hardy" bunkers (DIFF bunkers with certain rotations need multiple hits) - `Play.c:778-781`

**Key C Code Snippet**:

```c
// Play.c:767-784
for (bp=bunkers; bp->x < left; bp++)
    ;
for (; bp->x < right; bp++)
    if (bp->alive && bp->y < bot && bp->y > top &&
        xyindistance(bp->x - sp->x, bp->y - sp->y, BRADIUS) &&
        (bp->kind >= BUNKROTKINDS ||
         legal_angle(bp->rot, bp->x, bp->y,
                sp->x - (sp->h >> 3), sp->y - (sp->v >> 3))) )
    {
        sp->lifecount = sp->btime = 0;
        sp->strafedir = -1;
        if (bp->kind == DIFFBUNK &&
            (bp->rot & 3) == 2 &&
            --bp->rotcount > 0)
                break;      /* hardy bunker still alive */
        kill_bunk(bp);
        break;
    }
```

**Implementation notes**:

- Already have `checkBunkerCollision` function that needs to be called
- Set shot's `lifecount = 0` on hit
- Decrement bunker's hit counter or set `alive = false`
- Trigger explosion at bunker position

**Code locations**:

- `/src/shots/shotsSlice.ts` - Add to `moveShipshots` action (port `Play.c:760-814`)
- `/src/shots/checkBunkerCollision.ts` - Existing function to integrate (implement `Play.c:767-784`)
- `/src/explosions/explosionsSlice.ts` - Add bunker explosion action (called by kill_bunk at `Play.c:782`)

### 2. Ship Hits (or Gets Near) Bunker ✅ IMPLEMENTED

**Status**: ✅ Working correctly

**Location**: After ship movement in main game loop (`shipMoveBitmap.ts`)

**Original C Code Reference**: `Play.c:237` (do_bunkers) and `Play.c:243-245` (check_figure)

**Implementation verified**:

- Pixel collision is working correctly after bunkers are drawn
- Bunkers are drawn in the correct order (after terrain, before collision check)
- The existing `checkFigure` call properly detects collisions
- Ship explodes when hitting bunkers
- Nearby bunkers are destroyed on ship death (within SKILLBRADIUS=30)

**Key Implementation Details**:

- Drawing order preserved from original (`Play.c:236-245`)
- Bunker sprites have proper collision masks
- Collision detection uses pixel-perfect detection via `checkFigure`
- Ship death triggers bunker destruction check using `xyindist()` with correct global coordinates

### 3. Bunker Shots Hit Walls

**Location**: `shotsSlice.moveBullets` action

**Original C Code Reference**: `Bunkers.c:180` (set_life call) and `Terrain.c:146-230` (set_life function)

**Approach**:

- Use predictive collision like ship shots
- When bunker shot is created in `bunkShoot`:
  1. Calculate shot trajectory
  2. Check intersection with all wall lines
  3. Set `lifecount` to expire at collision frame
  4. For bounce walls, set `btime` for bounce physics

**Key C Code for Bunker Shot Creation**:

```c
// Bunkers.c:176-180
sp->x8 = (bp->x + xbshotstart[bp->kind][bp->rot]) << 3;
sp->y8 = (bp->y + ybshotstart[bp->kind][bp->rot]) << 3;
sp->lifecount = BUNKSHLEN;
sp->btime = 0;
set_life(sp, NULL);  // Predictive collision calculation
```

**Implementation notes**:

- Reuse `setLife` function from ship shots
- Call during shot creation, not every frame
- Need to handle world wrapping for toroidal worlds

**Code locations**:

- `/src/shots/bunkShoot.ts` - Add `setLife` call when creating shots (as in `Bunkers.c:180`)
- `/src/shots/setLife.ts` - Existing predictive collision function (port of `Terrain.c:146-230`)
- `/src/shots/shotsSlice.ts` - Ensure `moveBullets` respects lifecount (as in `Play.c:827-828`)

### 4. Bunker Shots Hit Ship

**Location**: In main render loop, similar to ship collision check

**Original C Code Reference**: `Play.c:816-846` (move_bullets function)

**Approach**:

- **Without shield**: Use pixel collision
  - Draw bunker shots before ship collision check (`Play.c:239`)
  - They should trigger the existing `checkFigure` call
- **With shield** (when implemented): Use proximity detection
  - Check each bunkshot against ship position
  - Use `xyindistance()` with `SHRADIUS` (`Play.c:830-837`)
  - Destroy shots within shield radius before drawing

**Key C Code for Shield Protection**:

```c
// Play.c:830-837
if (shielding && sp->x > left && sp->x < right &&
        sp->y > top && sp->y < bot &&
        xyindistance(sp->x - globalx,
                     sp->y - globaly, SHRADIUS))
{
    sp->lifecount = sp->btime = 0;
    sp->strafedir = -1;
    continue;
}
```

**Note on DRAW_SHOT Macro**: The original uses `DRAW_SHOT(sp)` at `Play.c:844` which renders bunker shots as 2x2 dots, different from ship shots' 4x4 diamond pattern (`Draw.c:620-650`).

**Implementation notes**:

- Bunker shots are already being drawn with `drawDotSafe`
- Should already trigger collision if drawn before `checkFigure`
- May need to adjust drawing order

**Verification steps**:

1. Confirm bunker shots are drawn before `checkFigure`
2. Verify `drawDotSafe` creates solid pixels
3. Test ship getting hit by bunker shot

### 5. Explosion System for Bunkers ✅ IMPLEMENTED

**Status**: ✅ Fully implemented

**Location**: Explosions slice and game loop

**Original C Code Reference**: `Play.c:367` (start_explosion call)

**Implementation complete**:

- Bunker explosions trigger when bunkers are destroyed
- Uses `startExplosion` action with bunker position and type
- Generates both sparks and shards based on bunker type
- Different bunker types produce different explosion patterns
- Omnidirectional bunkers (kind >= BUNKROTKINDS) create craters

**Code locations implemented**:

- `/src/explosions/explosionsSlice.ts` - `startExplosion` action handles bunker explosions
- `/src/app/games/shipMoveBitmap.ts` - Calls explosion creation when bunker destroyed
- `/src/planet/planetSlice.ts` - `killBunker` action creates craters for appropriate bunker types

**Constants from GW.h**:

```c
// From GW.h (not shown in available sources but referenced)
EXPLSPARKS = 20    // number of sparks in bunker death
SPARKLIFE = 10     // minimum life of spark
SPADDLIFE = 10     // possible longer than SPARKLIFE
SPARKSLOW = 7      // slow factor (1=stop, ...)
SP_SPEED16 = 40    // speed factor of spark (*16)

// Additional constants used in collision detection:
BRADIUS            // Bunker collision radius (Play.c:763-766)
SHRADIUS           // Shield radius (Play.c:833)
SCENTER = 16       // Ship center offset (Play.c:787)
BUNKSHLEN          // Bunker shot life (Bunkers.c:178)
FRADIUS            // Fuel cell pickup radius (Play.c:516)
```

## Drawing Order Critical Path

Based on COLLISION.md and original C code (`Play.c:219-249`), the correct order is:

1. Clear screen (`view_clear` at `Play.c:219`)
2. Draw non-lethal objects:
   - Fuel cells (`do_fuels` at `Play.c:221`)
   - Craters (`draw_craters` at `Play.c:222`)
   - Ship shadow (`gray_figure` at `Play.c:225-226`)
3. White terrain (`white_terrain` at `Play.c:228`)
4. Ghost terrain (`black_terrain(L_GHOST)` at `Play.c:229`)
5. `erase_figure` - punch ship-shaped hole (`Play.c:232`)
6. Check bounce walls (`check_for_bounce` at `Play.c:234`)
7. Draw lethal objects:
   - Normal terrain (`black_terrain(L_NORMAL)` at `Play.c:236`)
   - **Bunkers** (`do_bunkers` at `Play.c:237`)
   - **Bunker shots** (`move_bullets` at `Play.c:239` - conditional on !shielding)
8. `check_figure` for ship collision (`Play.c:243-244`)
9. Draw ship (`full_figure` at `Play.c:248-249`)
10. Draw ship shots (later in the code)

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

## Implemented Helper Functions ✅

### Distance Detection Functions

- **`xyindist()`** (`/src/shots/xyindist.ts`):

  - Full implementation with bounding box check and distance calculation
  - Used for ship death bunker destruction (SKILLBRADIUS)
  - Properly handles signed arithmetic and <= comparison
  - Includes detailed documentation of original C code discrepancy

- **`xyindistance()`** (`/src/shots/xyindistance.ts`):
  - Optimized version without bounding box check
  - Assumes caller has pre-verified bounds
  - Used for performance-critical inner loops

### Assembly Emulator Instructions

- **`muls`** - Signed 16x16 multiply to 32-bit result
- **`neg_w`** - Negate word with proper sign extension
- **`add_w`** - Add word preserving upper bits
- **`cmp_w`** - Signed word comparison with flag setting
- **`bgt`** - Branch if greater than (signed)

## Key Design Principles

### Three Collision Methods (From Original C Code)

1. **Pixel collision** (`check_figure` - `Draw.c:227-273`):

   - Ship vs terrain/bunkers/bunker shots
   - Most accurate for large, slow-moving objects
   - Handles complex shapes perfectly
   - Used at `Play.c:243-244` for ship collision

2. **Proximity detection** (`xyindist`, `xyindistance`):

   - Bullets vs bunkers (`Play.c:771`)
   - Shield interactions (`Play.c:516` for fuel, `Play.c:832-833` for bullets)
   - Fast circular collision detection
   - Defined in utility functions (not shown in available sources)

3. **Predictive/Line intersection** (`set_life` - `Terrain.c:146-230`):
   - Bullets vs terrain walls
   - Calculates entire trajectory at shot creation
   - Enables precise bounce calculations
   - Called when shots are created (`Bunkers.c:180`)

### Important Rules (From Original Implementation)

1. **Drawing order determines lethality** (`Play.c:219-249`):

   - Objects drawn before `erase_figure` can't kill ship
   - Objects drawn after final erase are lethal
   - Shield affects drawing order (`if (!shielding) move_bullets()` at `Play.c:238-239`)

2. **Collision masks vs visual sprites** (Referenced in `arch/COLLISION.md`):

   - Use separate collision masks for pixel detection (`ship_masks` vs `ship_defs`)
   - Allows gameplay tuning independent of visuals
   - Masks used at `Play.c:244` for collision detection

3. **Performance considerations**:

   - Bounding box checks before expensive operations (`Play.c:763-766`)
   - Predictive collision avoids per-frame checks (`Terrain.c:146-230`)
   - Proximity detection for small/round objects (`Play.c:771`)

4. **Bunker-specific rules**:
   - DIFFBUNK with rotation 2 requires 3 hits (`Play.c:778-781`)
   - Some bunkers check firing angle with `legal_angle()` (`Play.c:772-774`)
   - GENERATORBUNK has special shooting eligibility (`Bunkers.c:147-148`)

## Testing Strategy

### Phase 1: Verify Existing Systems ✅ COMPLETE

1. **Ship hitting bunker**:

   - ✅ Working correctly via pixel collision
   - ✅ Ship explodes when hitting bunker
   - ✅ Nearby bunkers destroyed on ship death

2. **Bunker shots hitting ship**:
   - Currently broken due to drawing order
   - After fix: Test getting shot by bunker
   - Expected: Ship explodes

### Phase 2: Implement New Collisions

1. **Ship shots vs bunkers** (Implement `Play.c:767-784`):

   - Test: Shoot at bunkers
   - Expected: Bunker explodes after appropriate hits
   - Special: DIFF bunkers with rotation 2 need 3 hits (`Play.c:778-781`)

2. **Bunker shots vs walls** (Implement `Bunkers.c:180`):
   - Test: Let bunker shoot at wall
   - Expected: Shot disappears at wall
   - Special: Bounce walls should cause ricochet (`Terrain.c:226-228`)

### Phase 3: Visual Feedback

1. **Bunker explosions** ✅ IMPLEMENTED:

   - ✅ Bunkers explode with sparks and shards
   - ✅ Different explosion patterns for different bunker types
   - ✅ Craters created for omnidirectional bunkers

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

1. **Critical Fix**: Move bunker shot drawing before collision check (fix `Play.c:239` order)
2. **High Priority**: Ship shots vs bunkers (core gameplay - `Play.c:767-784`)
3. **High Priority**: Bunker shots vs walls (shot lifecycle - `Bunkers.c:180`)
4. ~~**Medium Priority**: Bunker explosions~~ ✅ COMPLETE
5. **Low Priority**: Multi-hit bunker effects (DIFFBUNK handling at `Play.c:778-781`)

## Files to Modify

### Immediate Fixes

- `/src/app/games/shipMoveBitmap.ts` - Fix bunker shot drawing order (move from line ~500 to ~405, matching `Play.c:239`)

### Collision Implementation

- `/src/shots/shotsSlice.ts` - Add bunker collision to moveShipshots (implement `Play.c:767-784` logic)
- `/src/shots/bunkShoot.ts` - Add wall collision prediction (add `set_life` call as in `Bunkers.c:180`)
- `/src/shots/checkBunkerCollision.ts` - Integrate into shot movement (port `Play.c:770-783`)

### Visual Effects

- `/src/explosions/explosionsSlice.ts` - Add bunker explosions (implement kill_bunk effect)
- `/src/explosions/constants.ts` - Add bunker explosion parameters (GW.h constants)

### Testing

- Create test scenarios for each collision type
- Verify against original game behavior

## Success Criteria

- [x] Ship dies when hitting bunker
- [ ] Ship dies when hit by bunker shot
- [ ] Bunkers explode when hit by ship shots
- [ ] Hardy bunkers require multiple hits
- [ ] Bunker shots disappear at walls
- [ ] Bunker shots bounce off bounce walls
- [x] Bunker explosions show sparks
- [x] Bunkers destroyed on ship death (within SKILLBRADIUS)
- [x] Craters created for omnidirectional bunkers
- [ ] All collisions work across world wrap
- [x] Performance remains smooth

## Notes

- The original game uses different collision methods for different scenarios for good reasons (performance, accuracy, predictability)
- We should maintain this design rather than trying to use one universal collision system
- The drawing order is critical and must be preserved exactly (follow `Play.c:219-249`)
- Testing against the original game behavior is essential

## Original C Code Function Map

### Bunker Management (`Bunkers.c`):

- ✅ `do_bunkers()` (lines 26-49) - Main bunker update and rendering → `/src/planet/render/bunker.ts` (`doBunks`)
- ✅ `aim_bunk()` (lines 53-74) - Calculate bunker aiming direction → `/src/shots/aimBunk.ts`
- ✅ `aim_dir()` (lines 77-94) - Get angle to ship → `/src/shots/aimDir.ts`
- ✅ `follow_shot()` (lines 97-113) - Create aimed shot for FOLLOWBUNK → `/src/shots/followShot.ts`
- ✅ `bunk_shoot()` (lines 125-190) - Main bunker shooting logic → `/src/shots/bunkShoot.ts`
- ✅ `rand_shot()` (lines 193-209) - Create random direction shot → `/src/shots/randShot.ts`
- ✅ `do_bunks()` (lines 213-245) - Render bunkers to screen → `/src/planet/render/bunker.ts` (`doBunks`)

### Collision Detection (`Play.c`):

- ⚠️ `move_shipshots()` (lines 750-814) - Ship shot movement → `/src/shots/shotsSlice.ts` (partial - missing bunker collision)
- ⚠️ `move_bullets()` (lines 816-846) - Bunker shot movement → `/src/shots/shotsSlice.ts` (partial - missing shield check)
- ✅ Main render loop (lines 219-249) - Critical drawing order → `/src/app/games/shipMoveBitmap.ts`
- ✅ `kill_ship()` (lines 332-348) - Ship death and bunker destruction → `/src/ship/shipSlice.ts` & `/src/app/games/shipMoveBitmap.ts`
- ✅ `kill_bunk()` (lines 351-368) - Bunker destruction → `/src/planet/planetSlice.ts` (`killBunker`)

### Wall Collision (`Terrain.c`):

- ✅ `set_life()` (lines 146-230) - Predictive collision with terrain lines → `/src/shots/setLife.ts`

### Additional Functions:

- ✅ `legal_angle()` - Check if bunker can shoot at angle → `/src/shots/legalAngle.ts`
- ✅ `kill_bunk()` - Destroy bunker and create explosion → `/src/planet/planetSlice.ts` (`killBunker`)
- ✅ `xyindistance()` - Circular proximity detection (optimized) → `/src/shots/xyindistance.ts`
- ✅ `xyindist()` - Circular proximity with bounding box → `/src/shots/xyindist.ts`
- ✅ `check_figure()` - Pixel-perfect collision (`Draw.c:227-273`) → `/src/collision/checkFigure.ts`
- ✅ `start_explosion()` - Create explosion effects → `/src/explosions/explosionsSlice.ts` (`startExplosion`)
- ✅ `start_death()` - Ship death explosion → `/src/explosions/explosionsSlice.ts` (`startShipDeath`)

### Summary:

- **Fully Implemented**: 17 functions ✅
- **Partially Implemented**: 2 functions ⚠️ (missing bunker collision checks)
- **Not Implemented**: 0 functions ❌

Most of the core collision and bunker management system has been successfully ported!
