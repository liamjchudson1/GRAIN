import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User, setAuthToken } from '../api';
import { storage } from '../storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { token: savedToken, user: savedUser } = await storage.getAuth();
      if (savedToken && savedUser) {
        setAuthToken(savedToken);
        setToken(savedToken);
        setUser(savedUser);
        // Refresh user data
        try {
          const freshUser = await api.me();
          setUser(freshUser);
          await storage.updateUser(freshUser);
        } catch {}
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u, token: t } = await api.login(email, password);
    setAuthToken(t);
    setToken(t);
    setUser(u);
    await storage.saveAuth(t, u);
  };

  const register = async (email: string, username: string, displayName: string, password: string) => {
    const { user: u, token: t } = await api.register(email, username, displayName, password);
    setAuthToken(t);
    setToken(t);
    setUser(u);
    await storage.saveAuth(t, u);
  };

  const logout = async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await storage.clearAuth();
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.me();
      setUser(freshUser);
      await storage.updateUser(freshUser);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}