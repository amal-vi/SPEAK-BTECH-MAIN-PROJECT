import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth-slice/authSlice";
import usersReducer from './users-slice/usersSlice'; 
import callReducer from './call-slice/callSlice'; // <-- 1. Import

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer, 
    calls: callReducer,
  },
});
