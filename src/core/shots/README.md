# Shots Module

Manages projectile physics, collision detection, and AI shooting mechanics. Handles player shots, bunker shots, bouncing projectiles, and ballistic calculations.

## Key Files

- `shotsSlice.ts` - Redux slice for shot state management
- `bunkShoot.ts` - Bunker AI shooting logic and targeting
- `bounceShot.ts` - Shot bouncing physics and wall interactions
- `checkShipCollision.ts` / `checkBunkerCollision.ts` - Collision detection
- `moveShot.ts` - Shot movement and physics simulation
- `render/` - Shot rendering and visual effects
- `integerMath.ts` - Fixed-point math for accurate ballistics

## Original Source

Based on original shot logic from `orig/Sources/Shots.c` and ballistics calculations.
