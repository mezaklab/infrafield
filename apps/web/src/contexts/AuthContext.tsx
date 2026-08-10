import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Location } from '../types';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  company: { id: string; name: string };
  locationId?: string;
  location?: Location;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;   // SUPERADMIN only
  isAdmin: boolean;        // SUPERADMIN or ADMIN
  isManager: boolean;      // SUPERADMIN, ADMIN or MANAGER
  isTechnician: boolean;   // TECHNICIAN
  isFinalUser: boolean;    // USUARIO
  canAccessAdmin: boolean; // SUPERADMIN or ADMIN
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'infrafield_token';
const USER_KEY  = 'infrafield_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  // Sync axios default header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier: username, password });
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!user && !!token;
  const isSuperAdmin   = user?.role === 'SUPERADMIN';
  const isAdmin        = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
  const isManager      = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isTechnician   = user?.role === 'TECHNICIAN';
  const isFinalUser    = user?.role === 'USUARIO';
  const canAccessAdmin = isSuperAdmin || isAdmin;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isSuperAdmin, isAdmin, isManager, isTechnician, isFinalUser, canAccessAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
