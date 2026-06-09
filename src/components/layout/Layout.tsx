import React, { useState, useEffect, type ReactNode } from 'react';
import { Sidebar }        from './Sidebar';
import { Header }         from './Header';
import { ToastContainer } from '../ui/Toast';
import { useSmartHome }   from '../../context/SmartHomeContext';
import type { Alert }     from '../../types';

export function Layout({ children }: { children: ReactNode }) {
  const { newAlert, clearNewAlert } = useSmartHome();
  const [toasts, setToasts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!newAlert) return;
    setToasts(prev => [...prev, newAlert]);
    clearNewAlert();
  }, [newAlert, clearNewAlert]);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
