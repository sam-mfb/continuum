# Sound Integration Plan

This document outlines the plan for integrating the sound service into the Continuum game using Redux for state management.

## Overview

The sound system will use a Redux slice to accumulate sound events during each game loop frame, then play all sounds at once at the end of the frame. This ensures proper timing and separation of concerns between game logic and sound playback.

## Architecture

### A. Sound Service Initialization

**Location:** `src/main.tsx` or app initialization
- Initialize the sound service on app load
- Preload all sound assets
- Set up the audio context
- Make service available via a singleton pattern

### B. Redux Sound Slice Structure

**File:** `src/core/sound/soundSlice.ts`

```typescript
type SoundState = {
  // Discrete sounds to play this frame (play once and stop)
  discrete: Set<SoundType>
  
  // Continuous sounds state (loop until stopped)
  continuous: {
    thrusting: boolean
    shielding: boolean
  }
  
  // Track what was playing last frame (for stop detection)
  lastContinuous: {
    thrusting: boolean
    shielding: boolean
  }
}
```

**Sound Types:**
- **Discrete sounds:** FIRE_SOUND, EXP1_SOUND, EXP2_SOUND, BUNK_SOUND, SOFT_SOUND, FUEL_SOUND, FIZZ_SOUND, ECHO_SOUND
- **Continuous sounds:** THRU_SOUND (via thrusting flag), SHLD_SOUND (via shielding flag)

### C. Redux Integration Points

**IMPORTANT:** Reducers cannot dispatch actions. All sound triggers must be dispatched from the game loop or thunk actions, not from within reducers.

#### 1. Ship Sounds - Triggered in `shipControl.ts` (Thunk Action)

The `shipControl` thunk action already handles ship input and can dispatch sound actions:

| Location | Condition | Sound Trigger | Original Code Reference |
|----------|-----------|---------------|-------------------------|
| After `initShipshot` | When FIRE key pressed and shot created | `dispatch(soundSlice.actions.playDiscrete('FIRE_SOUND'))` | Play.c:551 `start_sound(FIRE_SOUND)` |
| After `shipControlMovement` | When THRUST key pressed and fuel > 0 | `dispatch(soundSlice.actions.setThrusting(true))` | Play.c:491 `start_sound(THRU_SOUND)` |
| After `shipControlMovement` | When THRUST key released or fuel = 0 | `dispatch(soundSlice.actions.setThrusting(false))` | Sound.c:204-205 stops when `!thrusting` |
| After `shieldActivate` | When SHIELD key pressed and fuel > 0 | `dispatch(soundSlice.actions.setShielding(true))` | Play.c:509 `start_sound(SHLD_SOUND)` |
| After `shieldDeactivate` | When SHIELD key released or fuel = 0 | `dispatch(soundSlice.actions.setShielding(false))` | Sound.c:244-245 stops when `!shielding` |
| After `collectFuelCells` | When fuel cells collected (shield active) | `dispatch(soundSlice.actions.playDiscrete('FUEL_SOUND'))` | Play.c:522 `start_sound(FUEL_SOUND)` |

#### 2. Ship Death - Triggered in `gameLoop.ts`

| Location in gameLoop | Condition | Sound Trigger | Original Code Reference |
|---------------------|-----------|---------------|-------------------------|
| Line ~963 after `killShip()` | When ship collides with wall/bunker | `dispatch(soundSlice.actions.playDiscrete('EXP2_SOUND'))` | Terrain.c:414 `start_sound(EXP2_SOUND)` in `start_death()` |
| Line ~790 (self-hit detection) | When ship hit by own shot | Shield activates momentarily, play discrete sound | Play.c:791 `start_sound(SHLD_SOUND)` - **Note:** This is a discrete sound, not continuous |

#### 3. Bunker Sounds - Need Detection in `gameLoop.ts`

Bunker sounds require position checks relative to screen:

##### 3a. Bunker Destroyed Sound
| Location in gameLoop | Condition | Sound Trigger | Original Code Reference |
|---------------------|-----------|---------------|-------------------------|
| Line ~402 after `killBunker()` | When bunker destroyed (check `!updatedBunker.alive`) | `dispatch(soundSlice.actions.playDiscrete('EXP1_SOUND'))` | Play.c:368 `start_sound(EXP1_SOUND)` in `kill_bunk()` |
| Line ~1000 after `killBunker()` | When bunker destroyed by ship death blast | `dispatch(soundSlice.actions.playDiscrete('EXP1_SOUND'))` | Play.c:368 same as above |

##### 3b. Bunker Firing Sounds
Bunker firing happens in `bunkShoot.ts` but we need to detect it in the game loop.

