import React, { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';

type SmartHomeContextType = ReturnType<typeof useWebSocket>;

const SmartHomeContext = createContext<SmartHomeContextType | null>(null);

export function SmartHomeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const ws = useWebSocket(token);
  return <SmartHomeContext.Provider value={ws}>{children}</SmartHomeContext.Provider>;
}

export function useSmartHome(): SmartHomeContextType {
  const ctx = useContext(SmartHomeContext);
  if (!ctx) throw new Error('useSmartHome must be used inside SmartHomeProvider');
  return ctx;
}
