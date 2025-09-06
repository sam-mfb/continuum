# Galaxy Module

Manages galaxy file parsing, planet indexing, and game progression. Handles loading planet data from galaxy files and managing planet selection sequences.

## Key Files

- `methods.ts` - Galaxy file parsing and planet loading utilities
- `types.ts` - Galaxy file format and planet index definitions
- `constants.ts` - File format constants (FILEHEAD=160, PLANSIZE=1540)

## Original Source

Based on original galaxy logic from `orig/Sources/Main.c` (`do_open()`, `read_header()`, `get_planet()` functions).
