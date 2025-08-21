## initShipshot vs ship_control()

### Key Differences Found

1. **Sound Effect Handling**
   - **Original** (Play.c:551): Always calls `start_sound(FIRE_SOUND)` when a shot is fired successfully
   - **TypeScript** (shotsSlice.ts:42-128): No sound effect handling - this functionality is missing entirely
   - **Impact**: Sound feedback for firing is not implemented

2. **Variable Initialization**
   - **Original** (Play.c:541): Sets `sp->btime = 0` directly on the shot pointer
   - **TypeScript** (shotsSlice.ts:82): Sets `btime: 0` on the new shot object
   - **Impact**: No functional difference, just different coding patterns

3. **Shot Structure Field Handling**
   - **Original** (Play.c:534-541): Directly modifies the existing shot structure in the array
   - **TypeScript** (shotsSlice.ts:74-84): Creates a new shot object and later replaces it in the array (lines 124-126)
   - **Impact**: No functional difference, reflects immutable Redux pattern vs mutable C pattern

4. **Additional Fields in TypeScript**
   - **TypeScript** (shotsSlice.ts:82-83): Initializes `strafedir: -1` and `hitlineId: ''` explicitly
   - **Original** (Play.c): These fields are not explicitly set during shot initialization
   - **Impact**: The TypeScript version is more explicit about field initialization

5. **Collision Detection Parameter**
   - **Original** (Play.c:542): Calls `set_life(sp, NULL)` with NULL for ignoreline parameter
   - **TypeScript** (shotsSlice.ts:88-95): Calls `setLife()` with `undefined` for ignoreWallId parameter
   - **Impact**: No functional difference, both represent "no wall to ignore"

6. **Position Update After setLife**
   - **Original** (Play.c:109-110): Updates pixel coordinates `x` and `y` from subpixel coordinates after advancing position
   - **TypeScript** (shotsSlice.ts:109-110): Identical logic - updates pixel coordinates from NEW subpixel position
   - **Impact**: No difference, both correctly update pixel coordinates

7. **Bounce Condition Check**
   - **Original** (Play.c:549): Checks `if (sp->lifecount == 0)` and calls `bounce_shot(sp)`
   - **TypeScript** (shotsSlice.ts:115): Checks `if (newShot.lifecount === 0 && newShot.btime > 0)` before bouncing
   - **Impact**: The TypeScript version adds an additional `btime > 0` check, which is more defensive but may differ from original behavior

8. **Wall Finding for Bounce**
   - **Original** (Play.c:550): `bounce_shot()` function internally handles finding the wall via `sp->hitline`
   - **TypeScript** (shotsSlice.ts:117-120): Explicitly finds the wall by searching for `newShot.hitlineId` in the walls array
   - **Impact**: Different implementation approach but functionally equivalent

### Summary

The most significant discrepancy is the **missing sound effect** in the TypeScript implementation. The bounce condition logic also differs slightly with the additional `btime > 0` check. All other differences are primarily due to the immutable Redux pattern vs mutable C structures, but maintain functional equivalence.

## doStrafes vs do_strafes()

### Key Differences Found

1. **Strafe Lifecycle Management - Critical Logic Missing**
   - **Original** (Terrain.c:402-407): Uses a for loop `for(str=strafes; str < &strafes[NUMSTRAFES]; str++)` to iterate through all strafe slots
   - **Original** (Terrain.c:403): Only processes strafes where `str->lifecount` is truthy (non-zero)
   - **TypeScript** (shotsSlice.ts:131-136): Uses `state.strafes.map()` to process ALL strafes in the array
   - **Impact**: The original only processes active strafes, while TypeScript processes all strafes including inactive ones

2. **Lifecount Decrement Logic**  
   - **Original** (Terrain.c:404): Decrements `str->lifecount--` unconditionally for active strafes
   - **TypeScript** (shotsSlice.ts:132-133): Only decrements if `strafe.lifecount > 0`
   - **Impact**: TypeScript prevents lifecount from going negative, original allows it to go negative

3. **Strafe Rendering Integration**
   - **Original** (Terrain.c:405): Calls `draw_strafe(str->x, str->y, str->rot, screenx, screeny)` immediately after decrementing lifecount
   - **TypeScript** (shotsSlice.ts:129-137): No rendering logic - purely state management
   - **Impact**: Original combines lifecycle management with rendering, TypeScript separates concerns

4. **Inactive Strafe Handling**
   - **Original** (Terrain.c:402-407): Inactive strafes (lifecount == 0) are completely skipped in the loop
   - **TypeScript** (shotsSlice.ts:135): Inactive strafes are returned unchanged in the map operation
   - **Impact**: Different approaches to handling inactive strafes, but both preserve them

### Summary

The most critical discrepancy is that the **TypeScript version prevents lifecount from going negative** while the original allows it. Additionally, the **original integrates rendering with lifecycle management**, while TypeScript separates these concerns. The iteration approach differs (for loop vs map), but both achieve similar results for lifecycle management.

## startStrafe vs start_strafe()

### Key Differences Found

