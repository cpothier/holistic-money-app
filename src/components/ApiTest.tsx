import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';

// Get API URL from the same place as the rest of the app
let API_URL: string;
if (typeof window !== 'undefined') {
  const isVercel = window.location.hostname.includes('vercel.app');
  if (isVercel) {
    API_URL = 'https://holistic-money-backend-203ef9f87bb9.herokuapp.com';
  } else {
    API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';
  }
} else {
  API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';
}

// Interface for the health check response
interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  database: string;
  port: string;
  environment: string;
  cors_origin: string;
}

const ApiTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pingTime, setPingTime] = useState<number | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setPingTime(null);
    
    const startTime = Date.now();
    
    try {
      console.log('Testing API connection to:', `${API_URL}/api/health`);
      const result = await axios.get(`${API_URL}/api/health`, {
        timeout: 10000, // 10 second timeout
      });
      
      const endTime = Date.now();
      setPingTime(endTime - startTime);
      
      console.log('API response:', result.data);
      setResponse(result.data);
    } catch (err) {
      const endTime = Date.now();
      setPingTime(endTime - startTime);
      
      console.error('API test failed:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out after 10 seconds. The server might be down or unreachable.');
        } else if (err.response) {
          setError(`Server responded with status ${err.response.status}: ${err.response.statusText}`);
        } else if (err.request) {
          setError('No response received from the server. CORS or network issue might be blocking the request.');
        } else {
          setError(`Error setting up the request: ${err.message}`);
        }
      } else {
        setError(`Unexpected error: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Test the API automatically when the component mounts
  useEffect(() => {
    testApi();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          API Connection Test
        </Typography>
        
        <Typography variant="body1" gutterBottom>
          Testing connection to: <code>{API_URL}</code>
        </Typography>
        
        <Box sx={{ my: 2 }}>
          <Button 
            variant="contained" 
            onClick={testApi} 
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Test Connection'}
          </Button>
          
          {pingTime !== null && (
            <Typography variant="body2" component="span">
              Response time: {pingTime}ms
            </Typography>
          )}
        </Box>
        
        {error && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#FFEBEE', 
            borderRadius: 1,
            border: '1px solid #FFCDD2' 
          }}>
            <Typography variant="subtitle2" color="error">
              Error:
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Box>
        )}
        
        {response && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Response:
            </Typography>
            <Box 
              component="pre"
              sx={{ 
                p: 2, 
                bgcolor: '#F5F5F5', 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem'
              }}
            >
              {JSON.stringify(response, null, 2)}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ApiTest; 