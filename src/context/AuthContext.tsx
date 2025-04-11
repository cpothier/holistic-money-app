import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken } from '../services/api_new';

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
    const validateAuthToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setToken(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const isValid = await validateToken();
        if (isValid) {
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

    validateAuthToken();
  }, []);

  const handleSetToken = async (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      try {
        const isValid = await validateToken();
        setIsAuthenticated(isValid);
        
        if (!isValid) {
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
    <AuthContext.Provider
      value={{
        token,
        setToken: handleSetToken,
        isAuthenticated,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 