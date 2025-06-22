# Shot/Bullet Mechanics

This document describes how the shooting system works in Continuum, based on the original 68K Mac source code in `orig/Sources/Play.c`.

## Overview

The shooting system features:

- Maximum of 6 simultaneous player bullets
- Single shot per button press (no auto-fire)
- Bullets inherit ship velocity
- 35-frame maximum lifetime
- Wall bouncing with reflection physics
- Cannot shoot while shield is active

## Shooting Controls

### Input Handling (Play.c:529-556)

The `ship_control()` function manages shooting:

```c
if(pressed & KEY_SHOOT)
{   if(!firing)
    {   firing = TRUE;
        // ... shoot logic
    }
}
else
    firing = FALSE;
```

**Key Features:**

- `firing` flag prevents auto-fire - must release and press again
- Shield blocks shooting: `if(i<NUMBULLETS && !shielding)`

## Bullet Data Structure

Each bullet (`shotrec`) tracks:

- `x8, y8`: Position in 8x precision (sub-pixel accuracy)
- `x, y`: Position in pixels
- `h, v`: Velocity components
- `lifecount`: Frames until bullet expires
- `btime`: Bounce time tracking
- `strafedir`: Direction for wall strafing effects
- `hitline`: Reference to wall that was hit

## Bullet Initialization

When firing a new bullet (Play.c:535-551):

```c
int yrot = (shiprot + 24) & 31;
sp->h = shotvecs[shiprot] + (dx >> 5);    // Horizontal velocity
sp->v = shotvecs[yrot] + (dy >> 5);       // Vertical velocity
sp->x8 = (globalx << 3);                  // Position in 8x precision
sp->y8 = (globaly << 3);
sp->lifecount = SHOTLEN;                  // 35 frames lifetime
```

### Velocity Calculation

**Base Shot Velocity** (Play.c:38-41):

```c
int shotvecs[32]={0, 14, 27, 40, 51, 60, 67, 71,
                  72, 71, 67, 60, 51, 40, 27, 14,
                  0, -14, -27, -40, -51, -60, -67, -71,
                  -72, -71, -67, -60, -51, -40, -27, -14};
```

In the game's coordinate system:

- shotvecs[shiprot] gives V × cos(θ) for the ship's angle
- shotvecs[(shiprot + 24) & 31] shifts by 270° (which is -90° mod 360°)
- This gives V × cos(θ - 90°) = V × sin(θ)
- The `& 31` is because there are 32 rotation positions (0-31), this ensures the array
  index always stays in bounds when accessing shotvecs[yrot]. It's
  essentially a fast way to wrap around when rotating past position 31
  back to position 0.

General features:

- Maximum speed: 72 units (at 45° angles)
- Cardinal directions: varies from 0 (up/down) to 71 (left/right)
- **Inherits 1/32 of ship velocity** for realistic physics

### Initial Collision Check

After creation, bullets immediately check for walls:

```c
set_life(sp, NULL);
if (sp->lifecount > 0)
{
    sp->x8 += shotvecs[shiprot];  // Move one frame forward
    sp->y8 += shotvecs[yrot];
    sp->lifecount--;
}
if (sp->lifecount == 0)
    bounce_shot(sp);               // Hit wall on first frame
```

## Bullet Movement

The `move_shot()` function (Play.c:848-874) updates each bullet:

1. Decrements `lifecount`
2. Updates position: `x8 += h; y8 += v`
3. Handles world wrapping for toroidal worlds
4. Converts 8x precision to pixels: `x = x8 >> 3`
5. Expires bullet if it goes off top of world

### Fixed-Point Position System

The shot system uses fixed-point arithmetic for smooth sub-pixel movement:

**Position Storage:**

- `x8, y8`: High-precision position with 3 bits of fractional precision (1/8 pixel units)
- `x, y`: Integer pixel position for drawing and collision detection

**Initial Position Setup (Play.c:538-540):**

```c
sp->x8 = (globalx << 3);     // Convert ship position to 1/8 pixel units
sp->y8 = (globaly << 3);     // Multiply by 8 for sub-pixel precision
```

**Position Update (Play.c:855-873):**