1. **Early Return Condition - Missing Logic**
   - **Original** (Terrain.c:384): Has early return check `if (dir < 0) return;` to prevent strafe creation for invalid directions
   - **TypeScript** (shotsSlice.ts:139-168): No early return check for invalid `dir` values
   - **Impact**: TypeScript version will create strafes even with negative direction values, which the original explicitly prevents

2. **Strafe Slot Selection Algorithm - Different Implementation**
   - **Original** (Terrain.c:386-389): Uses a for loop `for(p = strafes; p < strafes+NUMSTRAFES && str->lifecount; p++)` with an early termination condition `&& str->lifecount`
   - **Original** (Terrain.c:387-389): Only continues searching if the current best candidate (`str`) still has a non-zero lifecount
   - **TypeScript** (shotsSlice.ts:154-159): Uses a standard for loop without early termination, always checks all NUMSTRAFES slots
   - **Impact**: The original can terminate early if it finds a completely unused slot (lifecount == 0), while TypeScript always scans all slots

3. **Initial Pointer Assignment**
   - **Original** (Terrain.c:386): Initializes `str=strafes` to point to the first strafe slot before the search loop
   - **TypeScript** (shotsSlice.ts:151-152): Initializes `oldestIndex = 0` and `lowestLife = state.strafes[0]!.lifecount` 
   - **Impact**: Same functional approach but different implementation patterns (pointer vs array index)

4. **Field Initialization Order and Style**
   - **Original** (Terrain.c:390-393): Sets fields individually: `str->x = x; str->y = y; str->lifecount = STRAFE_LIFE; str->rot = dir;`
   - **TypeScript** (shotsSlice.ts:162-167): Creates new object with all fields: `{x, y, lifecount: STRAFE_LIFE, rot: dir}`
   - **Impact**: No functional difference, reflects mutable C vs immutable Redux patterns

### Summary

The most significant discrepancy is the **missing early return check for negative direction values** in the TypeScript version, which could lead to creating strafes when the original would refuse to. The slot selection algorithm also differs in that the original can terminate early when finding an unused slot, while TypeScript always scans all slots. The core logic for finding the oldest strafe and initializing fields is functionally equivalent.

## moveShipshots vs move_shipshots()

### Key Differences Found

1. **Shot Processing Structure**
   - **Original** (Play.c:758-759): Uses C-style for loop `for (sp=shipshots; sp < end; sp++)` to iterate through fixed array
   - **TypeScript** (shotsSlice.ts:190): Uses `state.shipshots.map()` to process dynamic array
   - **Impact**: Different iteration approaches but functionally equivalent

2. **Collision Detection Implementation - Critical Missing Logic**
   - **Original** (Play.c:763-784): Implements complete bunker collision detection with bounding box optimization, distance checks, angle validation, and hardy bunker handling
   - **TypeScript** (shotsSlice.ts:205): Calls `checkBunkerCollision()` which is a **STUB** that always returns `{hit: false}`
   - **Impact**: **Bunker collision detection is completely non-functional** in TypeScript version

3. **Ship Collision Detection - Critical Missing Logic**
   - **Original** (Play.c:785-795): Implements ship collision detection with bounding box check, distance calculation, and shield activation
   - **TypeScript** (shotsSlice.ts:220): Calls `checkShipCollision()` which is a **STUB** that always returns `{hit: false}`
   - **Impact**: **Ship collision detection (friendly fire) is completely non-functional** in TypeScript version

4. **Wall Bounce Handling - Different Implementation**
   - **Original** (Play.c:796-800): Calls `backup_shot(sp)` then `bounce_shot(sp)` in sequence
   - **TypeScript** (shotsSlice.ts:242-248): Calls combined `bounceShotFunc()` which internally handles both backup and bounce
   - **Impact**: Functionally equivalent but different code organization

5. **Sound Effects - Missing**
   - **Original** (Play.c:791): Calls `start_sound(SHLD_SOUND)` when ship collision occurs
   - **TypeScript** (shotsSlice.ts:169-276): No sound effect handling throughout the function
   - **Impact**: Sound feedback for shield activation is missing

6. **Drawing Operations - Missing by Design**
   - **Original** (Play.c:801-812): Handles screen coordinate calculation and calls `draw_shipshot()` for rendering
   - **TypeScript** (shotsSlice.ts:169-276): No drawing operations (state management only)
   - **Impact**: Intentional separation of concerns - rendering handled elsewhere

7. **Strafe Creation Logic**
   - **Original** (Play.c:805): Calls `start_strafe(sp->x, sp->y, sp->strafedir)` directly
   - **TypeScript** (shotsSlice.ts:253-272): Implements the strafe slot selection and initialization inline
   - **Impact**: Different code organization but functionally equivalent logic

8. **Bunker Destruction Side Effects - Missing**
   - **Original** (Play.c:782): Calls `kill_bunk(bp)` which handles scoring, explosions, and other game state changes
   - **TypeScript** (shotsSlice.ts:211): Has TODO comment noting missing bunker destruction handling
   - **Impact**: Bunker destruction side effects are not implemented

