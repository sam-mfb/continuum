/**
 * @fileoverview Generic middleware to handle synchronous thunks created with createSyncThunk
 */

import type { Middleware, Action } from '@reduxjs/toolkit'

/**
 * Type guard to check if an action has a sync thunk payload creator
 */
function isSyncThunkAction<TState, TExtra>(
  action: Action
): action is Action & {
  meta: {
    payloadCreator: (
      arg: unknown,
      thunkAPI: { extra: TExtra; getState: () => TState }
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
 * Creates middleware to execute sync thunks
 * Generic over state and extra argument types
 *
 * @example
 * ```typescript
 * const syncThunkMiddleware = createSyncThunkMiddleware<RootState, GameServices>()
 * ```
 */
export const createSyncThunkMiddleware =
  <TState, TExtra>() =>
  (extra: TExtra): Middleware<{}, TState> =>
  ({ getState }) =>
  next =>
  (action: unknown) => {
    if (isSyncThunkAction<TState, TExtra>(action as Action)) {
      // Execute the sync thunk's payload creator and store result
      const typedAction = action as Action & {
        meta: {
          payloadCreator: (
            arg: unknown,
            thunkAPI: { extra: TExtra; getState: () => TState }
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
