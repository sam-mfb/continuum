import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { GalaxyHeader } from '@/galaxy/types'
import { Galaxy } from '@/galaxy/methods'
import { parsePlanet } from '@/planet/parsePlanet'
import type { PlanetState } from '@/planet/types'

type GalaxyState = {
  loadedGalaxy: GalaxyHeader | null
  planets: PlanetState[]
  selectedPlanetIndex: number | null
  loadingState: 'idle' | 'loading' | 'error'
  error: string | null
}

const initialState: GalaxyState = {
  loadedGalaxy: null,
  planets: [],
  selectedPlanetIndex: null,
  loadingState: 'idle',
  error: null
}

export const loadGalaxyFile = createAsyncThunk(
  'galaxy/loadFile',
  async (fileName: 'continuum_galaxy.bin' | 'release_galaxy.bin') => {
    const response = await fetch(`/src/assets/${fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to load galaxy file: ${fileName}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
    const galaxyHeader = Galaxy.parseHeader(headerBuffer)

    const planets: PlanetState[] = []
    for (let i = 0; i < galaxyHeader.planets; i++) {
      const planet = parsePlanet(planetsBuffer, galaxyHeader.indexes, i + 1)
      planets.push(planet)
    }

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

export const { selectPlanet, clearSelection } = galaxySlice.actions
export default galaxySlice.reducer
