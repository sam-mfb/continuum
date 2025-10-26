/**
 * @fileoverview Core game synchronous thunk creator
 *
 * Pre-configured createSyncThunk for core game logic.
 */

import { buildCreateSyncThunk } from '@lib/redux'
import type { GameRootState, GameLogicServices } from './types'

/**
 * Creates a synchronous thunk action creator with dependency injection.
 * Similar to createAsyncThunk but executes synchronously.
 *
 * Pre-configured for core game's GameRootState and GameLogicServices.
 */
export const createSyncThunk = buildCreateSyncThunk<
  GameRootState,
  GameLogicServices
>()
