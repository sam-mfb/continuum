# Ship Movement Mechanics

This document describes how ship movement works in Continuum, based on the original 68K Mac source code in `orig/Sources/Play.c`.

## Overview

The ship movement system uses:

- Fixed-point velocity with 8-bit fractional precision
- Thrust vectors in 32 directions (11.25° increments)
- Point-based gravity system with inverse-square law
- Friction that gradually slows the ship
- Screen scrolling with soft boundaries

## Core Movement Loop

The movement system is updated every frame in `move_and_display()` (Play.c:192-265):

1. Read player input via `ship_control()` (Play.c:461-557)
2. Apply thrust, gravity, and friction to velocity
3. Move ship with `move_ship()` (Play.c:382-392)
4. Constrain ship position and scroll screen with `contain_ship()` (Play.c:394-457)

## Physics Components

### Thrust

When the thrust key is pressed (Play.c:481-492):

```c
if( (pressed & KEY_THRUST) && fuel)
{
    dx += (bouncing ? 1 : 2) * thrustx[shiprot];
    dy += (bouncing ? 1 : 2) * thrustx[(shiprot+24) & 31];
    // ... fuel burning and sound
}
```

**Thrust Vector Table** (Play.c:34-35):

```c
int thrustx[32]={0, 9, 18, 27, 34, 40, 44, 47, 48, 47, 44, 40, 34, 27, 18, 9,
                 0,-9,-18,-27,-34,-40,-44,-47,-48,-47,-44,-40,-34,-27,-18,-9};
```

- 32 directions = 11.25° per increment
- Maximum thrust = 48 units at cardinal directions
- Y-component uses same table offset by 24 positions (270°)
- **Thrust is halved when bouncing off walls** to prevent the ship from gaining too much velocity and clipping through walls

### Gravity

Gravity is applied every frame when not bouncing (Play.c:500-505):

```c
if (!bouncing)    /* to keep from running through bouncing walls */
{
    gravity_vector(globalx, globaly, &xgravity, &ygravity);
    dx += xgravity;
    dy += ygravity;    /* GRAVITY !!!!!!!!!! */
}
```

**Why gravity is disabled during bouncing:**

- Prevents ship from getting stuck against walls
- Avoids physics conflicts between bounce force and gravity
- Ensures clean separation from walls before gravity resumes
- Prevents wall clipping when gravity pulls toward the wall

**Gravity Calculation** (Play.c:585-636):

- Starts with global gravity values (`gravx`, `gravy`)
- Adds point gravity from each generator bunker
- Uses inverse-square law with 68K assembly optimization
- Formula: `force = strength / (distance²)`
- Handles world wrapping for gravity sources

### Friction

Applied every frame to gradually slow the ship (Play.c:496-498):

```c
dx -= (dx >> 6) + (dx > 0 ? 1 : 0);          // friction
dy -= (dy >> 6) + (dy > 0 && !cartooning ? 1 : 0);
```

- Divides velocity by 64 and adds 1 for guaranteed deceleration
- Ensures ship eventually stops without input
- Cartoon mode uses older friction model (no +1 on Y-axis)

### Velocity Application

Uses fixed-point math with 8-bit fractional part (Play.c:384-389):

```c
xslow += dx;            // Add velocity to accumulator
shipx += xslow >> 8;    // Extract whole pixels
xslow &= 255;           // Keep fractional part
yslow += dy;
shipy += yslow >> 8;
yslow &= 255;
```

This provides smooth sub-pixel movement at 1/256 pixel precision.

## Screen Scrolling System

The `contain_ship()` function (Play.c:394-457) implements a soft-boundary camera system:

### Horizontal Scrolling

```c
if (shipx < LEFTMARG)
{
    screenx += shipx - LEFTMARG;
    shipx = LEFTMARG;
}
else if (shipx > RIGHTMARG)
{
    screenx += shipx - RIGHTMARG;
    shipx = RIGHTMARG;
}
```

### Vertical Scrolling

```c
if (shipy < TOPMARG)
{
    screeny += shipy - TOPMARG;
    shipy = TOPMARG;
}
else if (shipy > BOTMARG)
{
    screeny += shipy - BOTMARG;
    shipy = BOTMARG;
}
```

### World Boundaries

**Non-wrapping worlds** (Play.c:405-412, 427-434):

- Screen stops at world edges
- Ship position adjusted to stay in bounds

**Wrapping worlds** (Play.c:414-417):

```c
if(screenx >= worldwidth)
    screenx -= worldwidth;
else if(screenx < 0)
    screenx += worldwidth;
```

### Edge Constraints

Ship cannot go within `SHIPHT` pixels of screen edge (Play.c:445-456):

- Velocity set to 0 when hitting boundaries
- Recursive call to `contain_ship()` to recalculate positions

## Coordinate Systems

The game uses three interconnected coordinate systems to handle smooth movement and scrolling:

### 1. Fractional Position Accumulators: `xslow`, `yslow`

These 8-bit values (0-255) accumulate sub-pixel movement for smooth physics:

