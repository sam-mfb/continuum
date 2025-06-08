import { createSlice } from '@reduxjs/toolkit'
import type { ScreenState } from './types'

const initialState: ScreenState = {
  screenx: 0,
  screeny: 0
}

export const screenSlice = createSlice({
  name: 'screen',
  initialState,
  reducers: {}
})

export default screenSlice.reducer