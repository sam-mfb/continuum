# Mobile Adaptation Plan for Continuum

Based on analysis of the codebase, here's a comprehensive plan for adapting the game to mobile browsers:

## **A. Eliminate Hardcoded Scale-Sensitive Values (PHASE 0)**

**CRITICAL FIRST STEP**: Before implementing responsive scaling, we must refactor all components to use dynamic scale-based values instead of hardcoded pixel dimensions.

**Components with hardcoded scale-dependent values:**

1. **App.tsx** - Container: `width: '1024px', height: '684px'` (should be `512*scale x 342*scale`)
2. **StartScreen.tsx**:
   - Container: `width: '1024px', height: '684px'`
   - Title page canvas: `width = 1002px, height = 622px` (hardcoded 2x scale)
   - Score positions: lines 153, 247-292 (e.g., `top: '326px', left: '66px'`)
   - High score table positions: hardcoded pixel values throughout
   - Bottom controls: `height: '62px'`
   - Font sizes: `fontSize: '24px'` (12pt \* 2)
3. **GameOverScreen.tsx** - Container: `width: '1024px', height: '684px'`
4. **HighScoreEntry.tsx** - Container: `width: '1024px', height: '684px'`
5. **Map.tsx** - Already receives scale prop correctly ✓

**Refactoring approach:**

1. Create `src/game/constants/dimensions.ts`:

   ```typescript
   // Base dimensions (original game size at 1x scale)
   export const BASE_GAME_WIDTH = 512
   export const BASE_GAME_HEIGHT = 342
   export const BASE_TOTAL_HEIGHT = 342 + 342 // game + controls (684/2)

   // Helper function to calculate scaled dimensions
   export const getScaledDimensions = (scale: number) => ({
     gameWidth: BASE_GAME_WIDTH * scale,
     gameHeight: BASE_GAME_HEIGHT * scale,
     totalHeight: BASE_TOTAL_HEIGHT * scale
   })
   ```

2. **Modify all screen components** to accept a `scale` prop:

   - StartScreen: multiply all pixel positions by scale
   - GameOverScreen: multiply container dimensions by scale
   - HighScoreEntry: multiply container dimensions by scale
   - App.tsx: pass scale prop to all screen components

3. **Current baseline**: All components currently assume `scale = 2`
   - Extract this as a default constant
   - Once refactored, we can make it dynamic

---

## **B. Responsive Canvas Scaling**

**1. Create a `useResponsiveScale` hook** (`src/game/hooks/useResponsiveScale.ts`)

- Calculate optimal scale factor based on viewport dimensions
- Maintain 512x342 aspect ratio (original game dimensions)
- Listen to window resize/orientation change events
- Return: `{ scale, canvasWidth, canvasHeight, containerWidth, containerHeight }`
- Minimum scale: 1, maximum scale: determined by viewport

**2. Update App.tsx to use responsive scale**

- Use `useResponsiveScale()` hook to get dynamic scale
- Pass scale to all child components (GameRenderer, StartScreen, GameOverScreen, etc.)
- Container dimensions should come from hook, not hardcoded

**3. Update `index.html`**

- Add mobile-optimized viewport meta tags

---

## **C. Fullscreen Support**

**1. Add fullscreen state to `appSlice.ts`**

- New state field:
  ```typescript
  isFullscreen: boolean
  ```
- New actions:
  ```typescript
  setFullscreen(value: boolean)
  toggleFullscreen()
  ```

**2. Create fullscreen utility** (`src/game/mobile/fullscreen.ts`)

- Export `enterFullscreen()` function:
  ```typescript
  const elem = document.documentElement
  if (elem.requestFullscreen) {
    await elem.requestFullscreen()
  }
  ```
- Export `exitFullscreen()` function:
  ```typescript
  if (document.exitFullscreen) {
    await document.exitFullscreen()
  }
  ```
- Export `toggleFullscreen()` helper that checks current state
- Handle vendor prefixes for broader browser support

**3. Add fullscreen change listeners**

