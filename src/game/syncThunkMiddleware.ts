/**
 * @fileoverview Middleware to handle synchronous thunks created with createSyncThunk
 */

import type { Middleware, Action } from '@reduxjs/toolkit'
import type { RootState, GameServices } from './store'

/**
 * Type guard to check if an action has a sync thunk payload creator
 */
function isSyncThunkAction(action: Action): action is Action & {
  meta: {
    payloadCreator: (
      arg: unknown,
      thunkAPI: { extra: GameServices; getState: () => RootState }
    ) => unknown
    result?: unknown
  }
  payload: unknown
} {
  return (
    typeof action === 'object' &&
    action !== null &&
    'meta' in action &&
    typeof action.meta === 'object' &&
    action.meta !== null &&
    'payloadCreator' in action.meta &&
    typeof action.meta.payloadCreator === 'function'
  )
}

/**
 * Middleware to execute sync thunks
 */
export const syncThunkMiddleware =
  (extra: GameServices): Middleware<{}, RootState> =>
  ({ getState }) =>
  next =>
  (action: unknown) => {
    if (isSyncThunkAction(action as Action)) {
      // Execute the sync thunk's payload creator and store result
      const typedAction = action as Action & {
        meta: {
          payloadCreator: (
            arg: unknown,
            thunkAPI: { extra: GameServices; getState: () => RootState }
          ) => unknown
          result?: unknown
        }
        payload: unknown
      }
      const result = typedAction.meta.payloadCreator(typedAction.payload, {
        extra,
        getState
      })
      // Store result in meta for retrieval
      typedAction.meta.result = result
    }

    // Pass the action through to the next middleware/reducer
    return next(action)
  }