9. **Hardy Bunker Special Case - Missing**
   - **Original** (Play.c:778-781): Special handling for hardy bunkers (`DIFFBUNK`) that can survive multiple hits
   - **TypeScript** (shotsSlice.ts:212): Has TODO comment but no implementation
   - **Impact**: Hardy bunker mechanics are not implemented

10. **Global Variable Usage**
    - **Original** (Play.c:785-788): Uses global variables `globalx`, `globaly`, `dead_count`, `shielding`
    - **TypeScript** (shotsSlice.ts:178-184): Receives ship state via action payload parameters
    - **Impact**: Different architectural approach - Redux pattern vs global state

### Summary

The most critical discrepancies are the **completely non-functional collision detection systems** - both bunker and ship collision detection are stub implementations that never detect hits. The **sound effects are missing**, and **bunker destruction side effects including scoring** are not implemented. The **hardy bunker mechanics** are also missing. The core shot movement and bounce physics appear to be correctly implemented, but the interaction systems that make the game playable are largely incomplete.

## moveBullets vs move_bullets()

### Key Differences Found

1. **Function Purpose and Structure**
   - **Original** (Play.c:816-846): `move_bullets()` handles bunker shots (`bunkshots`) with comprehensive logic including ship collision detection, bounce handling, and drawing
   - **TypeScript** (shotsSlice.ts:277-282): `moveBullets()` is a minimal Redux reducer that only calls `moveShot()` on each bunker shot
   - **Impact**: The TypeScript version is drastically simplified and missing most core functionality

2. **Ship Collision Detection - Critical Missing Logic**
   - **Original** (Play.c:830-838): Implements complete ship collision detection with bounding box check (`left`, `right`, `top`, `bot`), shield state check (`shielding`), and distance validation (`xyindistance()` with `SHRADIUS`)
   - **TypeScript** (shotsSlice.ts:281): No collision detection whatsoever - shots pass harmlessly through the ship
   - **Impact**: **Ship collision detection is completely non-functional** for bunker shots

3. **Shield Activation Logic - Missing**
   - **Original** (Play.c:834-837): When ship collision occurs, sets `sp->lifecount = sp->btime = 0` and `sp->strafedir = -1` to destroy the shot and prepare for strafe creation
   - **TypeScript** (shotsSlice.ts:281): No shield activation logic
   - **Impact**: Shield mechanics don't work for bunker shots

4. **Wall Bounce Handling - Missing**
   - **Original** (Play.c:839-843): Checks `if (sp->lifecount == 0 && sp->btime > 0)` and calls `backup_shot(sp)` then `bounce_shot(sp)` to handle wall collisions
   - **TypeScript** (shotsSlice.ts:281): Only calls basic `moveShot()` which handles boundary conditions but not wall bouncing
   - **Impact**: **Bunker shots cannot bounce off walls** - they simply disappear when hitting boundaries

5. **Strafe Creation from Dead Shots - Missing**
   - **Original** (Play.c:844 via DRAW_SHOT macro): Creates strafes when shots die (`sp->lifecount == 0 && sp->strafedir >= 0`) through `start_strafe(sp->x, sp->y, sp->strafedir)`
   - **TypeScript** (shotsSlice.ts:281): No strafe creation logic
   - **Impact**: Visual effects from destroyed bunker shots are missing

6. **Drawing Operations - Missing by Design**
   - **Original** (Play.c:844): Calls `DRAW_SHOT(sp)` macro which handles screen coordinate checking and calls `draw_dot_safe()` for rendering
   - **TypeScript** (shotsSlice.ts:281): No drawing operations (state management only)
   - **Impact**: Intentional separation of concerns - rendering handled elsewhere

7. **Iteration Pattern**
   - **Original** (Play.c:821-826): Uses C-style for loop with pointer arithmetic `for (sp=bunkshots; sp < end; sp++)` and lifecycle check `if (sp->lifecount)`
   - **TypeScript** (shotsSlice.ts:281): Uses `state.bunkshots.map()` to process all shots regardless of lifecycle state
   - **Impact**: Different patterns but both achieve basic iteration

8. **Screen Boundary Calculations - Missing**
   - **Original** (Play.c:822-825): Calculates collision detection boundaries based on ship position (`globalx`, `globaly`) and screen center (`SCENTER`)
   - **TypeScript** (shotsSlice.ts:281): No boundary calculations since collision detection is missing
   - **Impact**: Cannot detect when bunker shots are near the ship

### Summary

The **most critical discrepancy** is that the TypeScript `moveBullets()` function is essentially a stub that only handles basic shot movement. It's **missing all game mechanics** including ship collision detection, shield activation, wall bouncing, and strafe creation. This makes bunker shots completely non-interactive with the game world. The function needs to be completely rewritten to match the comprehensive logic of the original `move_bullets()` function. The core `moveShot()` function correctly handles basic physics, but the `moveBullets()` wrapper fails to implement any of the game's interaction systems.

## bunkShoot Implementation

### Key Differences Found

