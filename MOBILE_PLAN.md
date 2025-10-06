# Mobile Adaptation Plan for Continuum

Based on analysis of the codebase, here's a comprehensive plan for adapting the game to mobile browsers:

## **A. Eliminate Hardcoded Scale-Sensitive Values (PHASE 0)** ✅ **COMPLETED**

**Status**: All components have been refactored to use dynamic scale-based values.

**Completed work:**

1. ✅ **Created `src/game/constants/dimensions.ts`**:

   - Exports `BASE_GAME_WIDTH`, `BASE_GAME_HEIGHT`, `BASE_CONTROLS_HEIGHT`, `BASE_TOTAL_HEIGHT`
   - Exports `DEFAULT_SCALE = 2` (currently used throughout)
   - Exports `getScaledDimensions(scale)` helper function

2. ✅ **Refactored all screen components** to accept and use `scale` prop:

   - **App.tsx**: Uses `getScaledDimensions(scale)` and passes scale to all child components
   - **StartScreen.tsx**: All positions, dimensions, and font sizes multiply by scale
   - **GameOverScreen.tsx**: Container dimensions and all UI elements scaled dynamically
   - **HighScoreEntry.tsx**: Container dimensions and all UI elements scaled dynamically
   - **SettingsModal.tsx**: All dimensions, sprite icons, and nested components scaled
   - **VolumeControls.tsx**: All UI elements scaled (16px base at 1x)
   - **VolumeButton.tsx**: Icon, slider, and text scaled (16px icon base at 1x)
   - **Map.tsx**: Already correctly implemented ✓

3. ✅ **Current state**:
   - All components work correctly at any scale value (tested at 1x, 2x, 3x)
   - Default scale is 2x (set in `dimensions.ts`)
   - Sprites render with crisp pixels using canvas fillRect pattern
   - Ready for Phase 1: making scale dynamic based on viewport

---

## **B. Responsive Canvas Scaling (PHASE 1)** ✅ **COMPLETED**

**Status**: Responsive scaling with user control implemented and working.

**Completed work:**

1. ✅ **Created `useResponsiveScale` hook** (`src/game/hooks/useResponsiveScale.ts`):

   - Calculates optimal integer scale factor based on viewport dimensions
   - Supports both auto-responsive mode and fixed scale modes (1x, 2x, 3x)
   - Listens to window resize and orientation change events with 500ms debounce
   - Returns `{ scale, dimensions: { gameWidth, gameHeight, controlsHeight, totalHeight } }`
   - Immediately recalculates when switching from fixed to auto mode

2. ✅ **Updated App.tsx to use responsive scale**:

   - Uses `useResponsiveScale(scaleMode)` hook with scale mode from Redux state
   - Passes scale to all child components (GameRenderer, StartScreen, SettingsModal, etc.)
   - Container dimensions come from hook's `dimensions` object

