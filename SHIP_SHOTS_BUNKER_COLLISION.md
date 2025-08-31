# Ship Shots vs Bunker Collision Implementation Guide

## Overview

This document provides a detailed implementation guide for ship shots hitting bunkers, with extensive citations to the original C source code to ensure exact pattern matching.

## Original C Implementation Reference

The core collision logic is in **`Play.c:760-814`** in the `move_shipshots()` function.

## Key Constants (`GW.h`)

```c
#define BRADIUS 19           /* approx. radius of bunker (GW.h) */
#define BUNKROTKINDS 2       /* number of kinds that sit on walls (GW.h) */
#define DIFFBUNK 1           /* different at each orientation (GW.h) */
#define SCENTER 16           /* ship center offset (inferred from usage) */
```

## Collision Detection Algorithm

The collision detection follows **Play.c:760-814** in the `move_shipshots()` function.

### Algorithm Overview

1. **Pre-condition**: Bunkers are sorted by X position at level load
2. **For each active shot**: Move it first, then check collisions (Play.c:760-762)
3. **Calculate bounding box** using BRADIUS=19 (Play.c:763-766)
4. **Iterate sorted bunkers** with early exit optimization (Play.c:767-769)
5. **Check collision conditions** in sequence (Play.c:770-774)
6. **Handle collision** including hardy bunkers (Play.c:775-784)

### Detailed Collision Checks (Play.c:770-774)

The collision requires ALL of these conditions:

- Bunker is alive
- Y position within bounds (top < y < bot)
- Circular distance check passes: `xyindistance(dx, dy, BRADIUS)`
- For directional bunkers (kind < BUNKROTKINDS): shot approach angle passes `legal_angle()`
- For omnidirectional bunkers (kind >= BUNKROTKINDS): no angle check needed

**Critical**: The angle check uses the shot's PREVIOUS position (Play.c:773-774):

- Previous X = current X - (velocity_h >> 3)
- Previous Y = current Y - (velocity_v >> 3)

### Difficult Bunker Logic (Play.c:778-781)

Difficult bunkers (hard to kill) are DIFFBUNK type with `(rot & 3) == 2`:

- These bunkers have `rotcount = 3` (set at level init, Play.c:145-146)
- Decrement rotcount when hit
- If rotcount > 0 after decrement, bunker survives
- Shot is always consumed regardless

### Kill Bunker Function (Play.c:351-370)

The `kill_bunk()` function handles bunker destruction:

- Sets alive = FALSE
- Creates crater for omnidirectional bunkers (kind >= BUNKROTKINDS)
- Calls init_gravity() for GENERATORBUNK
- Adds score (diffscores for DIFFBUNK, kindscores for others)
- Starts explosion and sound
- Checks mission complete status

## TypeScript Implementation

### Pre-requisite: Sort Bunkers at Level Load

In `planetSlice.ts`, when loading a level, sort bunkers by X position to match the original's assumption (Play.c:767-769):

```typescript
state.bunkers.sort((a, b) => a.x - b.x) // Robustness addition
```

### Implementation Algorithm

In `shotsSlice.ts` - `moveShipshots` reducer:

1. **Clear previous collision results**

   ```typescript
   state.pendingBunkerKills = []
   ```

2. **For each active shot** (Play.c:760-761)

   - Move shot first (Play.c:762)
   - Calculate bounding box using BRADIUS (Play.c:763-766)

3. **Iterate bunkers with sorted optimization** (Play.c:767-769)
   - Bunkers passed via `action.payload.bunkers`
   - Skip while `bunker.x < left`
   - Break when `bunker.x >= right`
4. **Check collision conditions in sequence** (Play.c:770-774):

   - Alive check
   - Y bounds check
   - Circular distance check
   - Angle check for directional bunkers only

5. **Handle collision** (Play.c:775-784):
   - Destroy shot in shots state
   - Add bunker ID to `state.pendingBunkerKills` (for ANY hit bunker)
   - Break (one shot, one kill)

### Game Loop Integration

In the game loop (where shots and planet updates are coordinated):

1. **Dispatch moveShipshots** with current bunkers:

   ```typescript
   dispatch(moveShipshots({ bunkers: state.planet.bunkers }))
   ```