1. **Overall Architecture - Well Implemented**
   - **Original** (Bunkers.c:119-190): `bunk_shoot()` is a C function that operates directly on global arrays
   - **TypeScript** (shotsSlice.ts:283-298): `bunkShoot` reducer calls `bunkShootFn()` which returns a pure function
   - **TypeScript** (bunkShoot.ts:106-235): Main logic implemented in `bunkShoot()` export function
   - **Impact**: Good separation of concerns with functional approach vs imperative C style

2. **Shot Array Management - Correct Implementation**
   - **Original** (Bunkers.c:127-129): Uses pointer iteration `for (i=0, sp=bunkshots; i<NUMSHOTS && sp->lifecount; i++, sp++)` to find empty slot
   - **TypeScript** (bunkShoot.ts:120-130): Uses array iteration `for (shotIndex = 0; shotIndex < SHOT.NUMSHOTS && bunkshots[shotIndex]!.lifecount; shotIndex++)` 
   - **Impact**: Functionally equivalent - both find first empty shot slot and return early if none available

3. **Screen Boundary Calculations - Correct Implementation**
   - **Original** (Bunkers.c:131-139): Calculates `left`, `right`, `farleft`, `farright`, `top`, `bot` for eligible bunker detection
   - **TypeScript** (bunkShoot.ts:133-143): Identical calculations with same variable names and logic
   - **Impact**: Perfect match in boundary calculation logic

4. **Eligible Bunker Selection - Correct Implementation**
   - **Original** (Bunkers.c:141-160): Uses `char eligible[NUMBUNKERS]` array with weighted selection based on bunker type
   - **TypeScript** (bunkShoot.ts:145-177): Uses `Array<number>(PLANET.NUMBUNKERS).fill(0)` with identical weighting logic
   - **Impact**: Correct implementation of weighted random selection

5. **Bunker Type Weighting - Correct Implementation**
   - **Original** (Bunkers.c:147-154): `GENERATORBUNK` gets weight 0, `DIFFBUNK` uses rotation-based weighting
   - **TypeScript** (bunkShoot.ts:158-173): `BunkerKind.GENERATOR` gets weight 0, `BunkerKind.DIFF` uses identical rotation logic
   - **Impact**: Perfect match in bunker type weighting system

6. **Random Bunker Selection - Correct Implementation**
   - **Original** (Bunkers.c:164-168): Uses `sum = rint(sum)` then iterates to find selected bunker
   - **TypeScript** (bunkShoot.ts:182-189): Uses `selectedSum = rint(sum)` with identical selection algorithm
   - **Impact**: Correct weighted random selection implementation

7. **Shot Velocity Calculation - Correct Implementation**
   - **Original** (Bunkers.c:170-174): Calls `follow_shot()` for `FOLLOWBUNK`, `rand_shot()` for others using `bp->ranges[i]`
   - **TypeScript** (bunkShoot.ts:196-202): Calls `followShot()` for `BunkerKind.FOLLOW`, `randShot()` for others using `bp.ranges[rangeIndex]`
   - **Impact**: Correct delegation to appropriate shot velocity calculation functions

8. **Shot Position Initialization - Correct Implementation**
   - **Original** (Bunkers.c:176-177): Sets `sp->x8 = (bp->x + xbshotstart[bp->kind][bp->rot]) << 3` and similar for y8
   - **TypeScript** (bunkShoot.ts:85-86): Uses `x8 = (bp.x + xbshotstart[bp.kind]![bp.rot]!) << 3` in `initializeShot()`
   - **Impact**: Identical position initialization logic using same lookup tables

9. **Shot Lifecycle Setup - Correct Implementation**
   - **Original** (Bunkers.c:178-179): Sets `sp->lifecount = BUNKSHLEN` and `sp->btime = 0`
   - **TypeScript** (bunkShoot.ts:94-95): Sets `lifecount: SHOT.BUNKSHLEN` and `btime: 0` where `SHOT.BUNKSHLEN = 30`
   - **Impact**: Correct lifecycle initialization (BUNKSHLEN is defined as SHOTLEN-5 = 30 in original)

10. **Sound Effect Implementation - Correct Implementation**
    - **Original** (Bunkers.c:181-189): Loops through world positions to determine if bunker is on-screen or near-screen for sound
    - **TypeScript** (bunkShoot.ts:215-231): Identical loop logic with same boundary checks for `BUNK_SOUND` and `SOFT_SOUND`
    - **Impact**: Sound positioning logic is correctly implemented (though sound calls are commented out)

11. **followShot Function - Correct Implementation**
    - **Original** (Bunkers.c:97-116): `follow_shot()` calculates angle using `aim_bunk()` and `aim_dir()` 
    - **TypeScript** (bunkShoot.ts:15-41): `followShot()` uses identical logic with `aimBunk()` and `aimDir()`
    - **Impact**: Correct implementation of follow bunker targeting logic

12. **randShot Function - Correct Implementation**  
    - **Original** (Bunkers.c:193-209): `rand_shot()` uses angle interpolation with `shotvecs` lookup table
    - **TypeScript** (bunkShoot.ts:47-74): `randShot()` uses identical angle interpolation and `SHOT.shotvecs` table
    - **Impact**: Perfect match in velocity vector calculation