3. ✅ **Updated `index.html`**:

   - Added mobile-optimized viewport meta tags:
     - `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
     - `mobile-web-app-capable`, `apple-mobile-web-app-capable`
     - `apple-mobile-web-app-status-bar-style: black-fullscreen`

4. ✅ **Added Scale Mode setting**:

   - New `ScaleMode` type: `'auto' | 1 | 2 | 3`
   - Added to `appSlice.ts` with default value 'auto'
   - Persisted to localStorage via `appMiddleware.ts`
   - Loaded from localStorage in `store.ts`
   - Custom dropdown in SettingsModal (replaced native `<select>` for better control over styling)

5. ✅ **Fixed dimensions calculation**:
   - Set `BASE_CONTROLS_HEIGHT = 0` (InGameControlsPanel is absolutely positioned)
   - Updated `BASE_TOTAL_HEIGHT = 342` (just game height, no controls height)
   - Allows 2x scale at smaller viewport sizes

---

## **C. Fullscreen Support** ✅ **COMPLETED**

**Status**: Fullscreen support with toggle button and auto-hide controls implemented.

**Completed work:**

1. ✅ **Added fullscreen state to `appSlice.ts`**:

   - New state field: `isFullscreen: boolean`
   - New action: `setFullscreen(value: boolean)`

2. ✅ **Created fullscreen utility** (`src/game/mobile/fullscreen.ts`):

   - `enterFullscreen()` function with vendor prefix support
   - `exitFullscreen()` function with vendor prefix support
   - `toggleFullscreen()` helper that checks current state
   - `isFullscreen()` helper with vendor prefix checks

3. ✅ **Created FullscreenButton component** (`src/game/components/FullscreenButton.tsx`):

   - Positioned at top-left corner (20px from edges)
   - Light gray color (rgba(192, 192, 192, 0.8)) with white hover state
   - Square fullscreen icon (⛶)
   - Auto-hides after 3 seconds of inactivity (mouse/touch)
   - Click-only control (no ESC key handling)
   - Updates Redux state after toggling

4. ✅ **Created inactivity detection hook** (`src/game/hooks/useInactivityDetection.ts`):

   - Detects mouse movement and touch events
   - 3-second timeout before hiding controls
   - Used by both FullscreenButton and VolumeButton

5. ✅ **Updated VolumeButton** (`src/game/components/VolumeButton.tsx`):

   - Repositioned to top-right corner
   - Horizontal slider extending left (direction: rtl)
   - Auto-hides after 3 seconds of inactivity
   - Left side = 100% volume

6. ✅ **Updated high score indicator** (`src/game/App.tsx`):

   - Moved warning triangle (⚠) to bottom-right corner

7. ✅ **Responsive scaling integration**:
   - `useResponsiveScale` automatically recalculates when entering/exiting fullscreen
   - Game scales to fill entire screen in fullscreen mode
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

1. ✅ **Phase 0 - Refactor Hardcoded Values**: Eliminate scale-dependent hardcoded values (A) - **COMPLETED**
2. ✅ **Phase 1 - Responsive Scaling**: Dynamic scale based on viewport (B) - **COMPLETED**
3. ✅ **Phase 2 - Fullscreen Support**: Maximize usable screen area on mobile (C) - **COMPLETED**
4. **Phase 3 - Touch Input**: Joystick & buttons (D) - **NEXT**
5. **Phase 4 - Intelligence**: Device detection & mode management (E)
6. **Phase 5 - Polish**: Settings UI & mobile optimizations (F, G)

---

## **Key Files to Create/Modify**

**New Files:**

- ✅ `src/game/constants/dimensions.ts` (Phase 0) - **COMPLETED**
- ✅ `src/game/hooks/useResponsiveScale.ts` (Phase 1) - **COMPLETED**
- ✅ `src/game/hooks/useInactivityDetection.ts` (Phase 2) - **COMPLETED**
- ✅ `src/game/mobile/fullscreen.ts` (Phase 2) - **COMPLETED**
- ✅ `src/game/components/FullscreenButton.tsx` (Phase 2) - **COMPLETED**
- `src/game/mobile/TouchJoystick.tsx` (Phase 3)
- `src/game/mobile/TouchButtons.tsx` (Phase 3)
- `src/game/mobile/TouchControlsOverlay.tsx` (Phase 3)
- `src/game/mobile/deviceDetection.ts` (Phase 4)
- `src/game/mobile/mobile.css` (Phase 5)

**Modified Files:**

**Phase 0:** ✅ **COMPLETED**

- ✅ `src/game/App.tsx` - Added scale prop to all screen components
- ✅ `src/game/components/StartScreen.tsx` - Accepts scale prop, uses dynamic positioning
- ✅ `src/game/components/GameOverScreen.tsx` - Accepts scale prop, uses dynamic dimensions
- ✅ `src/game/components/HighScoreEntry.tsx` - Accepts scale prop, uses dynamic dimensions
- ✅ `src/game/components/SettingsModal.tsx` - Accepts scale prop, all elements scaled
- ✅ `src/game/components/VolumeControls.tsx` - Accepts scale prop, all elements scaled
- ✅ `src/game/components/VolumeButton.tsx` - Accepts scale prop, all elements scaled
- ✅ `src/game/constants/dimensions.ts` - Created with base dimensions and helpers

**Phase 1:** ✅ **COMPLETED**

- ✅ `src/game/App.tsx` - Uses `useResponsiveScale(scaleMode)` hook, passes scale to all components
- ✅ `src/game/components/InGameControlsPanel.tsx` - Accepts and uses scale prop
- ✅ `src/game/index.html` - Added mobile viewport meta tags
- ✅ `src/game/appSlice.ts` - Added `scaleMode` state and `setScaleMode` action
- ✅ `src/game/appMiddleware.ts` - Persists `scaleMode` to localStorage
- ✅ `src/game/store.ts` - Loads `scaleMode` from localStorage on init
- ✅ `src/game/components/SettingsModal.tsx` - Added Display Scale custom dropdown control
- ✅ `src/game/constants/dimensions.ts` - Fixed BASE_CONTROLS_HEIGHT and BASE_TOTAL_HEIGHT

**Phase 2:** ✅ **COMPLETED**

- ✅ `src/game/appSlice.ts` - Added fullscreen state and setFullscreen action
- ✅ `src/game/App.tsx` - Added FullscreenButton component and repositioned high score indicator
- ✅ `src/game/components/VolumeButton.tsx` - Repositioned to top-right, added inactivity detection, horizontal slider
- ✅ `src/game/components/FullscreenButton.tsx` - Created with auto-hide functionality

**Phase 4:**

- `src/game/appSlice.ts` - Add touch control state

**Phase 5:**

- `src/game/components/SettingsModal.tsx` - Add touch controls toggle
- `src/game/components/InGameControlsPanel.tsx` - Hide when touch controls active
- `package.json` - Add nipplejs dependency

This approach maintains the existing keyboard control system while seamlessly adding mobile support with user override capability.
