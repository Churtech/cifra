import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