13. **Angle Calculation Precision - Minor Difference**
    - **Original** (Bunkers.c:114): Uses integer division `angle /= 45` for angle normalization
    - **TypeScript** (bunkShoot.ts:37): Uses `Math.floor(angle / 45)` for same calculation  
    - **Impact**: Functionally equivalent but TypeScript version is more explicit about floor operation

14. **Array Update Pattern - Architectural Difference**
    - **Original** (Bunkers.c:127-180): Modifies shot array element directly via pointer
    - **TypeScript** (bunkShoot.ts:210-212): Creates new array with `[...bunkshots]` and replaces element immutably
    - **Impact**: Different patterns but functionally equivalent - Redux immutability vs C mutability

15. **Missing set_life Call - Potential Issue**
    - **Original** (Bunkers.c:180): Calls `set_life(sp, NULL)` after initializing shot to handle collision detection setup
    - **TypeScript** (bunkShoot.ts:94-96): Sets `hitlineId: ''` but doesn't call equivalent collision setup
    - **Impact**: May affect initial collision state - collision detection setup might be missing

### Summary

The `bunkShoot` implementation is **remarkably well done** and follows the original logic very closely. The core algorithms for bunker selection, weighting, shot positioning, velocity calculation, and sound positioning are all correctly implemented. The functional architecture with transformer functions is clean and maintainable while preserving the original behavior.

The only notable discrepancy is the **missing `set_life()` equivalent call** which might affect initial collision detection setup for bunker shots. The sound effects are properly positioned but commented out (likely intentionally during development). The angle calculation uses explicit `Math.floor()` instead of integer division, which is actually more precise.

## setLife vs set_life()

### Key Differences Found

1. **Function Signature and Structure - Well Implemented**
   - **Original** (Terrain.c:114-138): `set_life(sp, ignoreline)` modifies shot directly, uses global state
   - **TypeScript** (setLife.ts:37-79): `setLife(shot, walls, totallife, ignoreWallId, worldwidth, worldwrap)` returns new shot, pure functional approach
   - **Impact**: Excellent architectural improvement using functional patterns while maintaining equivalent logic

2. **Wall Filtering Approach - Correct Implementation**
   - **Original** (Terrain.c:162): Uses `line != ignoreline` comparison within the wall iteration loop
   - **TypeScript** (setLife.ts:46-48): Pre-filters walls using `walls.filter(w => w.id !== ignoreWallId)` before calling getLife
   - **Impact**: Functionally equivalent but TypeScript approach is cleaner and more explicit

3. **World Wrapping Logic - Correct Implementation**
   - **Original** (Terrain.c:127-137): Modifies `sp->x8` temporarily, calls `get_life()`, then restores `sp->x8`
   - **TypeScript** (setLife.ts:59-69): Creates temporary `adjustedShot` object, calls `getLife()`, preserves original shot
   - **Impact**: Perfect functional equivalent - same logic but using immutable patterns

4. **Initial Field Setup - Missing Logic**
   - **Original** (Terrain.c:121-122): Sets `sp->strafedir = -1` and `sp->hitline = NULL` before collision detection
   - **TypeScript** (setLife.ts:52-53): Relies on `getLife()` to initialize these values, no explicit pre-initialization
   - **Impact**: Minor difference in initialization approach, but `getLife()` correctly initializes with defaults

5. **Collision Detection Implementation - Architecturally Different**
   - **Original** (Terrain.c:124): Calls `get_life(sp, ignoreline)` which modifies shot fields directly
   - **TypeScript** (setLife.ts:53): Calls `getLife(shot, wallsToCheck, totallife)` which returns result object
   - **Impact**: Different architectural patterns but functionally equivalent

6. **Field Update Pattern - Architectural Difference**
   - **Original** (Terrain.c:225-229): `get_life()` directly modifies `sp->lifecount`, `sp->strafedir`, `sp->hitline`, `sp->btime`
   - **TypeScript** (setLife.ts:72-78): Returns new shot object with updated `lifecount`, `strafedir`, `hitlineId`, `btime`
   - **Impact**: Redux immutable pattern vs C mutable pattern - functionally equivalent

7. **World Width Calculation - Identical Implementation**
   - **Original** (Terrain.c:120): `world8 = worldwidth << 3`
   - **TypeScript** (setLife.ts:50): `const world8 = worldwidth << 3`
   - **Impact**: Perfect match in bit-shifting calculation

8. **Endpoint Calculation - Identical Implementation**
   - **Original** (Terrain.c:126): `x2 = (sp->x8 + sp->lifecount * sp->h) >> 3`
   - **TypeScript** (setLife.ts:56): `const x2 = (shot.x8 + result.framesToImpact * shot.h) >> 3`
   - **Impact**: Identical calculation using collision result

