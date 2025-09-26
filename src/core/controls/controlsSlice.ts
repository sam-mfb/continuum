/**
 * @fileoverview Redux slice for managing control key bindings
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  ControlAction,
  type ControlBindings,
  type ControlsState
} from './types'

/**
 * Default control bindings matching the original game
 */
export const getDefaultBindings = (): ControlBindings => ({
  [ControlAction.THRUST]: 'Period',
  [ControlAction.LEFT]: 'KeyZ',
  [ControlAction.RIGHT]: 'KeyX',
  [ControlAction.FIRE]: 'Slash',
  [ControlAction.SHIELD]: 'Space',
  [ControlAction.SELF_DESTRUCT]: 'KeyA',
  [ControlAction.PAUSE]: 'KeyP',
  [ControlAction.QUIT]: 'KeyQ',
  [ControlAction.NEXT_LEVEL]: 'KeyU',
  [ControlAction.EXTRA_LIFE]: 'KeyE',
  [ControlAction.MAP]: 'KeyM'
})

const initialState: ControlsState = {
  bindings: getDefaultBindings()
}

export const controlsSlice = createSlice({
  name: 'controls',
  initialState,
  reducers: {
    /**
     * Set a single control binding
     */
    setBinding: (
      state,
      action: PayloadAction<{ action: ControlAction; key: string }>
    ) => {
      state.bindings[action.payload.action] = action.payload.key
    },

    /**
     * Set multiple bindings at once
     */
    setBindings: (state, action: PayloadAction<Partial<ControlBindings>>) => {
      state.bindings = {
        ...state.bindings,
        ...action.payload
      }
    },

    /**
     * Reset all bindings to defaults
     */
    resetBindings: state => {
      state.bindings = getDefaultBindings()
    },

    /**
     * Load bindings from storage (used on app startup)
     */
    loadBindings: (state, action: PayloadAction<ControlBindings>) => {
      state.bindings = action.payload
    }
  }
})

export const { setBinding, setBindings, resetBindings, loadBindings } =
  controlsSlice.actions
