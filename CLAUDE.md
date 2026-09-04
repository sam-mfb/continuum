# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a recreation of the 68000 Mac game "Continuum" for the web, maintaining the original code structure and game mechanics. The goal is to stay as close to the original source code as possible while making it playable in a browser.

## Coding Practices - HIGHLY IMPORTANT

- Typecheck, lint, and format after you finish editing a file
- Don't forget to format!!
- If you touched anything under `scripts/`, or anything they import, also run `npm run typecheck:scripts` - it has its own tsconfig and `npm run typecheck` does not cover it
- Commit changes to version control when you finish a task
- Only run a background server or other background task if EXPLICITLY asked to by the user
- Run `npm ci` before formatting if node_modules might be stale. Prettier's output changes between versions, and formatting with the wrong one rewrites files your change never touched
- Only reformat files your change actually touches. If `git status` shows unrelated files modified after a format, revert them
- Measure before diagnosing a performance problem. Profile, count the allocations, time the frame - don't reason from what looks expensive

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
- No module-level mutable state in library and render modules - no module-scoped `let`, cache, or scratch buffer. State that has to outlive a call is created by the caller and passed in, so the function itself holds nothing
- Give each such cache its own module, exporting its boxed type, its `create*` factory, and its accessors together. See `src/lib/frame/spriteCanvasCache.ts`:

  ```ts
  export type SpriteCanvasCache = { cache: WeakMap<...> }
  export function createSpriteCanvasCache(): SpriteCanvasCache
  export function getSpriteCanvas(cache: SpriteCanvasCache, ...): HTMLCanvasElement
  ```

  The consumer takes the cache as a parameter and never reaches for a global. Don't move the accessors into the consuming module - they belong with the type they operate on

- Put the generic builder in `src/lib` and the pre-bound instance in the section that uses it: `buildCreateSyncThunk` lives in `src/lib/redux`, and `src/core/game/createSyncThunk.ts` is that builder bound to the core store's state and services. Import the bound one, never re-bind at a call site
- Write it plainly. No `??=` or similar shortcuts in place of an explicit check
- Delete code that no longer has callers, as part of the change that orphaned it - dead types and exports included
- A function that mutates its argument in place needs a doc comment saying why and where the immutability boundary actually sits (see `revealPixel` in `src/core/transition/FizzTransitionServiceFrame.ts`). Without that, an in-place write reads as an oversight

## React

- Build a ref's contents lazily; never call a factory in the `useRef` argument, which runs it on every render and throws the result away:

  ```ts
  const cacheRef = useRef<SpriteCanvasCache | null>(null)
  if (cacheRef.current === null) {
    cacheRef.current = createSpriteCanvasCache()
  }
  ```

## Imports

- Use the bare section aliases for cross-section imports: `@core/`, `@game/`, `@lib/`, `@dev/`, `@render/`, `@render-modern/`. Reserve relative paths for siblings within the same directory
- Never use `@/` - a lint rule rejects it
- One import statement per module, not several from the same path
- `src/game` and `src/dev` may import from `src/core` and `src/lib`. The reverse is a layering inversion: shared code belongs in `src/lib`. (A few `src/core` tests import the `@dev/file` test helper; production code has no such import)
- Adding an alias means adding it to all four configs - `tsconfig.json`, `scripts/tsconfig.json`, `vite.config.ts`, `vitest.config.ts` - and listing longer prefixes first, since these are matched as string prefixes and `@render` would otherwise shadow `@render-modern`

## Test Writing

- Don't use the word "should" in test names
- Only use 'describe' blocks if there will be more than one at a given level
- When the user asks you to write unit tests, provide a numbered list of the tests you propose to write and ask which ones the user wants you to actually write

## Commits

- Each commit should relate to a logical piece of work, e.g., don't commit work on two features in one commit
- If you notice a commit mixing two logical changes, split it before pushing (`git reset --soft` and re-stage)
- Keep commit messages to a single, concise line.
- No attribution in commits
