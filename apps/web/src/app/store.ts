import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

// Placeholder slice to satisfy Redux store requirement
const appSlice = createSlice({
  name: 'app',
  initialState: { ready: false },
  reducers: {
    setReady(state) { state.ready = true; },
  },
});

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