9. **World Wrap Boundary Checks - Identical Implementation**
   - **Original** (Terrain.c:127-137): `if (x2 < 0)` and `else if (x2 > worldwidth)` with position adjustments
   - **TypeScript** (setLife.ts:59-69): Identical boundary conditions with same position adjustment logic
   - **Impact**: Perfect match in world wrapping algorithm

### getLife vs get_life() Internal Implementation

10. **Shot Position Updates - Missing in TypeScript**
    - **Original** (Terrain.c:154-155): Updates `sp->x = sp->x8 >> 3` and `sp->y = sp->y8 >> 3` before collision detection
    - **TypeScript** (getLife.ts:121-122): Calculates local `x` and `y` variables but doesn't update shot object
    - **Impact**: Original updates shot's pixel coordinates; TypeScript preserves original shot unchanged

11. **Total Lifetime Calculation - Different Approach**
    - **Original** (Terrain.c:153): `totallife = shortest + sp->btime` (uses existing btime from shot)
    - **TypeScript** (getLife.ts:115): `const totallifetime = totallife` (uses parameter passed from setLife)
    - **Impact**: TypeScript receives totallife as parameter; original calculates from shot state

12. **Wall Iteration Pattern - Architecturally Different**
    - **Original** (Terrain.c:159-160): `for (line = lines; line->type; line++)` with null-terminated global array
    - **TypeScript** (getLife.ts:127): `for (const line of walls)` with filtered array parameter
    - **Impact**: Different data structures but functionally equivalent iteration

13. **Collision Side Detection - Integer Math Implementation**
    - **Original** (Terrain.c:181-186): Uses division `(sp->y - line->starty) < m1 * (sp->x - line->startx) / 2`
    - **TypeScript** (getLife.ts:157-162): Uses multiplication `imul(y - line.starty, 2) - imul(m1, x - line.startx)` to avoid division
    - **Impact**: TypeScript uses more precise integer arithmetic avoiding floating-point division

14. **Integer Division Usage - More Precise in TypeScript**
    - **Original** (Terrain.c:165,167,192,204,208-211,215): Uses C integer division throughout
    - **TypeScript** (getLife.ts:140,143,167,169,181,193,199): Uses explicit `idiv()` function for consistent integer division
    - **Impact**: TypeScript implementation ensures consistent integer division behavior across platforms

15. **Long Integer Arithmetic - Correctly Handled**
    - **Original** (Terrain.c:204,206,208-211): Uses `long` type for m2 calculation and intersection math
    - **TypeScript** (getLife.ts:181,184,188-193): Uses standard JavaScript numbers but with careful bit manipulation
    - **Impact**: TypeScript handles large number arithmetic correctly despite lacking explicit long types

### Summary

The `setLife` and `getLife` implementations are **exceptionally well done** and maintain very high fidelity to the original algorithms. The core collision detection mathematics, world wrapping logic, and wall filtering are all correctly implemented.

**Key Strengths:**
- World wrapping logic is perfectly implemented
- Collision detection algorithms match the original precisely  
- Integer arithmetic is more precise using explicit `idiv()` and `imul()` functions
- Functional architecture is cleaner while maintaining equivalent behavior
- Wall filtering is more explicit and maintainable

**Minor Differences:**
- Shot pixel coordinates (`x`, `y`) are not updated in TypeScript version (may not be needed)
- Total lifetime calculation uses different approaches but achieves same result
- Side detection uses multiplication instead of division for better precision

The implementations demonstrate excellent understanding of the original collision detection system and successfully port complex geometric calculations to TypeScript while improving code clarity and maintainability.

## bounceShot vs bounce_shot()

### Key Differences Found

1. **Shot Backup Logic - Correct Implementation**
   - **Original** (Play.c:798): Calls `backup_shot(sp)` in sequence before bounce calculation
   - **Original** (Play.c:881-884): `backup_shot()` uses C integer division `sp->x8 -= sp->h / 3` and `sp->y8 -= sp->v / 3`
   - **TypeScript** (bounceShot.ts:22-34): Calls `backupShot()` which uses `idiv()` function: `backedUp.x8 -= idiv(backedUp.h, 3)`
   - **Impact**: TypeScript uses more precise integer division via `idiv()` to match C's truncation behavior, rather than `Math.floor()`

2. **Bounce Angle Calculations - Identical Implementation**
   - **Original** (Play.c:937): `x1 = bounce_vecs[sp->strafedir]`
   - **Original** (Play.c:938): `y1 = bounce_vecs[(sp->strafedir+12)&15]`
   - **TypeScript** (bounceShot.ts:73): `const x1 = BOUNCE_VECS[bouncedShot.strafedir]!`
   - **TypeScript** (bounceShot.ts:75): `const y1 = BOUNCE_VECS[(bouncedShot.strafedir + 12) & 15]!`
   - **Impact**: Perfect match in wall normal vector calculation using 12-position offset for perpendicular component

3. **bounce_vecs Constants - Identical Values**
   - **Original** (Play.c:289-290): `{0, 18, 34, 44, 48, 44, 34, 18, 0, -18, -34, -44, -48, -44, -34, -18, 0}`
   - **TypeScript** (constants.ts:68-70): `[0, 18, 34, 44, 48, 44, 34, 18, 0, -18, -34, -44, -48, -44, -34, -18]`
   - **Impact**: Identical bounce vector values for wall normal calculations (extra trailing 0 in original is unused)

