import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack trace:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          p={3}
        >
          <Paper 
            elevation={3}
            sx={{ 
              p: 4,
              maxWidth: '800px',
              width: '100%'
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              An error occurred while rendering the application.
            </Typography>
            
            <Box mt={3} mb={3}>
              <Typography variant="h6">Error details:</Typography>
              <Typography 
                variant="body2" 
                component="pre" 
                sx={{ 
                  p: 2, 
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  overflow: 'auto'
                }}
              >
                {this.state.error?.toString()}
              </Typography>
            </Box>
            
            {this.state.errorInfo && (
              <Box mb={3}>
                <Typography variant="h6">Component stack:</Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            
            <Box display="flex" justifyContent="space-between">
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
              
              <Button 
                variant="outlined"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
              >
                Clear Cache & Reload
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 