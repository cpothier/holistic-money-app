import axios from 'axios';
import { FinancialData, FinancialDataResponse, FinancialComment } from '../interfaces/FinancialData';

// Replace with your actual API endpoint
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Interface for client data
export interface Client {
  client_id: string;
  client_name: string;
  bigquery_dataset: string;
  comments_table_name: string;
  created_at: string;
  updated_at: string;
}

// Fetch all clients
export const fetchClients = async (): Promise<Client[]> => {
  try {
    const response = await apiClient.get('/clients');
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

// Fetch financial data with optional date filter and client
export const fetchFinancialData = async (month?: string, client?: string): Promise<FinancialDataResponse> => {
  try {
    const response = await apiClient.get('/financial-data', { 
      params: { month, client } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching financial data:', error);
    throw error;
  }
};

// Add a comment to a financial line item
export const addComment = async (
  entry_id: string, 
  comment_text: string, 
  created_by: string,
  client: string
): Promise<FinancialComment> => {
  try {
    const response = await apiClient.post('/financial-comments', { 
      entry_id, 
      comment_text, 
      created_by,
      client
    });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Update an existing comment - now using entry_id
export const updateComment = async (
  entry_id: string, 
  comment_text: string,
  client: string
): Promise<FinancialComment> => {
  try {
    const response = await apiClient.patch(`/financial-comments/${entry_id}`, { 
      comment_text,
      client
    });
    return response.data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}; 