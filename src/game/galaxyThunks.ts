/**
 * @fileoverview Async thunks for galaxy operations
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import type { GameServices } from './store'
import type { RootState } from './store'
import { getGalaxyById } from './galaxyConfig'
import { setCurrentGalaxy, setTotalLevels } from './appSlice'

/**
 * Load a new galaxy by ID
 * This uses the existing GalaxyService's loadGalaxy method to switch galaxies
 */
export const loadGalaxy = createAsyncThunk<
  {
    galaxyId: string
    totalLevels: number
  },
  string,
  { state: RootState; extra: GameServices }
>('galaxy/load', async (galaxyId, { dispatch, extra }) => {
  // Get galaxy config
  const galaxyConfig = getGalaxyById(galaxyId)
  if (!galaxyConfig) {
    throw new Error(`Galaxy with ID '${galaxyId}' not found`)
  }

  // Use the existing galaxy service to load the new galaxy
  const { galaxyService } = extra
  await galaxyService.loadGalaxy(galaxyConfig.path)

  // Get total levels from the newly loaded galaxy
  const totalLevels = galaxyService.getHeader().planets

  // Update current galaxy and total levels in app state
  dispatch(setCurrentGalaxy(galaxyId))
  dispatch(setTotalLevels(totalLevels))

  return {
    galaxyId,
    totalLevels
  }
})
