import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Holistic Money App
        </Typography>
        <Typography variant="body1" paragraph>
          Select an option below to get started:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/financial')}
          >
            View Client P&L Analysis
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/clients')}
          >
            Manage Clients
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard; 