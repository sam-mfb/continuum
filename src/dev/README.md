# Development Tools Application

A React application providing visual tools for developing and testing the Continuum game port.

## Structure

### `App.tsx` & `main.tsx`
Application entry points and root component.

### `components/`
React components for various development tools:
- Sprite viewers and controls
- Planet viewers and editors
- Graphics file viewers
- Sound test panels
- Game statistics overlays

### `demos/`
Test games and visual demonstrations:
- Ship movement tests
- Explosion demos
- Wall rendering tests
- Collision detection demos
- Each demo is a self-contained game loop for testing specific features

### `store/`
Redux store configuration for the dev app:
- `store.ts` - Main dev app store
- `gameStore.ts` - Store builder for game demos
- Dev-specific slices (UI, graphics, sprites)

### `draw/`
Drawing utilities for rendering game elements in demos:
- Line drawing
- Bunker rendering
- Ship rendering
- Fuel depot rendering

### `art/`
Art assets and utilities for the dev tools:
- Graphics file parsers
- Image format converters
- Title screen assets

### `file/`
File management utilities for loading game resources.

## Running the Dev App

```bash
npm run dev
```

Opens at http://localhost:3000 with hot module replacement.

## Purpose

This app is specifically for:
- Testing individual game components
- Visualizing game data (sprites, planets, etc.)
- Debugging game logic
- Performance testing
- Asset validation

It is NOT the actual game - that lives in `../game/`