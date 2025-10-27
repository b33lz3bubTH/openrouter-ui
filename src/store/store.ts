import { configureStore } from '@reduxjs/toolkit';
import githubReducer from './githubSlice';
import chatPaginationReducer from './chatPaginationSlice';
import chatEventReducer from './chatEventSlice';

export const store = configureStore({
  reducer: {
    github: githubReducer,
    chatPagination: chatPaginationReducer,
    chatEvents: chatEventReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
