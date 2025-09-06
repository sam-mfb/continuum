# Source Code Organization

This directory contains the complete source code for the Continuum web port, organized into four main sections:

## Directory Structure

### `core/` - Core Game Implementation

Direct ports from the original 68K Mac game. Contains all game logic, physics, rendering, and state management that powers the actual gameplay.

### `lib/` - Helper Libraries

Modern utility libraries that support the game implementation but aren't direct ports from the original:

- Assembly emulator for handling 68K code
- Bitmap rendering system for monochrome graphics

### `dev/` - Development Tools Application

A React application providing visual tools for developing and testing the game:

- Component viewers for sprites, planets, graphics
- Test games and demos
- Redux DevTools integration
- Run with `npm run dev`

### `game/` - Production Game Application

The actual playable game (to be implemented):

- Standalone React application
- Uses core game modules
- Run with `npm run game`

## Key Concepts

- **Complete Separation**: The dev and game apps are completely separate React applications with their own entry points, stores, and styles
- **Shared Core**: Both apps import from `core/` and `lib/` using path aliases
- **No Cross-Dependencies**: Dev and game apps do not import from each other

## Path Aliases

The project uses TypeScript path aliases for clean imports:

- `@core/*` → `src/core/*`
- `@lib/*` → `src/lib/*`
- `@dev/*` → `src/dev/*`

## Development

- `npm run dev` - Start development tools app (port 3000)
- `npm run game` - Start game app (port 3001)
- `npm run build:dev` - Build development tools
- `npm run build:game` - Build production game
