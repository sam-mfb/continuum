/**
 * @fileoverview Generic synchronous thunk creator builder
 *
 * Provides a factory function to create type-safe synchronous thunks
 * for any state shape and services configuration.
 */

import { createAction, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Action type returned by sync thunk after middleware processes it
 */
export type SyncThunkAction<
  TState,
  TServices,
  Returned,
  ThunkArg = void
> = PayloadAction<
  ThunkArg extends void ? undefined : ThunkArg,
  string,
  {
    payloadCreator: (
      arg: ThunkArg,
      thunkAPI: { extra: TServices; getState: () => TState }
    ) => Returned
    result: Returned
  }
>

type PrepareAction<TState, TServices, Returned, ThunkArg> =
  ThunkArg extends void
    ? {
        (): PayloadAction<
          undefined,
          string,
          {
            payloadCreator: (thunkAPI: {
              extra: TServices
              getState: () => TState
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
                extra: TServices
                getState: () => TState
              }
            ) => Returned
          }
        >
      }

type ActionCreatorWithResult<TState, TServices, Returned, ThunkArg> =
  ThunkArg extends void
    ? {
        (): SyncThunkAction<TState, TServices, Returned, ThunkArg>
        type: string
        match: (
          action: unknown
        ) => action is ReturnType<
          PrepareAction<TState, TServices, Returned, ThunkArg>
        >
      }
    : {
        (arg: ThunkArg): SyncThunkAction<TState, TServices, Returned, ThunkArg>
        type: string
        match: (
          action: unknown
        ) => action is ReturnType<
          PrepareAction<TState, TServices, Returned, ThunkArg>
        >
      }

/**
 * Builds a createSyncThunk function for specific state and services types
 *
 * @example
 * ```typescript
 * const createGameSyncThunk = buildCreateSyncThunk<RootState, GameServices>()
 *
 * const myThunk = createGameSyncThunk<number>(
 *   'myThunk',
 *   (_, { getState, extra }) => {
 *     return getState().someValue + extra.someService.getValue()
 *   }
 * )
 * ```
 */
export function buildCreateSyncThunk<TState, TServices>() {
  return function createSyncThunk<Returned, ThunkArg = void>(
    typePrefix: string,
    payloadCreator: (
      arg: ThunkArg,
      thunkAPI: { extra: TServices; getState: () => TState }
    ) => Returned
  ): ActionCreatorWithResult<TState, TServices, Returned, ThunkArg> {
    const baseActionCreator = createAction(typePrefix, ((arg: ThunkArg) => {
      return {
        payload: arg,
        meta: { payloadCreator }
      }
    }) as PrepareAction<TState, TServices, Returned, ThunkArg>)

    // Cast to include result type that middleware will add
    return baseActionCreator as unknown as ActionCreatorWithResult<
      TState,
      TServices,
      Returned,
      ThunkArg
    >
  }
}