- Listen to `fullscreenchange` event (and vendor-prefixed versions)
- Sync `isFullscreen` state in Redux when user exits fullscreen via ESC key
- Implementation in `App.tsx` or `main.tsx`:
  ```typescript
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      dispatch(setFullscreen(isNowFullscreen))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [dispatch])
  ```

**4. Add fullscreen toggle button**

- Show on touch devices (phones/tablets) when not in game
- Could be on `StartScreen` as a button near settings
- Or as a floating button that appears when touch controls are detected
- Icon: standard fullscreen expand/collapse icon
- Hide when already in fullscreen mode, show "Exit Fullscreen" when in fullscreen

**5. Responsive scaling benefits**

- Once in fullscreen, `useResponsiveScale` will automatically recalculate
- Game will scale to fill entire screen
- Maximum playable area on mobile devices

---

## **D. Touch Controls with nipplejs**

**1. Create `TouchJoystick` component** (`src/game/components/TouchJoystick.tsx`)

- Use nipplejs library (add to package.json)
- Position in bottom-left corner with semi-transparent background
- Map joystick vector to left/right/thrust controls:
  - Horizontal movement → left/right
  - Vertical upward → thrust
- Return control states compatible with `ControlMatrix` type

**2. Create `TouchButtons` component** (`src/game/components/TouchButtons.tsx`)

- Two primary buttons: Fire (bottom-right) and Shield (above Fire)
- Touch-optimized sizing (minimum 60px tap targets)
- Visual feedback on press (opacity/scale changes)
- Handle `touchstart`/`touchend` events
- Return control states compatible with `ControlMatrix` type

**3. Create `TouchControlsOverlay` component** (`src/game/components/TouchControlsOverlay.tsx`)

- Wrapper that combines TouchJoystick + TouchButtons
- **Positioning for ergonomic thumb access:**
  - `position: fixed` (relative to viewport, not canvas)
  - `bottom: 0`, `left: 0`, `right: 0`
  - `z-index: 1000` (above all game elements)
  - Joystick: `position: absolute; bottom: 20px; left: 20px` within overlay
  - Buttons: `position: absolute; bottom: 20px; right: 20px` within overlay
- **Visual design:**
  - Semi-transparent controls (`opacity: 0.7-0.8`) to minimize obstruction
  - Don't block view of critical game elements
- Manages combined control state from both components
- Provides unified `ControlMatrix` output

---

## **E. Device Detection & Control Mode Management**

**1. Create device detection utility** (`src/game/mobile/deviceDetection.ts`)

- Export `isTouchDevice()` function (primary detection)
  - Check for touch capability: `'ontouchstart' in window || navigator.maxTouchPoints > 0`
  - **Returns true for phones AND tablets (including iPads)**
  - This is the key function for determining default touch control state
- Optional: Export `isSmallScreen()` for UI layout decisions
  - Check screen width (e.g., `window.innerWidth < 768`)
  - Used for layout optimizations, NOT for enabling/disabling touch controls
- **Default behavior**: Touch controls enabled for ANY touch-capable device, regardless of screen size

**2. Add touch controls state to `appSlice.ts`**

- New state fields:
  ```typescript
  touchControlsEnabled: boolean
  touchControlsOverride: boolean | null // null = auto-detect
  ```
- New actions:
  ```typescript
  enableTouchControls()
  disableTouchControls()
  setTouchControlsOverride(value: boolean | null)
  ```

**3. Update `GameRenderer.tsx` to merge control inputs**

- Current keyboard controls from `getControls(keyInfo, bindings)`
- Touch controls from `TouchControlsOverlay` (when enabled)
- Merge both into single `ControlMatrix` (OR logic for each control)
- Pass merged controls to renderer

**4. Initialize touch controls on app load** (`main.tsx` or `App.tsx`)

- Check `touchControlsOverride` value:
  - If `null`: use `isTouchDevice()` to auto-detect (enables for phones AND tablets)
  - If `true/false`: use that value
- Dispatch `enableTouchControls()` or `disableTouchControls()`

