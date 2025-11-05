import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  onlineUsersList: [],
  isLoading: true,
};

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsersList = action.payload;
      state.isLoading = false;
    },
    startLoadingOnlineUsers: (state) => {
      state.isLoading = true;
    },
  },
});

export const { setOnlineUsers, startLoadingOnlineUsers } = usersSlice.actions;
export default usersSlice.reducer;
