# Planet Module

Manages planet level data, terrain parsing, and game state for individual planet levels. Handles planet surface generation, collision walls, and level-specific game mechanics.

## Key Files
- `planetSlice.ts` - Redux slice for planet state management
- `parsePlanet.ts` - Planet data file parsing and terrain generation
- `legalAngle.ts` - Legal landing angle calculations for ship
- `render/` - Planet surface and terrain rendering
- `types.ts` - Planet-related type definitions
- `constants.ts` - Planet physics and game constants

## Original Source
Based on original planet logic from `orig/Sources/Planet.c` and planet data files.