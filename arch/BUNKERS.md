# Continuum Bunker System Architecture

This document details the bunker system implementation in Continuum, including data structures, initialization, rendering, combat mechanics, and lifecycle management.

## Overview

Bunkers are the primary enemy targets in Continuum. The game supports up to 25 bunkers per planet (GW.h:38), with various types offering different behaviors, difficulty levels, and strategic importance.

## Data Structures

### Core Bunker Record

```c
bunkrec bunkers[NUMBUNKERS];  // Global array, max 25 bunkers
```

(Declared in Play.c:10, defined in GW.h:73-81)

Each bunker record contains (GW.h:73-81):

- **Position**: `x, y` coordinates in world space
- **Type**: `kind` field determining bunker behavior
- **Orientation**: `rot` field (0-15 for 16 directions)
- **Status**: `alive` boolean flag
- **Combat**: `ranges` array for targeting parameters
- **Special**: `rotcount` for rotation timing and hit points

## Bunker Types

### Bunker Kind Lookup Table

| Kind Value | Constant Name   | Type                | Rotation                | Score    | Special Features       |
| ---------- | --------------- | ------------------- | ----------------------- | -------- | ---------------------- |
| 0          | `WALLBUNK`      | Wall-mounted        | Fixed (16 orientations) | 100      | Basic defensive bunker |
| 1          | `DIFFBUNK`      | Difficulty-variable | Fixed (16 orientations) | 10-300\* | Multiple hits required |
| 2          | `GROUNDBUNK`    | Ground-based        | Animated (8 frames)     | 100      | Rotating animation     |
| 3          | `FOLLOWBUNK`    | Tracking            | Animated (8 frames)     | 400      | Follows player ship    |
| 4          | `GENERATORBUNK` | Gravity Generator   | Animated (8 frames)     | 500      | Creates gravity field  |

\*DIFFBUNK scoring based on `rot & 3`: 0=10pts, 1=200pts, 2=300pts (3 hits), 3=200pts (Play.c:354-355)

Constants defined in GW.h:112-117

### Type Categories

**Static Wall/Ground Bunkers (kinds 0-1, `< BUNKROTKINDS`)** (GW.h:113)

- Fixed orientation chosen at placement (0-15)
- Wall bunkers sit on terrain lines
- Use masked rendering for side views (orientations 2-8)
- Use XOR rendering for up/down views (orientations 0-1, 9-15)

**Animated Bunkers (kinds 2-4, `>= BUNKROTKINDS`)**

- Continuously cycle through 8 animation frames (GW.h:118)
- Animation speed: changes every `BUNKFCYCLES` (2) ticks (GW.h:119)
- Always use XOR rendering
- Leave craters when destroyed (Play.c:359-362)

### Special Behaviors by Type

**WALLBUNK (0)**: Standard defensive bunker

- Most common type
- No special behavior

**DIFFBUNK (1)**: Variable difficulty

- Hit points based on initial rotation modulo 4
- Rotation value 2 requires 3 hits
- Other rotations destroyed in 1 hit

**GROUNDBUNK (2)**: Basic rotating bunker

- Simple animated threat
- No special targeting

**FOLLOWBUNK (3)**: Smart tracking bunker

- Calculates angle to player ship
- Rotates to track player (3x slower than normal animation)
- Uses predictive shot leading

**GENERATORBUNK (4)**: Environmental hazard

- Creates gravity well affecting ship movement
- Does not shoot (excluded from firing selection)
- Does not count for mission completion
- Destruction triggers gravity recalculation

## Initialization

At the start of each planet (`init_planet()` in Play.c:121-158):

```c
for(b=bunkers; b < bunkers+NUMBUNKERS; b++)
{
    b->alive = TRUE;
    if (b->kind >= BUNKROTKINDS)
    {
        b->rot = rint(BUNKFRAMES);      // Random initial rotation
        b->rotcount = rint(BUNKFCYCLES); // Random rotation phase
    }
    if (b->kind == DIFFBUNK && (b->rot & 3) == 2)
        b->rotcount = 3;  // Set hit points for hard bunkers
}
```

(Play.c:137-147)

## Rendering System

The game uses two different rendering functions based on bunker orientation:

### 1. `draw_bunker()` - XOR-based rendering (Draw.c:715-823)

