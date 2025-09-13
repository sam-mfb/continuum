import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { GalaxyHeader } from '@core/galaxy'
import { getGalaxyService } from '@core/galaxy'
import type { PlanetState } from '@core/planet'

type GalaxyState = {
  loadedGalaxy: GalaxyHeader | null
  planets: PlanetState[]
  selectedPlanetIndex: number | null
  loadingState: 'idle' | 'loading' | 'error'
  error: string | null
  displayMode: 'map' | 'game'
}

const initialState: GalaxyState = {
  loadedGalaxy: null,
  planets: [],
  selectedPlanetIndex: null,
  loadingState: 'idle',
  error: null,
  displayMode: 'map'
}

export const loadGalaxyFile = createAsyncThunk(
  'galaxy/loadFile',
  async (fileName: 'continuum_galaxy.bin' | 'release_galaxy.bin') => {
    const galaxyService = getGalaxyService()

    // Load galaxy using the service
    const galaxyHeader = await galaxyService.loadGalaxy(`/art/${fileName}`)

    // Get all planets for dev display
    const planets = galaxyService.getAllPlanets()

    return { galaxyHeader, planets }
  }
)

const galaxySlice = createSlice({
  name: 'galaxy',
  initialState,
  reducers: {
    selectPlanet: (state, action: PayloadAction<number>) => {
      state.selectedPlanetIndex = action.payload
    },
    clearSelection: state => {
      state.selectedPlanetIndex = null
    },
    toggleDisplayMode: state => {
      state.displayMode = state.displayMode === 'map' ? 'game' : 'map'
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadGalaxyFile.pending, state => {
        state.loadingState = 'loading'
        state.error = null
      })
      .addCase(loadGalaxyFile.fulfilled, (state, action) => {
        state.loadingState = 'idle'
        state.loadedGalaxy = action.payload.galaxyHeader
        state.planets = action.payload.planets
        state.selectedPlanetIndex = null
      })
      .addCase(loadGalaxyFile.rejected, (state, action) => {
        state.loadingState = 'error'
        state.error = action.error.message || 'Failed to load galaxy'
      })
  }
})

export const { selectPlanet, clearSelection, toggleDisplayMode } =
  galaxySlice.actions
export default galaxySlice.reducer
