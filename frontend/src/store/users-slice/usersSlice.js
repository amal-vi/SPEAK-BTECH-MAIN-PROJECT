import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  onlineUsersList: [],
  isLoading: true,
  incomingCallData: null,
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
    setIncomingCall: (state, action) => {
      state.incomingCallData = action.payload;
    },
    clearIncomingCall: (state) => {
      state.incomingCallData = null;
    },
  },
});

export const {
  setOnlineUsers,
  startLoadingOnlineUsers,
  setIncomingCall,
  clearIncomingCall,
} = usersSlice.actions;
export default usersSlice.reducer;