```c
// Each frame in move_shot():
x = sp->x8;              // Get high-precision position
y = sp->y8;
x += sp->h;              // Add velocity (also in 1/8 pixel units)
y += sp->v;
// ... boundary/wrapping checks ...
sp->x8 = x;              // Store updated high-precision position
sp->y8 = y;
x >>= 3;                 // Convert to pixels (divide by 8)
y >>= 3;
sp->x = x;               // Store pixel position for drawing
sp->y = y;
```

**Benefits of This System:**

- Allows fractional pixel velocities (e.g., 5/8 pixel per frame)
- Creates smooth diagonal trajectories
- Prevents rounding errors from accumulating
- Maintains consistent physics at all angles

For example, with velocity `h = 5`, the shot moves exactly 5/8 (0.625) pixels per frame horizontally, providing much smoother motion than integer-only movement.

## Wall Bouncing System

### Collision Detection

The `lifecount` and `btime` variables work together to handle wall collisions:

**Normal Flight:**

- `lifecount`: Counts down from 35 to 0 (remaining lifetime in frames)
- `btime`: Set to 0 (no bounce pending)

**When `set_life()` is Called:**
This function (Terrain.c:114-230) calculates when the shot will hit a wall:

1. Checks all walls to find which one the shot will hit first
2. Calculates frames until impact for each potential collision
3. Sets `lifecount` to frames until the nearest wall hit
4. For bounce walls (L_BOUNCE type):
   ```c
   sp->lifecount = shortest;  // Frames until impact
   if (sp->hitline != NULL && sp->hitline->kind == L_BOUNCE)
       sp->btime = totallife - shortest;  // Preserve remaining lifetime
   else
       sp->btime = 0;
   ```

**Example Bounce Scenario:**

- Shot fired with `lifecount = 35`, `btime = 0`
- `set_life()` detects bounce wall 10 frames away
- Sets `lifecount = 10`, `btime = 25` (35 - 10)
- After 10 frames, `lifecount` reaches 0
- Since `btime > 0`, triggers bounce:
  - Velocity is reflected
  - `lifecount = btime` (restore 25 frames)
  - `btime = 0`
  - `set_life()` called again for next collision

This system allows precise collision timing and multiple bounces while preserving the total 35-frame lifetime.

### Bounce Physics (Play.c:926-948)

```c
bounce_shot(sp)
{
    // Calculate dot product with wall normal
    dot = sp->h * x1 + sp->v * y1;
    // Reflect velocity
    sp->h -= x1 * dot / (24*48);
    sp->v -= y1 * dot / (24*48);
    // Restore lifetime for continued flight
    sp->lifecount = sp->btime;
    sp->btime = 0;
}
```

**Bounce Features:**

- Backs up bullet to prevent wall sticking
- Calculates reflection using dot product with wall normal
- Allows multiple bounces until total lifetime expires
- Can trigger wall strafing visual effects

## Collision Handling

The `move_shipshots()` function (Play.c:750-814) checks collisions:

### Bunker Collisions

- Checks all bunkers within bullet's radius
- Validates hit angle for directional bunkers
- Hardy bunkers (DIFFBUNK type 2) require multiple hits
- Awards points and triggers explosion effects

### Self-Damage

```c
if (globalx > left && globalx < right &&
    globaly > top  && globaly < bot &&
    xyindist(sp->x - globalx, sp->y - globaly, SCENTER) &&
    !dead_count)
{
    shielding = TRUE;  // Auto-shield activation
    start_sound(SHLD_SOUND);
    sp->lifecount = sp->btime = 0;
}
```

Player's own bullets can hit their ship! This auto-activates shields if possible.

## Drawing

Bullets are drawn as simple 3x3 pixel squares when visible on screen.

## Constants

- `NUMBULLETS`: 6 (maximum player bullets)
- `SHOTLEN`: 35 (frames of bullet lifetime)
- `BRADIUS`: Collision radius for bunkers
- `SCENTER`: Collision radius for ship

## Design Rationale

1. **Limited Bullets**: Forces strategic shooting vs spray-and-pray
2. **Velocity Inheritance**: Creates realistic physics requiring lead calculation
3. **No Shield Shooting**: Prevents turtle strategy
4. **Wall Bouncing**: Enables trick shots and tactical play
5. **Friendly Fire**: Adds risk to careless shooting
6. **Fixed Range**: Prevents screen clutter and encourages close combat