Used for:

- All rotating bunkers
- Bunkers facing up/down (rot <= 1 or rot >= 9)

Features:

- Uses XOR drawing for efficiency
- Aligns with background gray pattern using position-based checkering
- 48-pixel wide sprites with clipping support

### 2. `full_bunker()` - Mask-based rendering (Draw.c:826-941)

Used for:

- Side-facing static bunkers (rot between 2 and 8)

Features:

- Full transparency mask support
- Cleaner edges for complex side-view sprites
- More computationally intensive but higher quality

### Rendering Decision Logic (Bunkers.c:232-242)

```c
if (bp->kind >= BUNKROTKINDS || (bp->rot <= 1 || bp->rot >= 9))
{
    align = (bp->x + bp->y + xcenter + ycenter) & 1;
    draw_bunker(bunkx, bunky, bunker_images[align][bp->kind][bp->rot]);
}
else
    full_bunker(bunkx, bunky,
                bunker_defs[bp->kind][bp->rot],
                bunker_masks[bp->kind][bp->rot]);
```

## Combat Mechanics

### Bunker Firing System

1. **Shot Frequency**: Controlled by `shootslow` parameter (Bunkers.c:30)
2. **Target Selection** (Bunkers.c:119-190):
   - Only bunkers on screen (with margin `SHOOTMARG`)
   - Excludes generator bunkers (Bunkers.c:147-148)
   - Weights selection by bunker difficulty (Bunkers.c:149-155)
3. **Shot Creation**: Up to 20 simultaneous bunker shots (`NUMSHOTS` - GW.h:42)

### Firing Angle System

#### Angle Representation

The game uses a **512-unit circle** system (not 360 degrees):

- 0-511 represents a full circle
- This allows for efficient bit operations (512 = 2^9)
- Conversion: 512 units = 360 degrees, so 1 unit ≈ 0.703 degrees

#### Core Components

**Range Structure**: Each bunker has 2 firing ranges (arcs):

```c
rangerec ranges[2];  // Each range has {low, high} angle values
```

- Bunkers randomly select one of the two ranges when firing (Bunkers.c:170)
- Ranges define angular sectors where the bunker can shoot

**Shot Vectors Table** (Play.c:38-41):

```c
int shotvecs[32]={0, 14, 27, 40, 51, 60, 67, 71,
                  72, 71, 67, 60, 51, 40, 27, 14,
                  0,-14,-27,-40,-51,-60,-67,-71,
                 -72,-71,-67,-60,-51,-40,-27,-14};
```

- 32 entries representing velocities at 32 compass directions
- Used to convert angles to X/Y velocity components

#### Firing Process

1. **Angle Determination**:

   - **Standard Bunkers**: Randomly pick range 0 or 1, then random angle within that range
   - **Following Bunkers**: Calculate exact angle to player, add ±2 units for spread

2. **Angle-to-Velocity Conversion** (`rand_shot()` - Bunkers.c:193-209):

   - Convert 512-unit angle to 32-direction system (angle >> 4)
   - Get fractional part (angle & 15)
   - Interpolate between adjacent shot vectors for smooth velocity

3. **Shot Origin Points** (Bunkers.c:176-177):
   - Each bunker type/rotation has specific shot spawn points
   - Stored in `xbshotstart[kind][rot]` and `ybshotstart[kind][rot]` (Figs.c)
   - Ensures shots appear to emerge from bunker's weapon

### Targeting Behaviors

#### Following Bunker Targeting (`aim_bunk()` - Bunkers.c:53-74)

1. Calculates angle to player (0-359 degrees)
2. Converts to 8-direction system (0-7)
3. Determines rotation direction:
   - If target within 4 steps clockwise: rotate clockwise
   - Otherwise: rotate counter-clockwise
4. Rotates 1 step every 3x normal cycle time (Bunkers.c:38)

#### World Wrap Handling (`aim_dir()` - Bunkers.c:77-94)

- Checks if distance > half world width
- Adjusts by ±worldwidth to find shortest path
- Ensures bunkers shoot "around" the world edge

#### Angle Range Rotation

- When bunker is placed, its firing ranges rotate with its orientation
- Ranges wrap around at 512 (e.g., 500 + 20 = 4)
- This ensures bunkers fire in their "forward" direction

### Line of Sight

