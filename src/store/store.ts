import { configureStore } from '@reduxjs/toolkit'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import uiReducer from './uiSlice'
import galaxyReducer from './galaxySlice'
import graphicsReducer from './graphicsSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    galaxy: galaxyReducer,
    graphics: graphicsReducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore ImageData in actions and state
        ignoredActions: ['graphics/loadFile/fulfilled'],
        ignoredPaths: ['graphics.imageData']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
