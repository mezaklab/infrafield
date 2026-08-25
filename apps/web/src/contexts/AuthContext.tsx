import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { setSocketAuthToken } from '../services/socket';
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
  isActive?: boolean;
  accessRole?: { id: string; key: string; name: string } | null;
  permissions?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;   // SUPERADMIN only
  isAdmin: boolean;        // SUPERADMIN or ADMIN
  isManager: boolean;      // SUPERADMIN, ADMIN or MANAGER
  isTechnician: boolean;   // TECHNICIAN
  isFinalUser: boolean;    // USUARIO
  canAccessAdmin: boolean; // SUPERADMIN or ADMIN
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'infrafield_token';
const USER_KEY  = 'infrafield_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Leitura síncrona imediata do localStorage na inicialização do estado
  const [token, setToken] = useState<string | null>(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        return storedToken;
      }
    } catch (e) {
      console.error('Erro ao ler token:', e);
    }
    return null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Erro ao ler usuário:', e);
    }
    return null;
  });

  const [isLoading] = useState<boolean>(false);

  // Sync axios default header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Escuta o evento disparado pelo interceptor do Axios quando a API retorna
  // 401 ou mensagem de token inválido/expirado — faz logout automaticamente.
  useEffect(() => {
    const handleUnauthorized = () => {
      // logout() já limpa o localStorage; aqui apenas sincroniza o estado React
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    const response = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier: username, password, rememberMe });
    const { token: newToken, user: newUser } = response.data;

    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Clear both storages first to prevent stale data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    storage.setItem(TOKEN_KEY, newToken);
    storage.setItem(USER_KEY, JSON.stringify(newUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setSocketAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setSocketAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !isLoading && !!user && !!token;
  const isSuperAdmin   = user?.role === 'SUPERADMIN';
  const isAdmin        = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
  const isManager      = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isTechnician   = user?.role === 'TECHNICIAN';
  const isFinalUser    = user?.role === 'USUARIO';
  const canAccessAdmin = isSuperAdmin || isAdmin;
  const hasPermission = (permission: string) => Boolean(isSuperAdmin || user?.permissions?.includes('*') || user?.permissions?.includes(permission));

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, isSuperAdmin, isAdmin, isManager, isTechnician, isFinalUser, canAccessAdmin, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
