# Browser Replay Feature Plan

## Overview
Add ability to replay recorded games in the browser. Users can load a recording file from their local machine and watch it play back. Keep it simple - just pause and quit controls during playback.

## Architecture

### Reuse Existing Components
- **Rendering**: Use existing `renderer`/`rendererNew` functions (same as live gameplay)
- **RecordingService**: Already has replay support (`startReplay`, `getReplayControls`, `getLevelSeed`)
- **Redux store**: Use existing store and game logic
- **Level loading**: Same `loadLevel` thunk with deterministic seeds from recording

### New Components Needed
1. **ReplaySelectionScreen** - File picker and metadata display
2. **ReplayRenderer** - Modified game loop that reads controls from recording
3. **ReplayControls** - Simple overlay with pause/quit buttons and frame counter

## Implementation Plan

### 1. State Management (appSlice.ts)

Add to `GameMode` type:
```typescript
export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver' | 'replay'
```

Add new state fields:
```typescript
replayPaused: boolean
currentReplayFrame: number
totalReplayFrames: number
loadedRecording: GameRecording | null
```

Add new actions:
- `loadRecording(recording: GameRecording)` - Store loaded recording
- `startReplay()` - Enter replay mode
- `pauseReplay()` - Pause replay
- `resumeReplay()` - Resume replay
- `stopReplay()` - Exit replay, return to start screen
- `setReplayFrame(frame: number)` - Update current frame counter

### 2. Replay Selection Screen Component

**File**: `src/game/components/ReplaySelectionScreen.tsx`

Features:
- File input (`<input type="file" accept=".json">`)
- Parse JSON with FileReader API
- Display recording metadata:
  - Start level
  - Timestamp/date
  - Engine version
  - Galaxy ID
  - Total frames/duration
- Validation:
  - Check required fields exist
  - Warn if engine version mismatch
  - Warn if galaxy ID doesn't match current galaxy
  - Allow playback anyway (best effort)
- "Start Replay" button (disabled until valid file loaded)
- "Back" button to return to start screen

### 3. Replay Renderer Component

**File**: `src/game/components/ReplayRenderer.tsx`

Similar to `GameRenderer.tsx` but with key differences:

**Game Loop**:
- Get controls from `recordingService.getReplayControls(frameCount)` instead of keyboard
- Respect `replayPaused` state - skip updates when paused
- Track frame counter and dispatch `setReplayFrame()` each frame
- Auto-stop when `frameCount >= totalReplayFrames`
- On completion: dispatch `stopReplay()` and return to start screen

**No User Input**:
- No keyboard event listeners for game controls
- Only listen for pause (spacebar/P) and quit (Q/Escape)
- No touch controls overlay

**No Recording**:
- Don't call `recordingService.recordFrame()`
- Recording service is in replay mode, not recording mode

**Level Transitions**:
- Same as validator: game engine auto-transitions via `transitionToNextLevel`
- Level seeds come from recording's `levelSeeds` array
- No manual level loading after first level

**Rendering**:
- Use same render pipeline as live game (respects `renderMode` setting)
- Display ReplayControls overlay

### 4. Replay Controls Overlay

**File**: `src/game/components/ReplayControls.tsx`

Simple overlay displayed during replay:

**Display**:
- Frame counter: `Frame 1234 / 5678`
- Pause button (or "Resume" when paused)
- Quit button

**Layout**:
- Position at top of game canvas
- Semi-transparent background
- Scaled appropriately with game scale

**Interactions**:
- Pause: Dispatch `pauseReplay()` or `resumeReplay()`
- Quit: Dispatch `stopReplay()` - stops replay, returns to start screen
- Keyboard shortcuts: Space/P for pause, Q/Escape for quit

### 5. Initialize Replay Flow

When user clicks "Start Replay" in ReplaySelectionScreen:

1. Dispatch `invalidateHighScore()` - ensure no high score eligibility
2. Reset ship state: `dispatch(shipSlice.actions.resetShip())`
3. Set initial lives: Use `recording.initialState.lives`
4. Set galaxy: Verify matches `recording.galaxyId` (or warn)
5. Clear explosions: `dispatch(clearExplosions())`
6. Initialize RecordingService: `recordingService.startReplay(recording)`
7. Load first level: `dispatch(loadLevel(recording.levelSeeds[0].level, recording.levelSeeds[0].seed))`
8. Set replay state:
   - `currentReplayFrame = 0`
   - `totalReplayFrames = recording.inputs[recording.inputs.length - 1].frame`
   - `replayPaused = false`
