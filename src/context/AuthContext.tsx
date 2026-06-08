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
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setLoad]  = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('jwt_token');
    const u = localStorage.getItem('user');
    if (t && u) { setToken(t); try { setUser(JSON.parse(u)); } catch {} }
    setLoad(false);
  }, []);

  const login = async (email: string, password: string) => {
    let userData: User;
    let jwtToken: string;
    try {
      const res = await authApi.login(email, password);
      jwtToken      = res.data.token ?? res.data.access_token;
      const raw     = res.data.user  ?? res.data;
      userData = {
        id:     raw.id    ?? 0,
        email:  raw.email ?? email,
        role:   (raw.role ?? 'USER') as User['role'],
        prenom: raw.prenom ?? (raw.name ? (raw.name as string).split(' ')[0] : email.split('@')[0]),
        nom:    raw.nom    ?? (raw.name ? (raw.name as string).split(' ').slice(1).join(' ') : ''),
      };
    } catch {
      // Demo fallback
      const accounts: Record<string, { token: string; user: User }> = {
        'admin@smarthome.io:admin123': { token: 'demo_admin', user: { id: 1, email, prenom: 'Admin',  nom: 'SmartHome', role: 'ADMIN' } },
        'user@smarthome.io:user123':   { token: 'demo_user',  user: { id: 2, email, prenom: 'Marie',  nom: 'Dupont',    role: 'USER'  } },
        'guest@smarthome.io:guest123': { token: 'demo_guest', user: { id: 3, email, prenom: 'Jean',   nom: 'Martin',    role: 'GUEST' } },
      };
      const entry = accounts[`${email}:${password}`];
      if (!entry) throw new Error('Identifiants incorrects');
      ({ token: jwtToken, user: userData } = entry);
    }
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(jwtToken); setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
