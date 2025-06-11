import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

type GraphicsState = {
  availableFiles: string[]
  selectedFile: string | null
  imageData: ImageData | null
  loadingState: 'idle' | 'loading' | 'error'
  error: string | null
}

const initialState: GraphicsState = {
  availableFiles: [
    'continuum_title_page.pict',
    'gw_figures_in_grid.mac',
    'gw_figures_in_grid_paintings.mac',
    'gw_figures_paintings.mac',
    'gw_look.mac',
    'gw_new_figs.mac',
    'gw_screen_top.mac',
    'gw_title_screen.mac',
    'gravity_well_ships.mac',
    'menu_bar_docs.mac',
    'new_bunkers.mac',
    'new_screen_top.mac',
    'newbitmaps.mac',
    'old_gw_figures_in_grid.mac',
    'planet_globals_docs.mac',
    'rsrc_261.bin',
    'rsrc_261.raw',
    'startup_screen.mac',
    'title_screen_paintings.mac'
  ],
  selectedFile: null,
  imageData: null,
  loadingState: 'idle',
  error: null
}

export const loadGraphicsFile = createAsyncThunk(
  'graphics/loadFile',
  async (fileName: string) => {
    const response = await fetch(`/src/assets/graphics/${fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to load graphics file: ${fileName}`)
    }

    const arrayBuffer = await response.arrayBuffer()

    // Dynamically import the appropriate decoder
    const {
      macPaintToImageData,
      expandTitlePageToImageData,
      rawBitmapToImageData
    } = await import('@/art/utils')
    
    const { continuumTitlePictToImageData } = await import('@/art/continuumTitlePict')

    let imageData: ImageData

    if (fileName === 'continuum_title_page.pict') {
      // Continuum PICT variant decoder
      imageData = continuumTitlePictToImageData(arrayBuffer)
    } else if (fileName === 'rsrc_261.bin') {
      // Special decoder for compressed title page
      const imageDataArray = expandTitlePageToImageData(arrayBuffer)
      imageData = new ImageData(imageDataArray, 512, 342)
    } else if (
      fileName === 'rsrc_261.raw' ||
      fileName === 'startup_screen.mac'
    ) {
      // Raw uncompressed bitmap data
      const imageDataArray = rawBitmapToImageData(arrayBuffer)
      imageData = new ImageData(imageDataArray, 512, 342)
    } else {
      // Standard MacPaint decoder
      const imageDataArray = macPaintToImageData(arrayBuffer)
      imageData = new ImageData(imageDataArray, 576, 720)
    }

    return { fileName, imageData }
  }
)

const graphicsSlice = createSlice({
  name: 'graphics',
  initialState,
  reducers: {
    selectFile: (state, action: PayloadAction<string>) => {
      state.selectedFile = action.payload
    },
    clearSelection: state => {
      state.selectedFile = null
      state.imageData = null
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadGraphicsFile.pending, state => {
        state.loadingState = 'loading'
        state.error = null
      })
      .addCase(loadGraphicsFile.fulfilled, (state, action) => {
        state.loadingState = 'idle'
        state.selectedFile = action.payload.fileName
        state.imageData = action.payload.imageData
      })
      .addCase(loadGraphicsFile.rejected, (state, action) => {
        state.loadingState = 'error'
        state.error = action.error.message || 'Failed to load graphics'
      })
  }
})

export const { selectFile, clearSelection } = graphicsSlice.actions
export default graphicsSlice.reducer

