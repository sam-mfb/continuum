# Hypothesis and Testing Plan for Bounce Velocity Bug

This document outlines the hypothesis for the bug where the ship incorrectly gains velocity after colliding with a bounce wall, and a plan to test this hypothesis using temporary, non-invasive logging.

## The Hypothesis

The bug is caused by a "double bounce" effect that occurs over two consecutive frames when the ship is not fully resolved from its collision in a single frame.

The core of the hypothesis is:
1.  **The Initial Impact (Frame 1):** The ship hits the wall. Its velocity is *towards* the wall, resulting in a **negative dot product**. The bounce logic correctly triggers, reverses the ship's velocity, and applies a minimum bounce force. The ship is now moving *away* from the wall.
2.  **The Edge Case (Frame 2):** Due to the specifics of the modern game engine's timing, on the very next frame, the ship has moved slightly but its sprite is **still physically overlapping** the bounce wall. It is now moving slowly *away* from the wall.
3.  **The Failure Point (Frame 2):** The bounce logic runs again. This time, the ship's velocity is *away* from the wall, resulting in a **small, positive dot product**. The current check, `if (dot < 16384)`, incorrectly evaluates to `true` for this small positive value.
4.  **The Erroneous Acceleration (Frame 2):** The bounce logic then incorrectly treats this small "away" velocity as an "impact" velocity. It clamps the value up to the minimum bounce force (`2560`) and applies another powerful "kick" to the ship in the same direction it is already moving.

This second, additive bounce is what causes the ship to shoot away from the wall at a much higher velocity than its initial impact speed.

This did not occur in the original game because its engine implicitly guaranteed that the ship would clear the wall's overlap in a single frame, preventing the edge case in step 2 from ever happening.

## The Testing Plan

The goal is to add temporary logging to observe the ship's physics state during a bounce event, specifically to see if a positive dot product is triggering the bounce logic on the frame after an impact.

### Step 1: Add Logging to `checkForBounce.ts`

In `src/core/ship/physics/checkForBounce.ts`, a `console.log` will be added immediately before the `ship/bounceShip` action is dispatched. This will provide a clear marker in the logs for when a bounce is being initiated.

**Proposed Change:**
```typescript
// in checkForBounce.ts, inside the `if (collision)` block
if (result !== null) {
  // LOGGING FOR TEST
  console.log(`FRAME ${gameFrame}: Bounce detected. Dispatching bounceShip.`);

  // Dispatch with the norm value (0-15 direction index)
  store.dispatch({
    type: 'ship/bounceShip',
    payload: {
      norm: result.norm
    }
  })
}
```

### Step 2: Add Detailed Logging to `shipSlice.ts`

In `src/core/ship/shipSlice.ts`, inside the `bounceShip` reducer, detailed logging will be added to capture the complete physics state before, during, and after the calculation.

**Proposed Change:**
```typescript
// in shipSlice.ts, inside the `bounceShip` reducer
bounceShip: (state, action) => {
  // ...
  const dot = state.dx * x1 + state.dy * y1;

  // LOGGING FOR TEST
  console.log('--- BOUNCE CALCULATION ---');
  console.log(`  Initial Velocity: dx=${state.dx}, dy=${state.dy}`);
  console.log(`  Dot Product: ${dot}`);

  if (dot < 256 * 64) {
    let absDot = dot < 0 ? -dot : dot;
    console.log(`  Initial Magnitude (absDot): ${absDot}`);

    if (absDot < 10 * 256) {
      absDot = 10 * 256;
      console.log(`  Clamped Magnitude: ${absDot}`);
    }

    const xkick = Math.floor((x1 * absDot) / (24 * 48));
    const ykick = Math.floor((y1 * absDot) / (24 * 48));
    console.log(`  Calculated Kick: xkick=${xkick}, ykick=${ykick}`);

    state.dx += xkick;
    state.dy += ykick;
    console.log(`  Final Velocity: dx=${state.dx}, dy=${state.dy}`);
  } else {
    console.log('  Dot product >= 16384. No bounce applied.');
  }
  console.log('--------------------------');

  state.bouncing = true;
},
```

### Step 3: Observe Console Output

The user will run the game, open the developer console, and fly slowly into a bounce wall. The log output will be observed.

## Predicted Results

-   **If the Hypothesis is Correct:** The console will show a sequence of logs for a single collision event. The first log will show a **negative `dot` product**. The immediately following log, on the next frame, will show a **small, positive `dot` product**, followed by a "Clamped Magnitude" log, and a "Final Velocity" that is significantly higher than the "Initial Velocity". This would confirm the hypothesis.

-   **If the Hypothesis is Incorrect:** The console logs will show that the `dot` product is **always negative** when the bounce calculation is performed. If the bug still occurs under this condition, the hypothesis is false, and the problem lies elsewhere.