4. **Velocity Reflection Mathematics - Identical Implementation**
   - **Original** (Play.c:939): `dot = sp->h * x1 + sp->v * y1`
   - **Original** (Play.c:940-941): `sp->h -= x1 * dot / (24*48)` and `sp->v -= y1 * dot / (24*48)`
   - **TypeScript** (bounceShot.ts:78): `const dot = bouncedShot.h * x1 + bouncedShot.v * y1`
   - **TypeScript** (bounceShot.ts:83-84): `bouncedShot.h -= idiv(x1 * dot, 24 * 48)` and `bouncedShot.v -= idiv(y1 * dot, 24 * 48)`
   - **Impact**: Perfect match in reflection formula v = v - 2(v·n)n, with TypeScript using `idiv()` for consistent integer division

5. **Bounce Loop Logic - Identical Implementation**
   - **Original** (Play.c:935): `for (i=0; i<8 && sp->lifecount==0 && sp->btime>0; i++)`
   - **TypeScript** (bounceShot.ts:66-69): `for (let i = 0; i < 8 && bouncedShot.lifecount === 0 && bouncedShot.btime > 0; i++)`
   - **Impact**: Identical 8-iteration limit and same conditions for continuing bounce attempts

6. **Lifecycle Restoration - Identical Implementation**
   - **Original** (Play.c:942-943): `sp->lifecount = sp->btime; sp->btime = 0;`
   - **TypeScript** (bounceShot.ts:87-88): `bouncedShot.lifecount = bouncedShot.btime; bouncedShot.btime = 0;`
   - **Impact**: Perfect match in shot lifecycle restoration after bounce

7. **Collision Detection After Bounce - Different Implementation**
   - **Original** (Play.c:944): `set_life(sp, sp->hitline)` passes the hit line as ignore parameter
   - **TypeScript** (bounceShot.ts:95-102): `setLife(bouncedShot, walls, bouncedShot.lifecount, wall.id, worldwidth, worldwrap)` passes wall.id as ignore parameter  
   - **Impact**: Functionally equivalent but different parameter passing - original uses line pointer, TypeScript uses wall ID string

8. **Strafe Direction Reset Logic - Identical Implementation**
   - **Original** (Play.c:946-947): `if (sp->lifecount == 0) sp->strafedir = -1;`
   - **TypeScript** (bounceShot.ts:106-108): `if (bouncedShot.lifecount === 0) { bouncedShot.strafedir = -1; }`
   - **Impact**: Perfect match in strafe effect removal for unsuccessful bounces

9. **Hit Line Clearing - Additional TypeScript Logic**
   - **Original** (Play.c:926-948): No explicit clearing of `hitline` field during bounce
   - **TypeScript** (bounceShot.ts:91): `bouncedShot.hitlineId = ''` explicitly clears the hit line reference
   - **Impact**: TypeScript is more explicit about clearing hit line state after bounce

10. **Function Architecture - Improved in TypeScript**
    - **Original** (Play.c:926-948): `bounce_shot()` modifies shot directly via pointer, no return value
    - **TypeScript** (bounceShot.ts:55-111): `bounceShot()` returns new shot object, functional approach with immutability
    - **Impact**: Better architectural pattern in TypeScript while maintaining identical physics

11. **World Parameters - Enhanced TypeScript Implementation**
    - **Original** (Play.c:944): `set_life()` uses global world state internally
    - **TypeScript** (bounceShot.ts:95-102): `setLife()` receives `worldwidth` and `worldwrap` as explicit parameters
    - **Impact**: TypeScript version has better parameter isolation and testability

### Summary

The `bounceShot` implementation is **exceptionally accurate** and maintains near-perfect fidelity to the original `bounce_shot()` function. All core physics calculations including backup logic, wall normal vector calculations, dot product computation, velocity reflection, and bounce iteration logic are identically implemented.

**Key Strengths:**
- Perfect match in reflection physics mathematics using the formula v = v - 2(v·n)n
- Identical bounce vector constants and wall normal calculations
- Correct 8-iteration limit and bounce continuation conditions  
- Proper lifecycle management and strafe direction handling
- More precise integer division using `idiv()` function
- Better architectural patterns with immutability and explicit parameters

**Minor Differences:**
- TypeScript explicitly clears `hitlineId` after bounce (improvement)
- Uses string-based wall ID instead of pointer for ignore parameter (architectural difference)
- Functional return pattern vs direct mutation (architectural improvement)

The implementation demonstrates excellent understanding of the original bounce physics and successfully maintains the precise mathematical behavior while improving code architecture and maintainability.

## moveShot vs move_shot()

### Key Differences Found

1. **Early Return Logic - Additional Check in TypeScript**
   - **Original** (Play.c:848-874): No early return condition, processes shots regardless of lifecycle state
   - **TypeScript** (moveShot.ts:24-26): Early return `if (shot.lifecount <= 0) return shot` prevents processing dead shots
   - **Impact**: TypeScript version is more defensive and avoids unnecessary processing of expired shots