**Solution:** Modify `bunkShoot` to return proximity indicator:
```typescript
// In bunkShoot, calculate bunker's proximity to screen:
type BunkerProximity = 'visible' | 'nearby' | 'distant'

function calculateBunkerProximity(bunker, screenx, screeny, screenr, screenb): BunkerProximity {
  // Check if bunker is visible on screen
  if (bunker.x > screenx && bunker.x < screenr && 
      bunker.y > screeny && bunker.y < screenb) {
    return 'visible'
  }
  // Check if bunker is within SOFTBORDER of screen
  if (bunker.x > screenx - SOFTBORDER && bunker.x < screenr + SOFTBORDER &&
      bunker.y > screeny - SOFTBORDER && bunker.y < screenb + SOFTBORDER) {
    return 'nearby'
  }
  return 'distant'
}

// Store proximity in shot state or return it
```

Then in gameLoop after bunker shooting logic:
```typescript
// After bunker shoots (get proximity from shot or return value)
if (bunkerProximity === 'visible') {
  dispatch(soundSlice.actions.playDiscrete('BUNK_SOUND'))
} else if (bunkerProximity === 'nearby') {
  dispatch(soundSlice.actions.playDiscrete('SOFT_SOUND'))
}
// 'distant' bunkers make no sound
```

This keeps the sound-specific logic in the sound handling code, while the game state only tracks proximity/distance information.

#### 4. Level Transition Sounds - Triggered in `gameLoop.ts`

The fizz effect is managed by transition state in gameLoop:

| Location in gameLoop | Condition | Sound Trigger | Original Code Reference |
|---------------------|-----------|---------------|-------------------------|
| Line ~541 | When `activateFizz(bitmap, fizz)` called | `dispatch(soundSlice.actions.playDiscrete('FIZZ_SOUND'))` | Play.c:1248 `start_sound(FIZZ_SOUND)` in `next_level()` |
| Line ~556 | When fizz completes (`fizz.active` becomes false) | `dispatch(soundSlice.actions.playDiscrete('ECHO_SOUND'))` | Play.c:1250 `start_sound(ECHO_SOUND)` after fizz |


### D. Game Loop Integration Pattern

**File:** `src/game/gameLoop.ts`

```typescript
export function gameLoop(store: Store) {
  // 1. Reset sound accumulator for new frame
  store.dispatch(soundSlice.actions.resetFrame())
  
  // 2. Run all game logic
  // ... physics updates ...
  // ... collision detection ...
  // ... state updates ...
  // (These may dispatch sound actions)
  
  // 3. Render the frame
  // ... rendering code ...
  
  // 4. Play all accumulated sounds for this frame
  const soundState = store.getState().sound
  playSounds(soundState)
}
```

### E. Sound Playback Function

**File:** `src/core/sound/soundPlayer.ts`

```typescript
// Identify which sounds are high-priority and cannot be interrupted
const HIGH_PRIORITY_SOUNDS = new Set(['EXP2_SOUND'])

function playSounds(soundState: SoundState) {
  const soundService = getSoundService()
  
  // Play discrete sounds - just pass them all to the service
  // The service will internally drop sounds if a high-priority sound is playing
  const discreteSounds = Array.from(soundState.discrete)
  
  for (const sound of discreteSounds) {
    const isHighPriority = HIGH_PRIORITY_SOUNDS.has(sound)
    
    // Pass high priority flag to sound service
    // Service will handle blocking logic internally
    soundService.playSound(sound, { highPriority: isHighPriority })
  }
  
  // Handle continuous sound transitions
  // These also just get sent - service will drop them if high-priority is playing
  
  // Thrust sound
  if (soundState.continuous.thrusting && !soundState.lastContinuous.thrusting) {
    soundService.startThrust()
  } else if (!soundState.continuous.thrusting && soundState.lastContinuous.thrusting) {
    soundService.stopThrust()
  }
  
  // Shield sound
  if (soundState.continuous.shielding && !soundState.lastContinuous.shielding) {
    soundService.startShield()
  } else if (!soundState.continuous.shielding && soundState.lastContinuous.shielding) {
    soundService.stopShield()
  }
}
```

### Sound Service Interface Update

The sound service needs to be modified to support high-priority sounds:

```typescript
interface SoundService {
  // Modified playSound to accept optional high-priority flag
  playSound(sound: SoundType, options?: { highPriority?: boolean }): void
  
  // Existing continuous sound methods
  startThrust(): void
  stopThrust(): void
  startShield(): void
  stopShield(): void
}
```

The sound service implementation will internally:
1. Track when a high-priority sound is playing
2. Silently drop all incoming sound requests while high-priority is active
3. Clear the high-priority flag when the sound completes (via audio event listeners)
4. Resume normal sound playback automatically

### F. Sound Slice Actions

**Required actions in `soundSlice.ts`:**

1. **`resetFrame`**: Clear discrete sounds, copy continuous to lastContinuous
2. **`playDiscrete`**: Add a sound to the discrete Set
3. **`setThrusting`**: Update continuous.thrusting flag
4. **`setShielding`**: Update continuous.shielding flag