2. **Read collision results** from shots state:

   ```typescript
   const { pendingBunkerKills } = state.shots
   ```

3. **Dispatch to planet slice**:
   ```typescript
   pendingBunkerKills.forEach(
     bunkerId => dispatch(killBunker(bunkerId)) // Handles both normal and difficult bunkers
   )
   ```

### Kill Bunker Action

In `planetSlice.ts` - `killBunker` action (Play.c:351-370):

**IMPORTANT BUG FIX**: The current `killBunker` action doesn't handle difficult bunkers. It needs to check for difficult bunkers and only kill them when rotcount reaches 0. This affects both ship shots AND ship death collisions.

For difficult bunkers (DIFFBUNK with `(rot & 3) === 2`):

1. These should have `rotcount = 3` from level init (Play.c:145-146)
2. Check if rotcount > 1
3. If yes, decrement rotcount and return (bunker survives)
4. If no, proceed with destruction

For all destroyed bunkers:

1. Mark bunker as dead (alive = false)
2. For omnidirectional bunkers (kind >= BUNKROTKINDS): create crater
3. For GENERATORBUNK: call `initGravity()`
4. Calculate and add score:
   - DIFFBUNK: use diffscores based on `rot & 3`
   - Others: use kindscores based on kind
5. Start explosion at bunker position
6. Play explosion sound
7. Check if mission complete

## Critical Implementation Details

1. **Move shot BEFORE collision check** (Play.c:762) - ensures proper collision at high speeds

2. **Sorted bunker optimization** (Play.c:767-769):

   - Bunkers sorted by X at level load
   - Skip bunkers with `x < left`, exit when `x >= right`
   - Original assumes pre-sorted from editor

3. **Shot trajectory for angle check** (Play.c:773-774):

   - Use PREVIOUS position: `current - (velocity >> 3)`
   - Determines approach angle for directional bunkers

4. **Difficult bunker handling** (Play.c:778-781):

   - DIFFBUNK with `(rot & 3) === 2` needs 3 hits
   - `rotcount = 3` set at level init (Play.c:145-146)
   - Shot always consumed even if bunker survives

5. **Bunker types**:
   - Directional (kind < BUNKROTKINDS): requires `legalAngle()` check
   - Omnidirectional (kind >= BUNKROTKINDS): hit from any angle

## Testing Checklist

- [ ] Bunkers sorted by X at level load
- [ ] Shot moves before collision check
- [ ] Sorted optimization: skip left, exit right
- [ ] Circular collision with BRADIUS=19
- [ ] Directional bunkers: angle check with previous shot position
- [ ] Difficult bunkers (DIFFBUNK with rot&3==2): 3 hits to destroy
- [ ] One shot kills max one bunker
- [ ] Proper scoring and effects on kill

## Files to Modify

1. **`/src/shots/shotsSlice.ts`**

   - Add state field: `pendingBunkerKills: string[]`
   - Update `moveShipshots` reducer to check collisions (Play.c:760-814)
   - Clear collision results at start of moveShipshots
   - Receive bunkers via action payload

2. **`/src/planet/planetSlice.ts`**

   - Sort bunkers by X position when level loads (robustness addition)
   - Initialize `rotcount = 3` for difficult bunkers at level init (Play.c:145-146)
   - FIX `killBunker` action to handle difficult bunkers properly:
     - Check if difficult bunker (DIFFBUNK with `(rot & 3) === 2`)
     - If difficult and rotcount > 1: decrement and return
     - Otherwise: destroy bunker

3. **Game loop file** (where frame updates happen)

   - Pass bunkers to moveShipshots action
   - Read collision results from shots state
   - Dispatch killBunker to planet slice (handles all bunker types)

4. **`/src/shots/constants.ts`** (or similar)
   - Add BRADIUS = 19
   - Add BUNKROTKINDS = 2
   - Add DIFFBUNK = 1

## Notes

- Collision check sequence (bounding box → circular → angle) is intentional for performance
- Difficult bunkers (DIFFBUNK with rot&3==2) require 3 hits per Play.c:145-146
- Sorting bunkers once at level load balances performance with robustness
- Fixing `killBunker` to handle difficult bunkers will also fix the existing ship death collision bug where these bunkers are instantly destroyed instead of taking damage
