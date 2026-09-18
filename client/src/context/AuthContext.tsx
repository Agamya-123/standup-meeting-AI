import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, LookupResponse } from '../types';

interface RegisterCompanyPayload {
  companyName: string;
  companySlug?: string;
  adminName: string;
  adminEmail: string;
  adminEmployeeId?: string;
  password: string;
  domain?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string, companyId?: string) => Promise<void>;
  registerCompany: (data: RegisterCompanyPayload) => Promise<void>;
  lookupIdentifier: (identifier: string) => Promise<LookupResponse>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('standup_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      if (!localStorage.getItem('standup_token')) {
        setLoading(false);
        return;
      }
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch profile', error);
      localStorage.removeItem('standup_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (identifier: string, password: string, companyId?: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { identifier, password, companyId });
      const { token: jwtToken, user: userData } = response.data;
      localStorage.setItem('standup_token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
    } catch (error) {
      console.error('Login error', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (data: RegisterCompanyPayload) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register-company', data);
      const { token: jwtToken, user: userData } = response.data;
      localStorage.setItem('standup_token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
    } catch (error) {
      console.error('Register Company error', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const lookupIdentifier = async (identifier: string): Promise<LookupResponse> => {
    try {
      const response = await api.post('/auth/lookup-identifier', { identifier });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('standup_token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerCompany,
        lookupIdentifier,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
