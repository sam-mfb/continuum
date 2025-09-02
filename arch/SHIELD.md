# Shield System Architecture

## Overview

The shield system in Continuum provides temporary invulnerability through a fuel-powered energy field that destroys incoming bullets before they can reach the ship. The shield is manually activated only - there is no automatic shielding mechanism in the game.

## Core Shield State

### State Variables (Play.c)
- `shielding` (Play.c:71) - Boolean flag indicating active shield status
- `fuel` - Global fuel counter that must be > 0 for shield activation
- `refueling` (Play.c:72) - Set to FALSE when shield activates, preventing simultaneous refueling

## Activation Mechanisms

### Primary Activation - Manual Control
The shield activates when KEY_SHIELD is pressed AND fuel is available (Play.c:507-527):

1. **Input Check** - `move_ship()` checks if KEY_SHIELD is pressed and fuel > 0 (Play.c:507)
2. **State Update** - Sets `shielding = TRUE` (Play.c:508)
3. **Sound Trigger** - Calls `start_sound(SHLD_SOUND)` (Play.c:509)
4. **Fuel Deduction** - Calls `fuel_minus(FUELSHIELD)` where FUELSHIELD = 83 units/frame (Play.c:510, GW.h:139)
5. **Refueling Block** - Sets `refueling = FALSE` to prevent simultaneous fuel collection at depots (Play.c:511)
6. **Fuel Cell Collection** - Immediately collects any fuel cells within FRADIUS (Play.c:512-524)

### Secondary Activation - Self-Hit Feedback
When ship's own bullet enters shield radius (Play.c:787-794):

1. **Collision Check** in `move_shipshots()` detects own bullet within SHRADIUS (Play.c:787-789)
2. **Shield Activation** - Sets `shielding = TRUE` (Play.c:790)
3. **Sound Trigger** - Calls `start_sound(SHLD_SOUND)` (Play.c:791)
4. **Bullet Destruction** - Sets bullet `lifecount = 0` and `btime = 0` (Play.c:792)

Note: This secondary activation doesn't check fuel and appears to be a one-frame effect since the main shield logic (Play.c:507-527) will immediately deactivate it if KEY_SHIELD isn't pressed or fuel is empty.

## Deactivation

Shield deactivates when (Play.c:526-527):
- KEY_SHIELD is released, OR
- Fuel reaches 0

Sets `shielding = FALSE` immediately with no fade-out period.

## Protection Mechanism

### Enemy Bullet Destruction (Play.c:816-846)

The `move_bullets()` function handles enemy bullet collision with shield:

1. **Bounding Box Check** - First checks if bullet is within rectangular region around ship (Play.c:830-831)
   - Left boundary: `globalx - SCENTER`
   - Right boundary: `globalx + SCENTER`
   - Top boundary: `globaly - SCENTER`
   - Bottom boundary: `globaly + SCENTER`

2. **Proximity Check** - Calls `xyindistance()` with SHRADIUS (12 pixels) (Play.c:832-833, GW.h:77)

3. **Bullet Destruction** - If within shield radius (Play.c:835-837):
   - Sets `lifecount = 0` (terminates bullet)
   - Sets `btime = 0` (cancels any bounce timer)
   - Sets `strafedir = -1` (cancels strafing behavior)
   - Uses `continue` to skip drawing the bullet

### Protection Radius
- SHRADIUS = 12 pixels from ship center (GW.h:77)
- Creates circular protection zone
- Uses mathematical distance calculation, not pixel collision

## Integration with Game Flow

### Drawing Order Impact (Play.c:219-256)

The shield system leverages specific drawing order for correct behavior:

1. **Pre-Shield Phase** (Play.c:219-237)
   - Terrain, bunkers, and most objects drawn
   - If NOT shielding, `move_bullets()` called here (Play.c:238-239)
   - Bullets get drawn to screen buffer

2. **Ship Rendering** (Play.c:241-251)
   - Ship collision check via `check_figure()` (Play.c:244)
   - Ship drawing with `full_figure()` (Play.c:248-249)

3. **Shield Phase** (Play.c:252-255)
   - If shielding active:
     - `move_bullets()` called AFTER ship drawn (Play.c:253)
     - Bullets within SHRADIUS destroyed before drawing
     - `erase_figure()` with `shield_def` creates white shield outline (Play.c:254)

This order ensures destroyed bullets never appear on screen and can't trigger pixel collision.

### Fuel Cell Collection Side Effect (Play.c:512-524)

When shield activates, immediately checks all fuel cells:

1. **Iteration** - Loops through `fuels` array until `x < 10000` sentinel (Play.c:512)
2. **Distance Check** - Calls `xyindist()` with FRADIUS for each alive fuel (Play.c:516)
3. **Collection** - For cells within radius:
   - Sets `alive = FALSE` (Play.c:518)
   - Sets `currentfig = FUELFRAMES` to trigger explosion animation (Play.c:519)
   - Adds FUELGAIN via `fuel_minus(-FUELGAIN)` kludge (Play.c:520)
   - Adds SCOREFUEL to score via `score_plus()` (Play.c:521)
   - Triggers FUEL_SOUND (Play.c:522)

### Firing Restriction (Play.c:529-556)

Shield blocks bullet firing (Play.c:534):
- `move_ship()` checks `!shielding` before creating new bullet
- Prevents ship from firing while shield active
- No stored charge or delayed fire when shield drops

## Visual Rendering

### Shield Appearance (Play.c:254, Draw.c)

The shield visual effect uses `erase_figure()` with `shield_def` sprite:

1. **Sprite Data** - `shield_def[SHIPHT*2]` defined in Figs.c:71, loaded from SHLD resource (Figs.c:559)
2. **Drawing Method** - `erase_figure()` inverts sprite bits and ANDs with screen
3. **Effect** - Creates white outline by clearing pixels in shield shape
4. **Timing** - Applied after all other drawing, creating overlay effect

## Resource Consumption

### Fuel Economics
- FUELSHIELD = 83 units per frame (GW.h:139)
- FUELGAIN = 2000 units per fuel cell collected (assumed from game balance)
- MAXFUEL = fuel capacity limit (prevents overflow)
- Net effect: Shield burns fuel rapidly but can gain fuel through collection

### Performance Characteristics
- No gradual power-up or power-down
- Instant on/off switching
- No cooldown period
- No minimum activation time
- Can rapidly toggle on/off (flicker shield)

## Death and Reset

When ship dies via `kill_ship()` (Play.c:334-369):
- Sets `shielding = FALSE` along with other state flags (Play.c:337)
- Ensures clean state for respawn

## Design Insights

### Why Manual-Only Activation
- Creates risk/reward decision for players
- Fuel management becomes strategic resource
- Prevents passive play style
- Rewards skilled dodging over shield reliance

### Why No Pixel Collision
- Mathematical collision is precise and predictable
- Avoids edge cases with fast-moving bullets
- Consistent circular protection zone
- Better performance than pixel checking every bullet every frame

### Why Firing Restriction
- Prevents invulnerable attack strategy
- Forces choice between offense and defense
- Maintains game balance
- Creates interesting tactical decisions

## Key Constants

- SHRADIUS: 12 pixels - Shield protection radius (GW.h:77)
- FUELSHIELD: 83 units/frame - Fuel consumption rate (GW.h:139)
- FRADIUS: Fuel cell collection radius when shield active
- SCENTER: 16 pixels - Half of ship width, used for boundary calculations