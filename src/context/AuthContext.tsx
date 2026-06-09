import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null, token: null,
  login: async () => {}, logout: () => {}, isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]      = useState<User | null>(null);
  const [token, setToken]    = useState<string | null>(null);
  const [isLoading, setLoad] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('jwt_token');
    const u = localStorage.getItem('user');
    if (t && u) { setToken(t); try { setUser(JSON.parse(u)); } catch {} }
    setLoad(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password);
      const jwtToken = res.data.token ?? res.data.access_token;
      const raw = res.data.user ?? res.data;
      const userData: User = {
        id:     raw.id    ?? 0,
        email:  raw.email ?? email,
        role:   (raw.role ?? 'USER') as User['role'],
        prenom: raw.prenom ?? (raw.name ? (raw.name as string).split(' ')[0] : email.split('@')[0]),
        nom:    raw.nom    ?? (raw.name ? (raw.name as string).split(' ').slice(1).join(' ') : ''),
      };
      localStorage.setItem('jwt_token', jwtToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(jwtToken);
      setUser(userData);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = e.response?.data?.message ?? e.response?.data?.error ?? 'Identifiants incorrects';
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