```c
// From move_ship() (Play.c:384-389):
xslow += dx;            // Add velocity to accumulator
shipx += xslow >> 8;    // Extract whole pixels (divide by 256)
xslow &= 255;           // Keep only the fractional part
```

**Purpose**: Enables precise physics without floating-point math
**Example**: With `dx = 300`, ship moves 300/256 ≈ 1.17 pixels/frame

### 2. Screen Position: `shipx`, `shipy`

The ship's position on the visible screen (0 to screen dimensions):

```c
// From init_ship() (Play.c:175-176):
shipx = SCRWTH / 2;     // Start at center of screen
shipy = (TOPMARG + BOTMARG) / 2;
```

**Purpose**: Determines where to draw the ship
**Constraints**: Kept within screen margins by `contain_ship()`

### 3. World Position: `globalx`, `globaly`

The ship's absolute position in the game world:

```c
// From contain_ship() (Play.c:438-441):
globalx = screenx + shipx;
if (globalx > worldwidth)
    globalx -= worldwidth;    // Handle world wrapping
globaly = screeny + shipy;
```

**Purpose**: Used for physics calculations, collisions, and interactions
**Range**: 0 to world width/height (with wrapping on toroidal worlds)

### Position Update Flow

1. **Physics** (`ship_control`): Velocity (`dx`, `dy`) modified by forces
2. **Movement** (`move_ship`):
   - Velocity → `xslow`/`yslow` → `shipx`/`shipy`
   - Fractional parts preserved for next frame
3. **Camera** (`contain_ship`):
   - Adjust `screenx`/`screeny` if ship nears screen edge
   - Calculate `globalx`/`globaly` from screen + ship position

### Example: Sub-pixel Movement

With velocity `dx = 300` over 3 frames:

```
Frame 1: xslow = 0 + 300 = 300
         shipx += 300 >> 8 = 1  (move 1 pixel)
         xslow = 300 & 255 = 44  (keep remainder)

Frame 2: xslow = 44 + 300 = 344
         shipx += 344 >> 8 = 1  (move 1 pixel)
         xslow = 344 & 255 = 88  (keep remainder)

Frame 3: xslow = 88 + 300 = 388
         shipx += 388 >> 8 = 1  (move 1 pixel)
         xslow = 388 & 255 = 132 (keep remainder)
```

Result: Smooth 3.5 pixel movement over 3 frames instead of jerky 3 or 4 pixels.

## Position Variables Summary

- **`xslow, yslow`**: Fractional position accumulators (0-255)
- **`shipx, shipy`**: Ship position on screen (pixels)
- **`screenx, screeny`**: Top-left corner of viewport in world coordinates
- **`globalx, globaly`**: Ship's absolute position in world
- **`dx, dy`**: Velocity components (×256 for fixed-point)

## Constants and Margins

From `GW.h` (referenced in Play.c):

- `SCRWTH`: 512 pixels (screen width)
- `VIEWHT`: 318 pixels (gameplay area height)
- `SHIPHT`: Ship sprite height
- `LEFTMARG`, `RIGHTMARG`, `TOPMARG`, `BOTMARG`: Scrolling boundaries

## Input Handling

The `ship_control()` function (Play.c:461-557) reads keyboard input:

- **Left/Right arrows**: Rotate ship (Play.c:475-478)
- **Thrust key**: Apply forward acceleration (Play.c:481-492)
- **Shield key**: Activate shield and collect fuel (Play.c:507-527)
- **Fire key**: Shoot projectiles (Play.c:529-556)

Uses `GetKeys()` Mac Toolbox call to read keyboard state (Play.c:672).

## Wall Bouncing System

The game implements a sophisticated wall bouncing system to handle ship-wall collisions:

### Bounce Detection (Play.c:270-287)

The `check_for_bounce()` function:

1. Checks if ship overlaps with bounce-type walls (L_BOUNCE)
2. If collision detected, calls `bounce_ship()` and sets `bouncing = TRUE`
3. If no collision, updates `unbouncex/unbouncey` as last safe position

### Bounce Physics (Play.c:291-328)

The `bounce_ship()` function implements reflection physics:

```c
static int bounce_vecs[] =
{0, 18, 34, 44, 48, 44, 34, 18, 0, -18, -34, -44, -48, -44, -34, -18, 0};
```

**Bounce Algorithm:**

1. Finds closest bounce wall using `pt2line()` distance calculation
2. Determines wall normal direction using `getstrafedir()`
3. Calculates dot product of velocity with wall normal
4. Applies reflection force if velocity toward wall is below threshold
5. Uses formula: `kick = (normal * dot) / constant`

**Key Features:**

- Only applies bounce if ship is moving slowly toward wall (prevents getting stuck)
- Minimum bounce force of 10\*256 units ensures clean separation
- Bounce direction points toward last safe position (`unbouncex/unbouncey`)

### Interactions with Other Systems

**During bouncing:**

- Thrust is reduced to half strength (Play.c:482-483)
- Gravity is completely disabled (Play.c:500-505)
- Ship still takes damage from collisions
- Player maintains control of rotation and firing

This system ensures smooth, predictable wall interactions while preventing common physics glitches like wall clipping or getting stuck in geometry.
