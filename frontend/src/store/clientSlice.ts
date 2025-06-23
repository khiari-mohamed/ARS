// src/store/clientSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as clientService from '../services/clientService';
import { Client } from '../types/client.d';

export const getClients = createAsyncThunk('clients/getClients', clientService.fetchClients);
export const getClient = createAsyncThunk('clients/getClient', clientService.fetchClient);
export const addClient = createAsyncThunk('clients/addClient', clientService.createClient);
export const editClient = createAsyncThunk('clients/editClient', ({ id, data }: { id: string, data: Partial<Client> }) =>
  clientService.updateClient(id, data)
);
export const removeClient = createAsyncThunk('clients/removeClient', clientService.deleteClient);

const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    list: [] as Client[],
    current: null as Client | null,
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getClients.pending, (state) => { state.loading = true; })
      .addCase(getClients.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(getClients.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch clients';
        state.loading = false;
      });
    // ...repeat for other thunks
  },
});

export default clientSlice.reducer;