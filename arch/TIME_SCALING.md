# Time Scaling for Frame-Independent Physics

This document describes how to adapt Continuum's frame-locked physics for variable framerates while preserving the original game feel.

## Background

The original Continuum runs at a fixed 20 FPS (50ms per frame). All physics calculations assume this constant frame time, with values tuned specifically for this rate. The game enforces this timing through `wait_for_VR()` which waits for 3 ticks of the 60Hz Mac system timer.

## Frame-Locked Components in Play.c

### 1. Ship Thrust (lines 481-483)
```c
dx += (bouncing ? 1 : 2) * thrustx[shiprot];
dy += (bouncing ? 1 : 2) * thrustx[(shiprot+24) & 31];
```
- Adds velocity based on thrust lookup table
- Values represent velocity change per frame (per 50ms)

### 2. Friction (lines 496-497)
```c
dx -= (dx >> 6) + (dx > 0 ? 1 : 0);
dy -= (dy >> 6) + (dy > 0 && !cartooning ? 1 : 0);
```
- Reduces velocity by 1/64th plus 1 each frame
- Ensures ship eventually stops

### 3. Gravity (lines 502-504)
```c
gravity_vector(globalx, globaly, &xgravity, &ygravity);
dx += xgravity;
dy += ygravity;
```
- Adds gravity force to velocity each frame
- Gravity strength tuned for 20 FPS

### 4. Projectile Movement (lines 858-859)
```c
x += sp->h;  // h,v are velocity components
y += sp->v;
```
- Shot position updated by velocity each frame
- Initial velocities from `shotvecs[]` table (lines 38-41)

### 5. Timer-Based Events

#### Planet Bonus Countdown (lines 197-201)
```c
if (!--bonuscount)  // Decrements every frame
{
    planetbonus -= 10;
    bonuscount = 10;  // Reset to 10 frames
}
```
- Reduces bonus by 10 points every 10 frames (500ms)

#### Mission Complete Delay (lines 194-195)
```c
if (missioncomplete && !--micocycles)
    endofplanet = TRUE;
```
- `MICODELAY` countdown in frames before level ends

#### Death Timer (lines 203-211)
```c
if (dead_count && !--dead_count)
    // Respawn logic
```
- `DEAD_TIME` countdown for respawn delay

#### Fuel Burn Rate (line 490)
```c
fuel_minus(FUELBURN);
```
- Deducts fuel each frame while thrusting

#### Animation Frame Counters
- Bunker rotation: `b->rotcount` (line 143)
- Fuel depot animation: `f->figcount` (line 152)
- Flame blinking: `flame_blink` (lines 485-488)

## Scaling Formula

To maintain game balance at different framerates:

```
timeScale = actualDeltaTime / ORIGINAL_FRAME_TIME

Where:
- ORIGINAL_FRAME_TIME = 50ms (1/20 second)
- actualDeltaTime = time since last frame in ms
```

## Implementation Strategy

### Physics Values
Apply timeScale to all per-frame physics changes:

```c
// Thrust
dx += thrustx[shiprot] * (bouncing ? 1 : 2) * timeScale;

// Friction (more complex due to integer math)
dx -= ((dx >> 6) + (dx > 0 ? 1 : 0)) * timeScale;

// Gravity
dx += xgravity * timeScale;

// Projectile movement
x += sp->h * timeScale;
```

### Timer Values
Convert frame counters to time-based:

```c
// Instead of: if (!--bonuscount)
bonusTimeRemaining -= actualDeltaTime;
if (bonusTimeRemaining <= 0) {
    planetbonus -= 10;
    bonusTimeRemaining = 500; // 500ms
}
```

### Integer Precision
The original uses fixed-point math with 8-bit fractional precision (>> 8). When scaling:
- Maintain sufficient precision for sub-pixel movement
- Consider using floating point or higher precision fixed-point
- Ensure rounding doesn't accumulate errors

## Key Considerations

1. **Lookup Tables**: The `thrustx[]` and `shotvecs[]` arrays should remain unchanged - they define relative magnitudes, not absolute per-frame values.

2. **Animation Timing**: Visual effects (flame blink, sprite rotation) should use actual time, not frame counts.

3. **Input Polling**: The original polls input once per frame. At higher framerates, consider whether to maintain this behavior or allow more responsive input.

4. **Collision Detection**: Frame-independent physics may require interpolated collision checks to prevent objects passing through each other at high velocities.

5. **Network Play**: If implementing multiplayer, all clients must use consistent time scaling to maintain synchronization.

## Testing

When implementing time scaling:
1. Test at various framerates (10, 20, 40, 60 FPS)
2. Verify ship acceleration feels identical
3. Check that timed events occur at correct intervals
4. Ensure projectiles travel same distance regardless of framerate
5. Confirm friction brings ship to stop in same time

The goal is for the game to feel identical to the original 20 FPS experience, regardless of the actual rendering framerate.