import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  recentCalls: [],
  isLoading: false,
  isError: false,
  message: "",
};

export const fetchRecentCalls = createAsyncThunk(
  "calls/fetchRecent",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      if (!token) {
        return thunkAPI.rejectWithValue("Not logged in");
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.get(
        "http://127.0.0.1:5000/api/calls/recent",
        config
      );

      return response.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const callSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    clearCalls: (state) => {
      state.recentCalls = [];
      state.isLoading = false;
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecentCalls.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRecentCalls.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recentCalls = action.payload;
        state.isError = false;
      })
      .addCase(fetchRecentCalls.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { clearCalls } = callSlice.actions;
export default callSlice.reducer;
