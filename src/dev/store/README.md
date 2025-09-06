# Dev Store

Redux store configuration and state management for the development tools app. Manages UI state, graphics loading, and development tool-specific functionality.

## What's Contained

- `store.ts` - Main Redux store configuration
- `gameStore.ts` - Game state management integration
- `uiSlice.ts` - Development UI state (panels, selections, preferences)
- `spritesSlice.ts` - Sprite viewer and management state
- `galaxySlice.ts` - Galaxy/planet selection and loading state
- `graphicsSlice.ts` - Graphics asset loading and caching state
- `gameViewSlice.ts` - Game view mode and rendering state
- `containmentMiddleware.ts` - Redux middleware for game loop containment

## Purpose in Dev Tools App

Provides state management for the development interface, tracking which tools are open, what assets are loaded, and coordinating between different development views.