9. Dispatch `startReplay()` - changes mode to 'replay'

### 6. Update App.tsx

Add case in `renderGameContent()`:

```typescript
case 'replay':
  return (
    <ReplayRenderer
      renderer={renderer}
      rendererNew={rendererNew}
      collisionService={collisionService}
      spriteService={spriteService}
      spriteRegistry={spriteRegistry}
      renderMode={renderMode}
      width={512}
      height={342}
      scale={scale}
      fps={20}
    />
  )
```

### 7. Update Start Screen

**File**: `src/game/components/StartScreen.tsx`

Add "Watch Replay" button:
- Positioned near "Start Game" button
- Dispatches `setMode('replaySelection')` (or directly shows file picker)
- Alternative: Add to main menu alongside other options

### 8. File Loading Implementation

```typescript
const handleFileLoad = (event: ChangeEvent<HTMLInputElement>): void => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      const recording = JSON.parse(json) as GameRecording

      // Validate required fields
      if (!recording.version || !recording.engineVersion ||
          !recording.levelSeeds || !recording.inputs) {
        throw new Error('Invalid recording format')
      }

      // Store in Redux
      dispatch(loadRecording(recording))

      // Show warnings if needed
      if (recording.engineVersion !== GAME_ENGINE_VERSION) {
        console.warn('Engine version mismatch - replay may diverge')
      }
      if (recording.galaxyId !== currentGalaxyId) {
        console.warn('Galaxy ID mismatch - replay may not work correctly')
      }
    } catch (error) {
      console.error('Failed to load recording:', error)
      alert('Failed to load recording file')
    }
  }
  reader.readAsText(file)
}
```

### 9. Cleanup When Replay Ends

When replay completes (reaches last frame) or user quits:

1. Stop RecordingService: `recordingService.stopReplay()`
2. Clear replay state:
   - `loadedRecording = null`
   - `currentReplayFrame = 0`
   - `totalReplayFrames = 0`
   - `replayPaused = false`
3. Return to start screen: `dispatch(setMode('start'))`

### 10. High Score Prevention

- Dispatch `invalidateHighScore()` when entering replay mode
- High score warning icon (⚠) already shows when not eligible
- Even if replay achieves qualifying score, won't trigger high score entry

## Files to Create

1. `src/game/components/ReplaySelectionScreen.tsx` - File picker and metadata display
2. `src/game/components/ReplayRenderer.tsx` - Replay game loop
3. `src/game/components/ReplayControls.tsx` - Pause/quit overlay

## Files to Modify

1. `src/game/appSlice.ts` - Add replay mode and state
2. `src/game/App.tsx` - Add replay mode rendering
3. `src/game/components/StartScreen.tsx` - Add "Watch Replay" button

## Technical Notes

### Sound During Replay
- Sound should play normally during replay
- Respects current volume and mute settings
- User can mute/unmute during replay (existing volume button)

### Pause Behavior
- When paused: Game loop continues but skips updates
- Rendering frozen at last frame
- Can resume at exact same frame
- No rewinding or frame stepping (keep it simple)

### Galaxy Mismatch Handling
- If recording galaxy ID doesn't match current: Show warning but allow playback
- May cause issues if level data different
- Best effort - let it play and see what happens

### Engine Version Mismatch
- If recording engine version differs: Show warning but allow playback
- Replay may diverge from original due to physics/logic changes
- Still watchable, just may not match original playthrough exactly

### Level Transitions
- Follow same pattern as `RecordingValidator.ts`
- First level loaded explicitly with recorded seed
- Subsequent levels auto-transition via game engine
- Seeds from recording ensure deterministic level generation

### Recording Service Modes
- RecordingService supports three modes: `idle`, `recording`, `replaying`
- Replay uses existing `replaying` mode
- Can't record during replay (mode check prevents it)

## Future Enhancements (Not in Initial Plan)

These are explicitly out of scope for the simple implementation:

- Speed controls (2x, 4x, 8x playback)
- Scrubbing/seeking to arbitrary frame
- Rewind functionality
- Frame-by-frame stepping
- Live validation with divergence warnings
- Recording library/gallery
- Replay editing or trimming
- Export replay as video

Keep it simple: Load, play, pause, quit.
