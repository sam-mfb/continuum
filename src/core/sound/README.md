# Sound Module

Recreates the original Continuum sound system using Web Audio API. Manages real-time audio generation, sound effects, and maintains compatibility with the original 1986 Mac audio characteristics.

## Key Files

- `soundSlice.ts` - Redux slice for sound state management
- `service.ts` - Top-level sound service interface for the game
- `soundEngine.ts` - Central coordinator for audio pipeline
- `audioOutput.ts` - Web Audio API interface and format conversion
- `bufferManager.ts` - Circular buffer for smooth audio playback
- `generators/` - Individual sound effect generators (thruster, explosions, etc.)

## Original Source

Based on original sound system from `orig/Sources/Sound.c` and Mac Sound Driver implementation.
