# Production Game Application

The actual playable Continuum game. This is a standalone React application separate from the development tools.

## Status

**Under Development** - Basic structure in place, full implementation pending.

## Structure

### `App.tsx` & `main.tsx`
Application entry points for the game.

### `index.html`
HTML entry point for the game app.

### `index.css`
Game-specific styles (completely separate from dev app styles).

### `components/`
Game UI components (to be implemented):
- Main game canvas
- Menu system
- HUD overlay
- Control panels

## Running the Game

```bash
npm run game
```

Opens at http://localhost:3001

## Building for Production

```bash
npm run build:game
```

Creates optimized production build in `dist-game/`

## Design Principles

- **Standalone**: Completely independent from the dev app
- **Performance**: Optimized for gameplay, not debugging
- **User Experience**: Focus on playability and fun
- **Core Integration**: Uses modules from `@core/*` for all game logic