---

## **F. Settings Integration**

**1. Update `SettingsModal.tsx`**

- Add "Touch Controls" section with toggle switch
- Three-state control:
  - "Auto-detect" (default)
  - "Always On"
  - "Always Off"
- Show current device detection status
- Dispatches `setTouchControlsOverride()` action

**2. Conditional rendering in `GameRenderer.tsx`**

- Only render `TouchControlsOverlay` when `touchControlsEnabled === true`
- Ensure touch controls don't interfere when disabled

---

## **G. Additional Mobile Optimizations**

**1. Update `InGameControlsPanel.tsx`**

- **Completely hide** (return null) when touch controls are active
- Check `touchControlsEnabled` from app state
- No repositioning or resizing - full removal to save screen space
- Implementation:
  ```typescript
  const touchControlsEnabled = useAppSelector(
    state => state.app.touchControlsEnabled
  )
  if (touchControlsEnabled) return null
  ```

**2. Add CSS for mobile** (`src/game/styles/mobile.css`)

- Prevent text selection during touch interactions
- Disable pull-to-refresh on game canvas
- Prevent zoom on double-tap
- Viewport lock styles

**3. Update `index.html`**

- Add mobile-optimized meta tags:
  ```html
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <meta name="mobile-web-app-capable" content="yes" />
  ```

---

## **H. Package Dependencies**

Add to `package.json`:

```json
{
  "dependencies": {
    "nipplejs": "^0.10.2"
  },
  "devDependencies": {
    "@types/nipplejs": "^0.0.3"
  }
}
```

---

## **Implementation Order**

1. **Phase 0 - Refactor Hardcoded Values**: Eliminate scale-dependent hardcoded values (A)
2. **Phase 1 - Responsive Scaling**: Dynamic scale based on viewport (B)
3. **Phase 2 - Fullscreen Support**: Maximize usable screen area on mobile (C)
4. **Phase 3 - Touch Input**: Joystick & buttons (D)
5. **Phase 4 - Intelligence**: Device detection & mode management (E)
6. **Phase 5 - Polish**: Settings UI & mobile optimizations (F, G)

---

## **Key Files to Create/Modify**

**New Files:**

- `src/game/constants/dimensions.ts` (Phase 0)
- `src/game/hooks/useResponsiveScale.ts` (Phase 1)
- `src/game/mobile/fullscreen.ts` (Phase 2)
- `src/game/mobile/TouchJoystick.tsx` (Phase 3)
- `src/game/mobile/TouchButtons.tsx` (Phase 3)
- `src/game/mobile/TouchControlsOverlay.tsx` (Phase 3)
- `src/game/mobile/deviceDetection.ts` (Phase 4)
- `src/game/mobile/mobile.css` (Phase 5)

**Modified Files:**

**Phase 0:**

- `src/game/App.tsx` - Add scale prop to all screen components
- `src/game/components/StartScreen.tsx` - Accept scale prop, use dynamic positioning
- `src/game/components/GameOverScreen.tsx` - Accept scale prop, use dynamic dimensions
- `src/game/components/HighScoreEntry.tsx` - Accept scale prop, use dynamic dimensions

**Phase 1:**

- `src/game/App.tsx` - Use `useResponsiveScale()` hook
- `src/game/components/GameRenderer.tsx` - Use scale from props
- `src/game/index.html` - Add viewport meta tags

**Phase 2:**

- `src/game/appSlice.ts` - Add fullscreen state
- `src/game/App.tsx` - Add fullscreen change listeners
- `src/game/components/StartScreen.tsx` - Add fullscreen toggle button

**Phase 4:**

- `src/game/appSlice.ts` - Add touch control state

**Phase 5:**

- `src/game/components/SettingsModal.tsx` - Add touch controls toggle
- `src/game/components/InGameControlsPanel.tsx` - Hide when touch controls active
- `package.json` - Add nipplejs dependency

This approach maintains the existing keyboard control system while seamlessly adding mobile support with user override capability.
