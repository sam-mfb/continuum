# Core Game Modules

Direct ports from the original Continuum 68K Mac game. These modules implement the core game logic and maintain fidelity to the original source code.

## Game Systems

### `ship/`

Player ship control, movement physics, and collision detection. Includes the ship Redux slice and all physics calculations ported from the original.

### `planet/`

Planet generation, terrain management, and bunker/fuel placement. Handles all planet-specific game logic.

### `shots/`

Projectile system for both player and enemy shots. Manages shot physics, collisions, and lifecycle.

### `walls/`

Wall and boundary rendering system. Handles the distinctive black/white terrain lines that define the game world.

### `explosions/`

Explosion effects and particle systems. Manages bunker explosions and visual effects.

### `status/`

Status bar rendering and game state display. Shows score, lives, fuel, and other vital information.

### `screen/`

Screen rendering coordination and viewport management. Controls what portion of the game world is visible.

### `galaxy/`

Galaxy generation, navigation, and planet selection. Manages the overarching game structure.

### `sound/`

Sound engine and audio effects. Handles all game sounds and music.

### `sprites/`

Sprite loading and management service. Provides access to all game graphics.

### `figs/`

Figure and shape data definitions. Contains geometric data for game objects.

### `shared/`

Shared utilities and common functions used across multiple modules.

## Design Principles

- **Faithful Porting**: Code structure mirrors the original as closely as possible
- **Redux Integration**: Each major system has its own Redux slice for state management
- **TypeScript Types**: Strong typing while maintaining original data structures
- **Modular Organization**: Clear separation between different game systems
