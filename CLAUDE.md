# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a recreation of the 68000 Mac game "Continuum" for the web, maintaining the original code structure and game mechanics. The goal is to stay as close to the original source code as possible while making it playable in a browser.

## Coding Practices - HIGHLY IMPORTANT

- Typecheck, lint, and format after you finish editing a file
- Don't forget to format!!
- Commit changes to version control when you finish a task
- Only run a background server or other background task if EXPLICITLY asked to by the user

## Architecture

### Core Structure

- Original source files are in `orig/Sources/` - these are the reference 68K Mac C files
- IMPORTANT: Never edit files in orig/
- Information about how the game is architected is available in `arch/` though always double check against the actual code
- 68k instructions and macros - When implementing rewrites of machine code, use the emulator library available in src/asm

### Port Structure

The port makes several adaptations to modern javascript/coding practices:

1. We try to keep a cleaner separation between game state and rendering than the original game (though the original game does a pretty good job)
2. All game state updates (including physics) are maintained in redux slices
3. Rendering is handled by using the MonochromeBitmap type to represent a black and white screen or image and then copying that to a canvas for every frame

## Development Rules

1. **Maintain Original Structure**: Keep game engine, data types, functions, and business logic as close to original as possible
2. **Traceability**: New code should be easily traceable back to original via file headers
3. **Original Names**: Use original function and variable names where possible
4. **File Headers**: When reorganizing, include information linking back to original code

## Development Commands

- `npm run dev`: Start development server
- `npm run game`: Start game dev server
- `npm run build:dev`: Build dev for production
- `npm run build:game`: Build game for production
- `npm run test`: Run tests once
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Check code style
- `npm run lint:fix`: Fix linting issues
- `npm run format`: Format code with Prettier
- `npm run typecheck`: Run TypeScript type checking

## Typescript

- Don't use classes. Use factory function builder patterns.

## Test Writing

- Don't use the word "should" in test names
- Only use 'describe' blocks if there will be more than one at a given level
- When the user asks you to write unit tests, provide a numbered list of the tests you propose to write and ask which ones the user wants you to actually write

## Commits

- Each commit should relate to a logical piece of work, e.g., don't commit work on two features in one commit
- Keep commit messages to a single, concise line.
- No attribution in commits
