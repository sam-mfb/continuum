import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { AllSprites, BunkerKind } from '@/figs/types'
import { extractAllSprites } from '@/figs'

export type SpriteType = 'ship' | 'bunker' | 'fuel' | 'shard' | 'crater' | 'shield' | 'flame' | 'strafe' | 'digit'

type SpritesState = {
  // Sprite data
  allSprites: AllSprites | null
  loadingState: 'idle' | 'loading' | 'error'
  error: string | null
  
  // View configuration
  selectedType: SpriteType
  showMask: boolean
  rotation: number
  scale: number
  
  // Type-specific settings
  bunkerKind: BunkerKind
  bunkerVariation: number
  fuelFrame: number
  shardKind: number
  flameFrame: number
  strafeFrame: number
  digitChar: string
}

const initialState: SpritesState = {
  allSprites: null,
  loadingState: 'idle',
  error: null,
  
  selectedType: 'ship',
  showMask: false,
  rotation: 0,
  scale: 4,
  
  bunkerKind: 0,
  bunkerVariation: 0,
  fuelFrame: 0,
  shardKind: 0,
  flameFrame: 0,
  strafeFrame: 0,
  digitChar: '0'
}

// Async thunk to load sprites
export const loadSprites = createAsyncThunk(
  'sprites/loadSprites',
  async () => {
    const response = await fetch('/src/assets/graphics/rsrc_260.bin')
    if (!response.ok) {
      throw new Error('Failed to load sprite resource')
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const sprites = extractAllSprites(arrayBuffer)
    return sprites
  }
)

const spritesSlice = createSlice({
  name: 'sprites',
  initialState,
  reducers: {
    setSelectedType: (state, action: PayloadAction<SpriteType>) => {
      state.selectedType = action.payload
      // Reset rotation when changing type
      state.rotation = 0
    },
    
    toggleMask: (state) => {
      state.showMask = !state.showMask
    },
    
    setRotation: (state, action: PayloadAction<number>) => {
      state.rotation = action.payload
    },
    
    setScale: (state, action: PayloadAction<number>) => {
      state.scale = Math.max(1, Math.min(8, action.payload))
    },
    
    setBunkerKind: (state, action: PayloadAction<BunkerKind>) => {
      state.bunkerKind = action.payload
      // Reset rotation when changing bunker kind
      state.rotation = 0
    },
    
    setBunkerVariation: (state, action: PayloadAction<number>) => {
      state.bunkerVariation = action.payload
    },
    
    setFuelFrame: (state, action: PayloadAction<number>) => {
      state.fuelFrame = action.payload
    },
    
    setShardKind: (state, action: PayloadAction<number>) => {
      state.shardKind = action.payload
    },
    
    setFlameFrame: (state, action: PayloadAction<number>) => {
      state.flameFrame = action.payload
    },
    
    setStrafeFrame: (state, action: PayloadAction<number>) => {
      state.strafeFrame = action.payload
    },
    
    setDigitChar: (state, action: PayloadAction<string>) => {
      state.digitChar = action.payload
    }
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(loadSprites.pending, (state) => {
        state.loadingState = 'loading'
        state.error = null
      })
      .addCase(loadSprites.fulfilled, (state, action) => {
        state.loadingState = 'idle'
        state.allSprites = action.payload
      })
      .addCase(loadSprites.rejected, (state, action) => {
        state.loadingState = 'error'
        state.error = action.error.message || 'Failed to load sprites'
      })
  }
})

export const {
  setSelectedType,
  toggleMask,
  setRotation,
  setScale,
  setBunkerKind,
  setBunkerVariation,
  setFuelFrame,
  setShardKind,
  setFlameFrame,
  setStrafeFrame,
  setDigitChar
} = spritesSlice.actions

export default spritesSlice.reducer