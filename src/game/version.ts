/**
 * Game engine version - only increment for breaking changes to:
 * - Physics/collision detection
 * - Game state structure
 * - Core game logic
 * - Random number generation behavior
 *
 * Does NOT need to increment for:
 * - UI changes
 * - Sound changes
 * - Visual/rendering changes
 * - Performance optimizations that don't affect logic
 *
 * HISTORY:
 * - Version 1: Initial implementation with seeded RNG
 * - Version 2: Fixed initial lives to 3 (TOTAL_INITIAL_LIVES = SHIPSTART + 1)
 */
export const GAME_ENGINE_VERSION = 2
