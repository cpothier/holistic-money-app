import axios from 'axios';
import { FinancialData, FinancialDataResponse } from '../interfaces/FinancialData';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface Comment {
  id: number;
  client_name: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  client_id: string;
  client_name: string;
  bigquery_dataset: string;
  comments_table_name: string;
  created_at: string;
  updated_at: string;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getComments = async (clientName: string): Promise<Comment[]> => {
  const response = await api.get(`/api/comments?client=${clientName}`);
  return response.data;
};

export const addComment = async (clientName: string, comment: string): Promise<Comment> => {
  const response = await api.post('/api/comments', { client_name: clientName, comment });
  return response.data;
};

export const updateComment = async (id: number, comment: string): Promise<Comment> => {
  const response = await api.put(`/api/comments/${id}`, { comment });
  return response.data;
};

export const deleteComment = async (id: number): Promise<void> => {
  await api.delete(`/api/comments/${id}`);
};

export const login = async (email: string, password: string): Promise<{ token: string }> => {
  const response = await api.post('/api/login', { email, password });
  return response.data;
};

export const validateToken = async (): Promise<boolean> => {
  try {
    await api.get('/api/validate-token');
    return true;
  } catch (error) {
    return false;
  }
};

export const getFinancialData = async (client: string = 'austin_lifestyler'): Promise<FinancialData[]> => {
  try {
    const response = await api.get<FinancialDataResponse>(`/api/financial-data?client=${client}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching financial data:', error);
    throw error;
  }
};

export const fetchClients = async (): Promise<Client[]> => {
  try {
    const response = await api.get('/api/clients');
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}); 