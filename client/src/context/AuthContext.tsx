import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setToken(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with backend
        const response = await fetch('http://localhost:3001/api/validate-token', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          // Token is invalid
          localStorage.removeItem('token');
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, []);

  const handleSetToken = async (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      try {
        // Validate the new token
        const response = await fetch('http://localhost:3001/api/validate-token', {
          headers: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        
        setIsAuthenticated(response.ok);
        
        if (!response.ok) {
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
      }
    } else {
      localStorage.removeItem('token');
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      setToken: handleSetToken, 
      isAuthenticated,
      isLoading,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 