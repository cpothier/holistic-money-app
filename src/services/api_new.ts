import axios from 'axios';
import { FinancialData, FinancialDataResponse } from '../interfaces/FinancialData';

// Set API URL based on environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

console.log('Environment:', process.env.NODE_ENV);
console.log('API URL:', API_URL);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

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
  timeout: 5000, // 5 second timeout
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Making request to:', `${config.baseURL}${config.url}`);
  console.log('Current token:', token ? 'Present' : 'Missing');
  console.log('Request headers:', config.headers);
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No authentication token found - request may fail');
    // Only redirect for protected routes, not for login or clients list
    if (config.url?.startsWith('/api/financial-data')) {
      console.warn('Redirecting to login page');
      window.location.href = '/login';
    }
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('Received response from:', response.config.url);
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server not responding:', {
        url: error.config.url,
        timeout: error.config.timeout
      });
    } else if (error.response) {
      console.error('API Error Response:', {
        url: error.config.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      if (error.response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      console.error('No response received for request:', {
        url: error.config.url,
        method: error.config.method,
        request: error.request
      });
    } else {
      console.error('Error setting up request:', {
        url: error.config.url,
        method: error.config.method,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

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
  await api.delete(`/api/financial-comments/${entry_id}`, {
    data: { client: client_name }
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

export const getFinancialData = async (clientName: string, month: string): Promise<FinancialDataResponse> => {
  try {
    console.log('Making request with params:', { client: clientName, month });
    const response = await api.get('/api/financial-data', {
      params: { client: clientName, month }
    });

    console.log('Raw API response status:', response.status);
    console.log('Raw API response headers:', response.headers);
    console.log('Response data (stringified):', JSON.stringify(response.data, null, 2));
    console.log('Response data type:', typeof response.data);
    
    const structureCheck = {
      isNull: response.data === null,
      isUndefined: response.data === undefined,
      isObject: typeof response.data === 'object',
      hasData: response.data && 'data' in response.data,
      dataType: response.data?.data ? typeof response.data.data : 'missing',
      isDataArray: response.data?.data ? Array.isArray(response.data.data) : false,
      hasTotalActual: response.data && 'totalActual' in response.data,
      hasTotalBudget: response.data && 'totalBudget' in response.data
    };
    
    console.log('Response data structure check:', structureCheck);

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid response structure. Detailed diagnosis:', {
        responseDataExists: !!response.data,
        responseDataIsObject: response.data && typeof response.data === 'object',
        responseDataDataExists: response.data && 'data' in response.data,
        responseDataDataIsArray: response.data && 'data' in response.data && Array.isArray(response.data.data),
        responseDataKeys: response.data ? Object.keys(response.data) : [],
        responseData: response.data
      });
      throw new Error('Invalid data format received');
    }

    // Log the first item in the data array to check its structure
    if (response.data.data.length > 0) {
      console.log('First data item:', response.data.data[0]);
      console.log('First item structure:', {
        hasEntryId: 'entry_id' in response.data.data[0],
        hasOrderingId: 'ordering_id' in response.data.data[0],
        hasTxnDate: 'txnDate' in response.data.data[0],
        hasParentAccount: 'parent_account' in response.data.data[0],
        hasSubAccount: 'sub_account' in response.data.data[0],
        hasChildAccount: 'child_account' in response.data.data[0],
        hasActual: 'actual' in response.data.data[0],
        hasBudgetAmount: 'budget_amount' in response.data.data[0]
      });
    }

    // Validate and transform the data
    const validatedData = response.data.data.map((item: any) => {
      // Log the item before validation
      console.log('Processing item:', item);
      
      // Ensure txnDate is in the correct format
      let txnDate;
      if (typeof item.txnDate === 'object' && item.txnDate !== null) {
        // If it's already in the correct format, use it as is
        txnDate = item.txnDate;
      } else if (typeof item.txnDate === 'string') {
        // If it's a string, wrap it in an object
        txnDate = { value: item.txnDate };
      } else {
        // If it's null or undefined, use an empty string
        txnDate = { value: '' };
      }

      // Create a new object with only the required properties
      const validatedItem: FinancialData = {
        entry_id: String(item.entry_id || ''),
        ordering_id: String(item.ordering_id || ''),
        txnDate,
        parent_account: String(item.parent_account || ''),
        sub_account: item.sub_account ? String(item.sub_account) : null,
        child_account: item.child_account ? String(item.child_account) : null,
        actual: Number(item.actual) || 0,
        budget_amount: Number(item.budget_amount) || 0,
        comment_text: item.comment_text || undefined,
        comment_by: item.comment_by || undefined,
        comment_date: item.comment_date || undefined,
        comment_id: item.comment_id || undefined
      };

      // Log the validated item
      console.log('Validated item:', validatedItem);
      
      return validatedItem;
    });

    // Calculate totals
    const totalActual = validatedData.reduce((sum: number, item: FinancialData) => sum + item.actual, 0);
    const totalBudget = validatedData.reduce((sum: number, item: FinancialData) => sum + item.budget_amount, 0);

    return {
      data: validatedData,
      totalActual,
      totalBudget
    };
  } catch (error) {
    console.error('Error in getFinancialData:', error);
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