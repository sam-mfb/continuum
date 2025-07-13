import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { WallsState, LineRec } from './types'
import { LINE_KIND } from '../shared/types/line'
import { initWalls as initWallsImpl } from './init'

const initialState: WallsState = {
  organizedWalls: {},
  kindPointers: {
    [LINE_KIND.NORMAL]: null,
    [LINE_KIND.BOUNCE]: null,
    [LINE_KIND.GHOST]: null,
    [LINE_KIND.EXPLODE]: null,
  },
  firstWhite: '',
  junctions: [],
  whites: [],
  updatedWalls: []
}

export const wallsSlice = createSlice({
  name: 'walls',
  initialState,
  reducers: {
    /**
     * Initialize walls from parsed level data.
     */
    initWalls: (_state, action: PayloadAction<{ walls: LineRec[] }>) => {
      return initWallsImpl(action.payload.walls)
    },

    /**
     * Update which walls are visible based on screen position
     */
    updateWallVisibility: (
      _state,
      _action: PayloadAction<{
        screenLeft: number
        screenRight: number
        worldWidth: number
      }>
    ) => {
      // TODO: Mark visible walls for current frame
      // TODO: Handle world wrapping
    },

    /**
     * Clear all wall data (for level changes)
     */
    clearWalls: state => {
      state.organizedWalls = {}
      state.kindPointers = {
        [LINE_KIND.NORMAL]: null,
        [LINE_KIND.BOUNCE]: null,
        [LINE_KIND.GHOST]: null,
        [LINE_KIND.EXPLODE]: null,
          }
      state.firstWhite = ''
      state.junctions = []
      state.whites = []
      state.updatedWalls = []
    }
  }
})

export const { initWalls, updateWallVisibility, clearWalls } =
  wallsSlice.actions
