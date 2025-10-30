/**
 * @fileoverview Game-specific synchronous thunk creator
 *
 * Re-exports a pre-configured createSyncThunk for game store usage.
 */

import { buildCreateSyncThunk } from '@lib/redux'
import type { RootState, GameServices } from '../store'

/**
 * Creates a synchronous thunk action creator with dependency injection.
 * Similar to createAsyncThunk but executes synchronously.
 *
 * Pre-configured for game store's RootState and GameServices.
 */
export const createSyncThunk = buildCreateSyncThunk<RootState, GameServices>()

// Re-export the action type for backward compatibility
export type { SyncThunkAction } from '@lib/redux'
