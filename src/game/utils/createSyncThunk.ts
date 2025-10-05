import { createAction, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState, GameServices } from '../store'

/**
 * Action type returned by sync thunk after middleware processes it
 */
export type SyncThunkAction<Returned, ThunkArg = void> = PayloadAction<
  ThunkArg extends void ? undefined : ThunkArg,
  string,
  {
    payloadCreator: (
      arg: ThunkArg,
      thunkAPI: { extra: GameServices; getState: () => RootState }
    ) => Returned
    result: Returned
  }
>

type PrepareAction<Returned, ThunkArg> = ThunkArg extends void
  ? {
      (): PayloadAction<
        undefined,
        string,
        {
          payloadCreator: (thunkAPI: {
            extra: GameServices
            getState: () => RootState
          }) => Returned
        }
      >
    }
  : {
      (arg: ThunkArg): PayloadAction<
        ThunkArg,
        string,
        {
          payloadCreator: (
            arg: ThunkArg,
            thunkAPI: {
              extra: GameServices
              getState: () => RootState
            }
          ) => Returned
        }
      >
    }

type ActionCreatorWithResult<Returned, ThunkArg> = ThunkArg extends void
  ? {
      (): SyncThunkAction<Returned, ThunkArg>
      type: string
      match: (
        action: unknown
      ) => action is ReturnType<PrepareAction<Returned, ThunkArg>>
    }
  : {
      (arg: ThunkArg): SyncThunkAction<Returned, ThunkArg>
      type: string
      match: (
        action: unknown
      ) => action is ReturnType<PrepareAction<Returned, ThunkArg>>
    }

/**
 * Creates a synchronous thunk action creator with dependency injection.
 * Similar to createAsyncThunk but executes synchronously.
 */
export function createSyncThunk<Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreator: (
    arg: ThunkArg,
    thunkAPI: { extra: GameServices; getState: () => RootState }
  ) => Returned
): ActionCreatorWithResult<Returned, ThunkArg> {
  const baseActionCreator = createAction(typePrefix, ((arg: ThunkArg) => {
    return {
      payload: arg,
      meta: { payloadCreator }
    }
  }) as PrepareAction<Returned, ThunkArg>)

  // Cast to include result type that middleware will add
  return baseActionCreator as unknown as ActionCreatorWithResult<
    Returned,
    ThunkArg
  >
}
