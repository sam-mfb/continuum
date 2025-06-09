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
    'continuum_title_page.mac',
    'gw_figures_in_grid.mac',
    'gw_look.mac',
    'gw_new_figs.mac',
    'gw_screen_top.mac',
    'gw_title_screen.mac',
    'new_screen_top.mac',
    'old_gw_figures_in_grid.mac'
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
    
    // Dynamically import the macPaintToImageData function
    const { macPaintToImageData } = await import('@/art/utils')
    const imageDataArray = macPaintToImageData(arrayBuffer)
    
    // Create ImageData object (576x720 for MacPaint files)
    const imageData = new ImageData(imageDataArray, 576, 720)
    
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