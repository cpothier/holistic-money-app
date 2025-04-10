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
  status: 'active' | 'inactive';
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

export const addComment = async (entry_id: string, comment_text: string, client_name: string): Promise<void> => {
  if (!comment_text.trim()) {
    throw new Error('Comment text cannot be empty');
  }

  console.log('Adding comment with params:', {
    entry_id,
    comment_text,
    client_name,
    request_body: {
      entry_id,
      comment_text,
      client: client_name,
      created_by: 'User'
    }
  });
  await api.post('/api/financial-comments', {
    entry_id,
    comment_text,
    client: client_name,
    created_by: 'User'
  });
};

export const updateComment = async (entry_id: string, comment: string, client_name: string): Promise<Comment> => {
  const response = await api.patch(`/api/financial-comments/${entry_id}`, { 
    comment_text: comment,
    client: client_name,
    created_by: 'User' // TODO: Get actual user from auth context
  });
  return response.data;
};

export const deleteComment = async (entry_id: string, client_name: string): Promise<void> => {
  console.log('Deleting comment with params:', {
    entry_id,
    client_name
  });
  await api.patch(`/api/financial-comments/${entry_id}`, {
    comment_text: '[DELETED]',
    client: client_name
  });
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

export const getFinancialData = async (client: string = 'austin_lifestyler', month?: string): Promise<FinancialData[]> => {
  try {
    const url = `/api/financial-data?client=${client}${month ? `&month=${month}` : ''}`;
    const response = await api.get<FinancialDataResponse>(url);
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

export const addClient = async (client: Omit<Client, 'client_id' | 'created_at' | 'updated_at'>): Promise<Client> => {
  try {
    const response = await api.post('/api/clients', client);
    return response.data;
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

export const deleteClient = async (clientId: string): Promise<void> => {
  try {
    await api.delete(`/api/clients/${clientId}`);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}; 