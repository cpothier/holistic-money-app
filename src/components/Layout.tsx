import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Button, IconButton } from '@mui/material';
import { Logout as LogoutIcon, Assessment as AssessmentIcon, People as PeopleIcon } from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'hsla(38.18181818,26.82926829%,91.96078431%,1)',
    }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ 
          minHeight: 120,
          px: { xs: 4, sm: 6 },
          backgroundColor: 'hsla(38.18181818,26.82926829%,91.96078431%,1)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              component="img"
              src="/holistic-money-logo.png"
              alt="Holistic Money Logo"
              sx={{
                height: 48,
                mr: 2,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/financial')} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                fontSize: '1rem',
                color: 'hsla(209.14285714,21.47239264%,31.96078431%,1)',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.05)'
                }
              }}
            >
              <AssessmentIcon sx={{ fontSize: '1.5rem' }} />
              Client P&L Analysis
            </Button>
            <Button 
              color="inherit" 
              onClick={() => navigate('/clients')} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                fontSize: '1rem',
                color: 'hsla(209.14285714,21.47239264%,31.96078431%,1)',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.05)'
                }
              }}
            >
              <PeopleIcon sx={{ fontSize: '1.5rem' }} />
              Clients
            </Button>
            <IconButton 
              color="inherit" 
              onClick={handleLogout}
              sx={{ 
                color: 'hsla(209.14285714,21.47239264%,31.96078431%,1)',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.05)'
                }
              }}
            >
              <LogoutIcon sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3,
        backgroundColor: 'hsla(38.18181818,26.82926829%,91.96078431%,1)',
        minHeight: 'calc(100vh - 120px)'
      }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 