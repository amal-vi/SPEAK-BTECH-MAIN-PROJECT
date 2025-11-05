import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth-slice/authSlice";
import usersReducer from './users-slice/usersSlice'; 

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer, 
  },
});
