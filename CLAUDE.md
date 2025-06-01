# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a recreation of the 68000 Mac game "Continuum" for the web, maintaining the original code structure and game mechanics. The goal is to stay as close to the original source code as possible while making it playable in a browser.

## Architecture

### Core Structure
- Original source files are in `orig/Sources/` - these are the reference 68K Mac C files
- Main game entry point: `orig/Sources/Main.c` and `orig/Sources/Well.c`
- Core header file: `orig/Sources/GW.h` contains all major constants and macros
- Game modules are split by functionality:
  - `Draw.c`: Figure rendering and graphics
  - `Play.c`: Main gameplay logic
  - `Edit.c`/`QuickEdit.c`: Level editing functionality
  - `Terrain.c`, `Walls.c`, `Bunkers.c`: World element handling
  - `Figs.c`: Figure/sprite management
  - `Sound.c`: Audio system
  - `Utils.c`: Utility functions

### Key Technical Details
- Game uses dual-buffer graphics system (front_screen/back_screen)
- Original designed for 512x342 Mac screen resolution
- Uses original planet files, graphics, and sound formats
- Implements gravity-based physics for projectile motion

### Data Files
- Planet files: `orig/Planets Files/` (original binary format)
- Graphics: `orig/Graphics/` (original Mac bitmap resources)
- Galaxy data: Uses "Continuum Galaxy" world file

## Development Rules

1. **Maintain Original Structure**: Keep game engine, data types, functions, and business logic as close to original as possible
2. **Traceability**: New code should be easily traceable back to original via file headers
3. **Original Names**: Use original function and variable names where possible
4. **File Headers**: When reorganizing, include information linking back to original code
5. **Compatibility**: Game must work with original map files, graphics, and sound

## Roadmap Phases

1. **Planet Parser**: Parse original planet files and display them
2. **Bitmap Parser**: Handle original Mac bitmap formats
3. **Gameplay**: Core game mechanics
4. **Sound**: Audio system implementation
5. **Planet Editor**: Level editing tools (optional)

## Key Constants (from GW.h)

- Screen dimensions: 512x342 (SCRWTH x SCRHT)
- View height: 318 pixels (VIEWHT = SCRHT - SBARHT)
- Status bar height: 24 pixels (SBARHT)
- World coordinate system uses gravity physics

## Development Commands

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests in watch mode
- `npm run test:run`: Run tests once
- `npm run lint`: Check code style
- `npm run lint:fix`: Fix linting issues
- `npm run format`: Format code with Prettier
- `npm run typecheck`: Run TypeScript type checking

## Tech Stack

- **Framework**: React 18 + TypeScript
- **State Management**: Redux Toolkit (app-level state only)
- **Build Tool**: Vite
- **Testing**: Vitest
- **Game Rendering**: HTML5 Canvas (512x342 viewport)
- **Module Type**: ESM

## Project Structure

- `src/app/`: React app shell and UI components
- `src/store/`: Redux Toolkit store for app state
- `src/engine/`: Core game engine modules
  - `graphics/`: Drawing routines (port of Draw.c)
  - `physics/`: Gravity/collision (port of Play.c)
  - `world/`: Terrain/bunkers (port of Terrain.c, etc.)
  - `input/`: Keyboard/mouse handling
- `src/parsers/`: Original file format parsers
- `src/assets/`: Converted game assets