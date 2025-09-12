# Generator Gravity System

This document describes how generator bunkers create gravity wells in Continuum, based on the original 68K Mac source code.

## Overview

Generator bunkers (type `GENERATORBUNK` = 4) are special bunkers that create localized gravity wells affecting ship movement. They implement realistic inverse-square law physics to create challenging navigation areas.

## Data Structures

### `gravrec` Structure (GW.h:298-300)

```c
typedef struct {
    int x;      // X position of gravity source in world coordinates
    int y;      // Y position of gravity source in world coordinates
    int str;    // Gravity strength (negative value from generator's ranges[0].low)
} gravrec;
```

Represents a single point source of gravity in the game world.

### Static Arrays and Variables

**`gravitypoints[]`** (Play.c:560)

- Static array of up to `NUMGENS` gravity points from all generators
- Populated at level start and updated when generators are destroyed

**`numgravpoints`** (Play.c:561)

- Count of active gravity points in the array
- Used to iterate through active generators

**`gravx, gravy`** (Terrain.c:19)

- Global gravity vector for the entire planet
- Provides constant downward pull independent of generators
- Typically `gravx = 0, gravy = 20` for standard downward gravity

## Core Functions

### `init_gravity()` (Play.c:568-583)

Scans all bunkers and creates gravity points for living generators:

- Iterates through all bunkers looking for `GENERATORBUNK` type
- Copies position (x, y) from each living generator
- Stores negated `ranges[0].low` value as gravity strength
- Updates `numgravpoints` count
- Called at level start and whenever a generator is destroyed

### `gravity_vector()` (Play.c:585-636)

Calculates total gravity force at a given position using inverse-square law:

- Starts with global gravity values (`gravx`, `gravy`)
- For each gravity point, calculates distance to target position
- Applies formula: **force = strength / distance²**
- Uses 68K assembly optimization for performance
- Handles world wrapping for toroidal worlds
- Returns total X and Y force components

### Integration Points

**`ship_control()`** (Play.c:461-557, specifically line 502)

- Calls `gravity_vector()` each frame to get gravity at ship position
- Adds gravity forces to ship velocity (`dx`, `dy`)
- Disables gravity when ship is bouncing off walls

**Explosion Shards** (Terrain.c:461-463)

- Calls `gravity_vector()` for each explosion debris fragment
- Multiplies gravity by 4 (`<< 2`) for stronger effect on debris
- Adds to shard velocity components (`h`, `v`)
- Creates realistic arcing debris that falls toward planet surface and generators

**`kill_bunk()`** (Play.c:351-378)

- When destroying a generator, calls `init_gravity()` to recalculate
- Ensures destroyed generators no longer affect ship movement

**`move_ship()`** (Play.c:382-392)

- Applies accumulated velocity (including gravity) to ship position
- Uses fixed-point math for smooth sub-pixel movement

## Physics Implementation

### Inverse-Square Law

The gravity calculation implements realistic physics where force decreases with the square of distance:

1. Calculate distance components: `dx = ship.x - generator.x`, `dy = ship.y - generator.y`
2. Calculate distance squared: `dist² = dx² + dy²`
3. Calculate force components: `force_x = (strength × dx) / dist²`, `force_y = (strength × dy) / dist²`
4. Add to total gravity vector

### Assembly Optimization (Play.c:604-634)

The 68K assembly code optimizes the calculation:

- Uses `MULS` instruction for fast multiplication
- Scales values to prevent overflow while maintaining precision
- Divides by distance squared using `DIVS` instruction
- Minimum distance threshold of 8 units prevents division issues

### World Wrapping

For toroidal worlds, the gravity calculation handles wrap-around:

```c
if (worldwrap)
    if (dx > worldwidth/2)
        dx -= worldwidth;    // Use shorter path around world
    else if (dx < -worldwidth/2)
        dx += worldwidth;
```

This ensures gravity pulls via the shortest path around the world edge.

## Gameplay Properties

### Generator Characteristics

- **Type ID**: `GENERATORBUNK` = 4
- **Score Value**: 500 points when destroyed
- **Combat**: Does not shoot at player (excluded from firing selection)
- **Animation**: Rotates through 8 frames like other animated bunkers
- **Mission**: Does not count toward mission completion
- **Crater**: Leaves crater when destroyed

### Gravity Strength

- Stored in `bunker->ranges[0].low` field (repurposed from firing ranges)
- Negated when copying to gravity point (positive strength creates attractive force)
- Level designers can set different strengths for varied gameplay

### Strategic Impact

Generators create navigation challenges:

- Ships get pulled toward generator locations
- Stronger pull as ship gets closer (inverse-square law)
- Multiple generators create overlapping fields that sum together
- Destroying generators immediately removes their gravity effect
- Players must manage thrust and fuel to escape gravity wells

## Special Behaviors

### Gravity Disabled During Bouncing

When the ship bounces off walls, gravity is temporarily disabled (Play.c:500-505):

```c
if (!bouncing)
{
    gravity_vector(globalx, globaly, &xgravity, &ygravity);
    dx += xgravity;
    dy += ygravity;
}
```

This prevents:

- Ship getting stuck against walls
- Physics conflicts between bounce force and gravity
- Wall clipping when gravity pulls toward the wall

### Total Gravity System

The ship experiences two types of gravity:

1. **Global Gravity**: Constant force for entire planet (`gravx`, `gravy`)
2. **Point Gravity**: Localized forces from each generator

These combine additively to create the total gravity vector affecting the ship.

## Usage in TypeScript Implementation

For a TypeScript port, the gravity function signature would be:

```typescript
function gravityVector(args: {
  globalx: number // Object's current world X position
  globaly: number // Object's current world Y position
  gravx: number // Global gravity X (from planet data)
  gravy: number // Global gravity Y (from planet data)
  gravitypoints: GravityRec[] // Array of generator gravity points
  worldwidth: number // For world wrapping calculations
  worldwrap: boolean // Whether this is a toroidal world
}): {
  xgravity: number // Total X gravity force
  ygravity: number // Total Y gravity force
}

interface GravityRec {
  x: number // Generator's world X position
  y: number // Generator's world Y position
  str: number // Gravity strength (negative value)
}
```

This function is called:

1. Every frame for ship movement in `shipControl` (via `shipControlMovement`)
2. For each explosion shard in `updateExplosions` to create realistic arcing debris trajectories

## Performance Considerations

- Maximum of `NUMGENS` generators per level (hardware limitation)
- Assembly optimization critical for 68K Mac performance
- Gravity only recalculated when generators are created/destroyed
- Distance calculations optimized with bit shifts where possible