`legal_angle()` (Play.c:895-924) ensures bunkers can only be hit from exposed side:

- Calculates angle from shot origin to bunker center
- Compares with bunker's orientation
- Only allows hits from ±90° of bunker's facing direction

## Destruction and Scoring

### Death Sequence (`kill_bunk()` - Play.c:351-378)

1. Mark bunker as not alive
2. Create crater if rotating bunker (Play.c:359-362)
3. Recalculate gravity if generator (Play.c:363-364)
4. Award points based on type/difficulty (Play.c:365-366)
5. Start explosion effects (Play.c:367-368)
6. Check mission completion (Play.c:369-377)

### Scoring System (Play.c:354-355)

```c
static int kindscores[5] = {100, 0, 100, 400, 500};
static int diffscores[4] = {10, 200, 300, 200};
```

- WALLBUNK: 100 points
- DIFFBUNK: 10-300 points (based on rot & 3)
- GROUNDBUNK: 100 points
- FOLLOWBUNK: 400 points
- GENERATORBUNK: 500 points

### Mission Completion

- Triggered when all non-generator bunkers destroyed (Play.c:369-377)
- Initiates planet completion sequence after delay (`MICODELAY` - Play.c:194-195)

## Special Mechanics

### Skill Kill (Play.c:334-348)

When player ship dies near a bunker (within `SKILLBRADIUS`):

- Bunker is destroyed along with ship
- Provides risk/reward gameplay mechanic
- Only works if bunker has line of sight to ship

### Sound Effects

- `BUNK_SOUND`: Bunker firing (on screen) (Bunkers.c:185)
- `SOFT_SOUND`: Bunker firing (near screen edge) (Bunkers.c:188)
- `EXP1_SOUND`: Bunker explosion (Play.c:368)

## Performance Optimizations

1. **Spatial Culling**: Only process bunkers near screen
2. **Dual Drawing Systems**: XOR for simple, masked for complex
3. **Background Alignment**: Checkered pattern prevents XOR artifacts
4. **Assembly Optimizations**: Core drawing routines in 68K assembly

## World Wrapping Support

### Rendering Wrap Support

**Double-Check Rendering**: The main bunker rendering loop in `do_bunkers()` (Bunkers.c:26-49) is called twice when the screen is near the world edge:

- First call: `do_bunks(screenx, screeny)` - renders bunkers at their normal positions (Bunkers.c:46)
- Second call: `do_bunks(screenx-worldwidth, screeny)` - renders bunkers wrapped from the other side (Bunkers.c:48)
- This ensures bunkers appear seamlessly when the screen straddles the world boundary

**Firing Sound Wrap**: When a bunker fires, the game checks multiple positions to determine sound volume (Bunkers.c:181-189):

- The code loops through positions offset by `worldwidth` increments
- This ensures the firing sound plays at correct volume even if the bunker is "wrapped" relative to the screen
- Uses `SOFTBORDER` margin for distant sound effects

### Targeting Wrap Support

**Shortest Path Calculation**: The `aim_dir()` function handles wrapped targeting:

- Calculates raw distance between bunker and ship
- If distance is greater than half the world width, it subtracts/adds `worldwidth`
- This ensures bunkers always aim via the shortest path around the world
- Critical for following bunkers that track the player

**Shot Selection Wrap**: When determining which bunkers can fire:

- Creates two coordinate ranges: normal and "far" (wrapped) positions
- `farleft` and `farright` represent the wrapped screen boundaries
- Bunkers are eligible to fire if they're visible in either the normal OR wrapped position

### Edge Case Handling

**Split Bunker Rendering**: When a bunker sprite would be split by the world edge:

- The clipping code in both drawing functions handles partial rendering
- The double-call system ensures both "halves" of a split bunker are drawn
- No special code needed in the drawing functions themselves

**Coordinate System**:

- All bunker positions are stored in absolute world coordinates
- The wrap calculations happen at render/logic time, not storage time
- This simplifies bunker movement and collision detection

This wrapping system creates the illusion of a cylindrical world where bunkers seamlessly appear on both edges when the player is near the world boundary, and combat mechanics work correctly regardless of relative positions across the wrap boundary.

This architecture provides a flexible system supporting multiple bunker behaviors while maintaining performance on limited 68K Mac hardware.