## Implementation Steps

### Phase 1: Foundation
1. Create `soundSlice.ts` with state structure and actions
2. Add sound slice to the Redux store
3. Create `soundPlayer.ts` with playback logic
4. Add frame reset and playback calls to game loop

### Phase 2: Ship Sounds
1. Integrate firing sound (FIRE_SOUND)
2. Integrate thrust sound (THRU_SOUND - continuous)
3. Integrate shield sound (SHLD_SOUND - continuous)
4. Integrate fuel collection sound (FUEL_SOUND)

### Phase 3: Combat Sounds
1. Integrate bunker explosion (EXP1_SOUND)
2. Integrate ship explosion (EXP2_SOUND)
3. Integrate bunker firing sounds (BUNK_SOUND, SOFT_SOUND)
   - Calculate distance from screen center
   - Choose appropriate sound based on visibility

### Phase 4: Transition Sounds
1. Integrate fizz start sound (FIZZ_SOUND)
2. Integrate fizz end sound (ECHO_SOUND)

### Phase 5: Testing & Polish
1. Test each sound individually
2. Test sound overlapping scenarios
3. Verify continuous sound start/stop behavior
4. Performance optimization if needed

## Special Considerations

### Distance-Based Bunker Sounds
Bunker firing sounds depend on the bunker's position relative to the screen:
- **On-screen:** Play BUNK_SOUND
- **Off-screen but within SOFTBORDER:** Play SOFT_SOUND
- **Far off-screen:** No sound

### Continuous Sound Management
- Thrust and shield sounds loop continuously while active
- Must track previous frame state to detect start/stop transitions
- Only send start/stop commands on state changes

### Sound Priority
The original game had a priority system where certain sounds (like EXP2_SOUND) couldn't be interrupted. This is handled entirely within the sound service:
- EXP2_SOUND (ship death) is marked as high-priority when played
- The sound service internally tracks when a high-priority sound is playing
- All other sound requests are silently dropped while high-priority is active
- The game code doesn't need to check - it just sends sounds normally
- High-priority flag is automatically cleared when the sound finishes (via audio event listeners)
- This matches the original game behavior where sounds weren't queued

## Implementation Steps

### Phase 1: Sound Service Update & Testing UI
1. Update sound service to support high-priority flag:
   - Modify `playSound` method signature to accept `options?: { highPriority?: boolean }`
   - Track high-priority state internally
   - Drop incoming sounds while high-priority is playing
   - Use audio event listeners to clear flag when sound completes

2. Update existing SoundTestPanel (`src/dev/components/SoundTestPanel.tsx`):
   - Add checkbox for "High Priority" mode
   - When checked, pass `{ highPriority: true }` to sound service
   - Add visual indicator showing when high-priority sound is blocking
   - Test that Ship Explosion (ASM) blocks other sounds when played as high-priority

### Phase 2: Redux Foundation
1. Create `soundSlice.ts` with state structure and actions
2. Add sound slice to the Redux store
3. Create `soundPlayer.ts` with playback logic
4. Add frame reset and playback calls to game loop

### Phase 3: Ship Sounds
1. Integrate firing sound (FIRE_SOUND) - Play.c:551
2. Integrate thrust sound (THRU_SOUND - continuous) - Play.c:491
3. Integrate shield sound (SHLD_SOUND - continuous) - Play.c:509
4. Integrate shield feedback sound (SHLD_SOUND - discrete for self-hit) - Play.c:791
5. Integrate fuel collection sound (FUEL_SOUND) - Play.c:522

### Phase 4: Combat Sounds
1. Integrate bunker explosion (EXP1_SOUND) - Play.c:368
2. Integrate ship explosion (EXP2_SOUND - high priority) - Terrain.c:414
3. Integrate bunker firing sounds:
   - Add proximity calculation to bunkShoot
   - BUNK_SOUND for visible bunkers - Bunkers.c:185
   - SOFT_SOUND for nearby bunkers - Bunkers.c:188

### Phase 5: Transition Sounds
1. Integrate fizz start sound (FIZZ_SOUND) - Play.c:1248
2. Integrate fizz end sound (ECHO_SOUND) - Play.c:1250

### Phase 6: Testing & Polish
1. Test each sound individually
2. Test high-priority blocking (EXP2_SOUND blocks others)
3. Verify continuous sound start/stop behavior
4. Test sound proximity logic for bunker sounds
5. Performance optimization if needed

## Benefits of This Approach

1. **Clean separation:** Game logic doesn't directly call sound APIs
2. **Frame-perfect timing:** All sounds play at the correct moment in the render cycle
3. **Testable:** Sound state can be tested independently of audio playback
4. **Debuggable:** Can inspect Redux state to see what sounds should be playing
5. **Extensible:** Easy to add new sounds or modify trigger conditions