# Collision Detection Refactoring - Design Plan

## Objective

Decouple collision detection from rendering to enable replay functionality while maintaining exact functional equivalence with the original game's pixel-perfect collision system.

## Background

Currently, collision detection happens during the rendering phase because:

1. The original game drew objects to the screen buffer and then checked if ship pixels overlapped with existing screen pixels
2. Drawing order determined what was collidable (erase_figure punched holes for non-lethal objects)
3. The collision check function (checkFigure) inspected the actual rendered bitmap

This tight coupling prevents running state updates independently from rendering, which is needed for replay features like fast-forward, headless validation, and variable playback speeds.

## Key Insights

### 1. Background Masking is Not Gameplay-Critical

The original game's dithered background masking (which only detected collisions at alternating pixel positions) was a performance optimization for 68k hardware. Since all collidable objects are >2 pixels wide and move continuously, no actual collision can be missed. Modern hardware can check all pixels without the masking optimization while maintaining exact functional equivalence.

### 2. Punch-Through Logic is Rendering-Specific

The erase_figure hole-punching exists because the original rendered everything to one buffer. If we build a collision map that only contains collidable objects, we never need to punch holes - we simply don't add non-collidable objects in the first place.

### 3. Collisions Only Happen On-Screen

The ship is always visible on screen, and collisions only happen between the ship and other objects. Therefore, we only need to track collidable pixels within the current viewport, not the entire world.

### 4. Most Pixels Are Empty

Sparse storage (only recording collidable pixels) is much more memory-efficient than maintaining a full grid for the entire screen.

## Design Overview

Replace the rendering-based collision detection with a sparse collision map built purely from game state, checked during state updates before rendering occurs.

## Data Structure Design

### Collision Map Representation

- Store only collidable pixels using sparse storage (Set or Map)
- Each entry records screen-relative coordinates (x, y) and collision type
- Collision types: "fatal" (kills ship) and "bounce" (bounces ship)
- Use screen-relative coordinates (not world coordinates) since we only map the viewport
- Optimize lookups by using a Set of coordinate string keys for O(1) collision checks

### Coordinate System

- Build collision map in screen-relative coordinates (0 to SCRWTH for x, 0 to VIEWHT for y)
- Convert world-coordinate objects (walls, bunkers, shots) to screen coordinates during map construction
- Ship collision check uses ship's screen position directly

## Collision Map Construction

### Viewport Filtering

Before adding any object to the collision map, determine if it intersects the current viewport:

- Viewport bounds: screenx to (screenx + SCRWTH), screeny to (screeny + VIEWHT)
- Only process objects that are visible on screen
- Convert world coordinates to screen coordinates by subtracting screenx/screeny

### Objects to Include (in order matching original rendering)

**Fatal collisions:**

1. Normal terrain walls (LINE_KIND.NORMAL)
2. Live bunkers with rot >= 0 (using their collision masks)
3. Enemy bunker shots (only if ship is not shielding)

**Bounce collisions:**

1. Bounce terrain walls (LINE_KIND.BOUNCE)

**Objects to exclude (non-collidable):**

