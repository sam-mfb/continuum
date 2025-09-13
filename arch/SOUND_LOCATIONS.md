# Sound Locations in Original Continuum

This document identifies all locations where sounds are played in the original Continuum game code.

## Sound Types Defined (GW.h:151-153)

```c
enum {NO_SOUND = 0, FIRE_SOUND, EXP1_SOUND, THRU_SOUND, BUNK_SOUND,
    SOFT_SOUND, SHLD_SOUND, FUEL_SOUND,
    EXP2_SOUND, EXP3_SOUND, CRACK_SOUND, FIZZ_SOUND, ECHO_SOUND};
```

## Sound Playback Locations

### 1. FIRE_SOUND - Shot Firing
**Location:** Play.c:551
**Context:** When player fires a shot
```c
// In keyboard handler, when KEY_SHOOT is pressed and shot is created
if(pressed & KEY_SHOOT) {
    // ... create shot ...
    start_sound(FIRE_SOUND);
}
```

### 2. EXP1_SOUND - Bunker Explosion
**Location:** Play.c:368
**Context:** When a bunker is destroyed in `kill_bunk()`
```c
void kill_bunk(bp) {
    // ... explosion setup ...
    start_explosion(bp->x, bp->y, bp->rot, bp->kind);
    start_sound(EXP1_SOUND);
    // ... check mission complete ...
}
```

### 3. THRU_SOUND - Thrust Engine
**Location:** Play.c:491
**Context:** When player holds thrust key and has fuel
```c
if( (pressed & KEY_THRUST) && fuel) {
    dx += (bouncing ? 1 : 2) * thrustx[shiprot];
    dy += (bouncing ? 1 : 2) * thrustx[(shiprot+24) & 31];
    // ... thrust animation ...
    thrusting = TRUE;
    fuel_minus(FUELBURN);
    start_sound(THRU_SOUND);
}
```
**Note:** Sound stops automatically when `thrusting = FALSE` (Sound.c:204-205)

### 4. BUNK_SOUND - Bunker Firing (On-Screen)
**Location:** Bunkers.c:185
**Context:** When a bunker fires a shot that's visible on screen
```c
void bunker_shoot(bp, sp) {
    // ... create bunker shot ...
    for (bunkx = bp->x; bunkx < worldwidth << 1; bunkx += worldwidth) {
        if (bunkx > screenx && bunkx < screenr && 
            bp->y > screeny && bp->y < screenb)
            start_sound(BUNK_SOUND);  // Bunker visible on screen
        else if (bunkx > screenx-SOFTBORDER && bunkx < screenr+SOFTBORDER &&
                 bp->y > screeny-SOFTBORDER && bp->y < screenb+SOFTBORDER)
            start_sound(SOFT_SOUND);  // Bunker near screen edge
    }
}
```

### 5. SOFT_SOUND - Bunker Firing (Off-Screen but Nearby)
**Location:** Bunkers.c:188
**Context:** When a bunker fires a shot from just outside the visible screen area
```c
// Same function as BUNK_SOUND, but for bunkers within SOFTBORDER pixels of screen edge
else if (bunkx > screenx-SOFTBORDER && bunkx < screenr+SOFTBORDER &&
         bp->y > screeny-SOFTBORDER && bp->y < screenb+SOFTBORDER)
    start_sound(SOFT_SOUND);
```

### 6. SHLD_SOUND - Shield Active
**Location:** Play.c:509 and Play.c:791
**Context:** Two situations trigger shield sound:

#### 6a. Player Activates Shield (Play.c:509)
```c
if ( (pressed & KEY_SHIELD) && fuel) {
    shielding = TRUE;
    start_sound(SHLD_SOUND);
    fuel_minus(FUELSHIELD);
    // ... fuel collection logic ...
}
```
**Note:** Sound stops automatically when `shielding = FALSE` (Sound.c:244-245)

#### 6b. Self-Hit Shield Feedback (Play.c:791)
```c
// When player's shot hits themselves
if (globalx > left && globalx < right &&
    globaly > top  && globaly < bot && 
    xyindist(sp->x - globalx, sp->y - globaly, SCENTER) &&
    !dead_count) {
    shielding = TRUE;
    start_sound(SHLD_SOUND);
    sp->lifecount = sp->btime = 0;  // Destroy the shot
}
```

### 7. FUEL_SOUND - Fuel Collection
**Location:** Play.c:522
**Context:** When player collects fuel while shielding
```c
if ( (pressed & KEY_SHIELD) && fuel) {
    shielding = TRUE;
    // ... check each fuel cell ...
    if (fp->alive && xyindist(xdif, ydif, FRADIUS)) {
        fp->alive = FALSE;
        fp->currentfig = FUELFRAMES;
        fuel_minus(-FUELGAIN);  // Add fuel
        score_plus(SCOREFUEL);
        start_sound(FUEL_SOUND);
    }
}
```

### 8. EXP2_SOUND - Ship Death Explosion
**Location:** Terrain.c:414
**Context:** When the ship is destroyed in `start_death()`
```c
start_death() {
    set_screen(front_screen, 0L);  // Flash effect
    start_sound(EXP2_SOUND);
    start_blowup((shipx + screenx) % worldwidth, shipy + screeny,
                 SHIPSPARKS, 16, SH_SP_SPEED16,
                 SH_SPARKLIFE, SH_SPADDLIFE);
}
```

### 9. EXP3_SOUND - (Defined but Not Used)
**Note:** EXP3_SOUND is defined in the sound system but no code calls it

### 10. CRACK_SOUND - (Defined but Not Used)  
**Note:** CRACK_SOUND is defined in the sound system but no code calls it

### 11. FIZZ_SOUND - Level Transition Effect Start
**Location:** Play.c:1248
**Context:** When transitioning between levels in `next_level()`
```c
next_level() {
    // ... setup ...
    star_background();
    start_sound(FIZZ_SOUND);
    fizz(back_screen, front_screen);  // Visual transition effect
    start_sound(ECHO_SOUND);
    Delay(150L, &dummylong);
}
```

### 12. ECHO_SOUND - Level Transition Effect End
**Location:** Play.c:1250
**Context:** Immediately after fizz effect completes
```c
// Same function as FIZZ_SOUND
start_sound(FIZZ_SOUND);
fizz(back_screen, front_screen);
start_sound(ECHO_SOUND);  // Plays after fizz completes
```

## Sound Management Notes

1. **Continuous Sounds:** THRU_SOUND and SHLD_SOUND are continuous and stop when their corresponding state flags (`thrusting`, `shielding`) become false.

2. **Priority System:** The original sound system appears to use a priority system where certain sounds (like EXP2_SOUND) cannot be interrupted by other sounds (Sound.c:173).

3. **Distance-Based Sounds:** BUNK_SOUND and SOFT_SOUND demonstrate distance-based sound triggering, where sounds play differently based on proximity to the screen.

4. **One-Shot Sounds:** Most sounds (FIRE_SOUND, EXP1_SOUND, FUEL_SOUND, etc.) are one-shot effects that play once and complete.

5. **Special Effects:** FIZZ_SOUND and ECHO_SOUND work together as a pair for the level transition effect.