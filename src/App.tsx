import React from 'react';
import './App.css';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  AppBar, 
  Toolbar, 
  Box,
  Tab,
  Tabs,
  Button,
  CircularProgress
} from '@mui/material';
import FinancialTable from './components/FinancialTable';
import AddClient from './components/AddClient';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#FFA48A', // Holistic Money peach/salmon color
    },
    secondary: {
      main: '#70A288', // Soft green complementary color
    },
    background: {
      default: '#FFFFFF',
      paper: '#F5F5F5',
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Navigation component
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Determine which tab is active based on the current path
  const getTabValue = () => {
    if (location.pathname.startsWith('/settings')) {
      return 1;
    }
    return 0;
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      navigate('/');
    } else {
      navigate('/settings');
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      '& .MuiTab-root': {
        color: '#606060',
        fontWeight: 500,
        textTransform: 'none',
        minWidth: 'auto',
        px: 2,
        '&.Mui-selected': {
          color: theme.palette.primary.main,
        },
      }
    }}>
      <Tabs 
        value={getTabValue()} 
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ 
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
          }
        }}
      >
        <Tab label="Client P&L Analysis" />
        <Tab label="Settings" />
      </Tabs>
      <Button 
        variant="outlined" 
        color="primary" 
        onClick={handleLogout}
        sx={{ ml: 2 }}
      >
        Logout
      </Button>
    </Box>
  );
};

// Main App component
const AppContent: React.FC = () => {
  const { setToken, isAuthenticated, isLoading } = useAuth();

  const handleLogin = (token: string) => {
    setToken(token);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppBar 
              position="static" 
              sx={{ 
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
                bgcolor: '#F5F5F5',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                py: 0.5,
              }}
              elevation={0}
            >
              <Toolbar>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexGrow: 1,
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}>
                    <img 
                      src="/holistic-money-logo.png" 
                      alt="Holistic Money" 
                      style={{ 
                        height: '44px', 
                        marginRight: '20px',
                        filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
                      }} 
                    />
                  </Box>
                  
                  <Navigation />
                </Box>
              </Toolbar>
            </AppBar>
            <Container maxWidth="xl">
              <Box sx={{ my: 4 }}>
                <FinancialTable />
              </Box>
            </Container>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppBar 
              position="static" 
              sx={{ 
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
                bgcolor: '#F5F5F5',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                py: 0.5,
              }}
              elevation={0}
            >
              <Toolbar>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexGrow: 1,
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}>
                    <img 
                      src="/holistic-money-logo.png" 
                      alt="Holistic Money" 
                      style={{ 
                        height: '44px', 
                        marginRight: '20px',
                        filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
                      }} 
                    />
                  </Box>
                  
                  <Navigation />
                </Box>
              </Toolbar>
            </AppBar>
            <Container maxWidth="xl">
              <Box sx={{ my: 4 }}>
                <AddClient />
              </Box>
            </Container>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