- Background/craters/decorative elements
- Fuel cells (use proximity detection, not pixel collision)
- Ghost walls (LINE_KIND.GHOST)
- White terrain (undersides/junctions)
- The ship itself
- Ship shots (they don't collide with ship)
- Explosions/visual effects

### Handling World Wrapping

When the viewport is near the right edge of a wrapping world:

- Check if screenx > worldwidth - SCRWTH
- If true, render wrapped objects a second time at adjusted coordinates (worldx - worldwidth)
- This matches the original rendering behavior for wrapped levels

### Building Collision Pixels

**For walls (lines):**

- Use the same line drawing algorithm as rendering
- For each pixel the line passes through, add to collision map with appropriate type
- Handle line thickness if applicable

**For bunkers:**

- Get the bunker's collision mask sprite (not the visual sprite)
- For each set pixel in the mask, add to collision map
- Offset by bunker's screen-relative position

**For bunker shots:**

- Each shot is a single pixel (or small cluster)
- Add shot's screen-relative position to collision map
- Only include if ship is not currently shielding

## Collision Detection Algorithm

### Ship Mask Extraction

- Get the ship's collision mask for current rotation from sprite service
- Extract all set pixels from the mask (pixels that are "on")
- Store as array of offset coordinates relative to ship center

### Collision Check Process

1. Build Set of collision pixel coordinate strings from collision map
2. For each set pixel in ship mask:
   - Calculate world position: ship screen position + pixel offset - SCENTER
   - Check if this coordinate exists in collision Set
   - If match found, collision detected - return collision type
3. If no pixels match, no collision

### Optimization

Use string-keyed Set for O(1) lookup rather than nested loops. The check becomes O(shipPixels) instead of O(shipPixels × collisionPixels).

### Bounce vs Fatal Handling

- Return both collision boolean and collision type from check function
- State update logic uses type to determine whether to bounce or kill ship
- This separates bounce checking from fatal collision checking (currently done in two rendering passes)

## Integration Points

### In State Updates (stateUpdates.ts)

1. Build collision map from current state at start of frame
2. Check bounce collisions and update ship state if needed
3. Check fatal collisions and trigger ship death if needed
4. Continue with remaining state updates

### In Rendering (rendering.ts)

1. Remove collision detection logic (checkForBounce, checkFigure calls)
2. Remove store dependencies (no longer need to dispatch death actions)
3. Rendering becomes purely functional: state → bitmap
4. Can optimize by skipping collision-only rendering steps

### Bounce Collision Specifics

Currently bounce checking happens during rendering with its own erase_figure call. In the new design:

- Build bounce collision map (only BOUNCE walls)
- Check ship mask against bounce map
- If bounce detected, update ship velocity/position
- Build fatal collision map (everything except bounce walls)
- Check ship mask against fatal map
- If fatal collision, trigger death

Alternatively, build one map with collision types and handle appropriately.

## Testing Strategy

### Verification of Equivalence

To verify the new system matches the original:

1. For test frames, build both the sparse collision map AND the full rendered bitmap
2. Convert sparse map back to full bitmap for comparison
3. Visually compare or programmatically diff the two
4. Ensure all collidable pixels match exactly

### Unit Testing

- Test collision map building with known state configurations
- Test viewport filtering (objects on/off screen)
- Test world wrapping edge cases
- Test ship mask collision checks with known collision scenarios
- Test bounce vs fatal collision type handling

### Integration Testing

- Play through levels and verify collision behavior unchanged
- Test edge cases: tight squeezes, diagonal approaches, wrapping boundaries
- Verify shield mechanics (shots not in collision map when shielding)
- Test death flash frames (ship not in collision map when dead)

## Benefits of This Design

### Enables Replay Features

- Can run state updates without rendering for fast-forward
- Can run headless for validation
- Can execute multiple state updates per render frame for variable speed

### Cleaner Architecture

- Rendering becomes pure (state → bitmap, no mutations)
- Collision logic centralized in state updates
- Clear separation of concerns

### Debuggable

- Can visualize collision map by converting sparse representation to bitmap
- Can log exactly which pixels are collidable each frame
- Can inspect collision map independently of rendering

### Maintainable

- Collision logic in one place, not scattered through rendering
- Easier to test collision independently
- Changes to rendering don't affect collision (and vice versa)

### Performance

- Sparse storage: only 50-150 KB per frame vs 170 KB full grid
- O(shipPixels) collision checks instead of O(shipPixels × collisionPixels)
- Viewport filtering: only process visible objects

## Migration Path

1. Implement sparse collision map structure
2. Implement collision map building function (can coexist with current system)
3. Implement collision checking function
4. Add verification tests that compare collision map to rendered bitmap
5. Move collision checks from rendering to state updates
6. Remove collision logic from rendering
7. Remove store dependencies from rendering
8. Verify gameplay unchanged through manual testing

## Open Questions for Implementation

1. Should bounce and fatal collisions use separate maps or one map with typed entries?
2. What's the exact threshold for considering a pixel "set" in the ship mask?
3. Should we cache ship mask pixel positions or recalculate each frame?
4. How to handle the shield visual effect (currently uses erase_figure at end of render)?
5. Are there any frame-timing dependencies where collision must happen at a specific point in the update cycle?