2. **Position Update Order - Identical Implementation**
   - **Original** (Play.c:856-859): Updates local variables `x = sp->x8; y = sp->y8; x += sp->h; y += sp->v;`
   - **TypeScript** (moveShot.ts:35-36): Updates local variables `let x = sp.x8 + sp.h` and `let y = sp.y8 + sp.v`
   - **Impact**: Functionally identical, TypeScript combines assignment with addition in one step

3. **Lifecount Decrement Logic - Identical Implementation**
   - **Original** (Play.c:855): `sp->lifecount--` decrements before position update
   - **TypeScript** (moveShot.ts:32): `sp.lifecount--` decrements before position update
   - **Impact**: Perfect match in lifecycle management timing

4. **Vertical Boundary Check - Identical Implementation**
   - **Original** (Play.c:860-861): `if (y < 0) sp->lifecount = 0;`
   - **TypeScript** (moveShot.ts:39-41): `if (y < 0) { sp.lifecount = 0; }`
   - **Impact**: Perfect match in top boundary collision handling

5. **Horizontal Boundary and World Wrap Logic - Identical Implementation**
   - **Original** (Play.c:862-867): 
     ```c
     if (x < 0)
       if (worldwrap) x += worldwth8;
       else           sp->lifecount = 0;
     else if (x >= worldwth8)
       if (worldwrap) x -= worldwth8;
       else           sp->lifecount = 0;
     ```
   - **TypeScript** (moveShot.ts:44-56):
     ```typescript
     if (x < 0) {
       if (env.worldwrap) {
         x += worldwth8
       } else {
         sp.lifecount = 0
       }
     } else if (x >= worldwth8) {
       if (env.worldwrap) {
         x -= worldwth8
       } else {
         sp.lifecount = 0
       }
     }
     ```
   - **Impact**: Perfect match in world wrapping and boundary collision logic

6. **World Width Calculation - Identical Implementation**
   - **Original** (Play.c:853): `worldwth8 = worldwidth << 3;`
   - **TypeScript** (moveShot.ts:29): `const worldwth8 = env.worldwidth << 3`
   - **Impact**: Identical bit-shifting calculation for 8x pixel precision

7. **High-Precision Position Update - Identical Implementation**
   - **Original** (Play.c:868-869): `sp->x8 = x; sp->y8 = y;`
   - **TypeScript** (moveShot.ts:59-60): `sp.x8 = x; sp.y8 = y;`
   - **Impact**: Perfect match in subpixel position storage

8. **Pixel Coordinate Conversion - Identical Implementation**
   - **Original** (Play.c:870-873): `x >>= 3; y >>= 3; sp->x = x; sp->y = y;`
   - **TypeScript** (moveShot.ts:63-64): `sp.x = x >> 3; sp.y = y >> 3;`
   - **Impact**: Identical bit-shifting conversion from subpixel to pixel coordinates

9. **Parameter Architecture - Enhanced in TypeScript**
   - **Original** (Play.c:849): Takes only shot pointer `register shotrec *sp`, uses global variables `worldwidth`, `worldwrap`
   - **TypeScript** (moveShot.ts:16-22): Takes shot and explicit environment object `{worldwidth, worldwrap}`
   - **Impact**: TypeScript version has better parameter isolation and testability, avoiding global state dependency

10. **Return Pattern - Architectural Difference**
    - **Original** (Play.c:848-874): Modifies shot directly via pointer, no return value (void function)
    - **TypeScript** (moveShot.ts:22-67): Returns new shot object using functional immutable pattern
    - **Impact**: TypeScript follows Redux immutability patterns vs C mutable approach, functionally equivalent

11. **Variable Declaration Style - Different Patterns**
    - **Original** (Play.c:851): Declares all variables at function start: `register int worldwth8, x, y;`
    - **TypeScript** (moveShot.ts:28-29,35-36): Declares variables at point of use with `const` and `let`
    - **Impact**: Modern TypeScript style vs older C style, no functional difference

### Summary

The `moveShot` implementation is **exceptionally accurate** and maintains near-perfect fidelity to the original `move_shot()` function. All core physics calculations including lifecycle management, position updates, boundary checking, and world wrapping are identically implemented.

**Key Strengths:**
- Perfect match in world wrapping logic and boundary collision detection
- Identical bit-shifting calculations for subpixel precision 
- Correct lifecycle decrement timing before position update
- Proper conversion from high-precision to pixel coordinates
- Better architectural patterns with explicit parameters and immutability

**Minor Differences:**
- TypeScript adds defensive early return for dead shots (improvement)
- Uses explicit environment parameters instead of global state (improvement) 
- Combines position calculation steps for cleaner code
- Functional return pattern vs direct mutation (architectural improvement)

The implementation demonstrates excellent understanding of the original shot physics and successfully maintains the precise movement behavior while improving code architecture and maintainability. No functional discrepancies were found - all game mechanics are correctly preserved.