import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon }         from '../ui/Icon';
import { useAuth }      from '../../hooks/useAuth';
import { useSmartHome } from '../../context/SmartHomeContext';

const labels: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/appareils':   'Appareils',
  '/alertes':     'Alertes',
  '/historique':  'Historique',
  '/parametres':  'Paramètres',
  '/automations': 'Automations',
  '/zones':       'Zones',
};

export function Header() {
  const { pathname }            = useLocation();
  const { user }                = useAuth();
  const { wsConnected, alerts } = useSmartHome();
  const page         = labels[pathname] ?? 'Dashboard';
  const activeAlerts = alerts.filter(a => !a.resolved).length;

  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date     = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const clockStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="sticky top-0 z-30 h-14 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/60 flex items-center px-6 gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
        <span>SmartHome</span>
        <Icon name="chevron_right" size={13} />
        <span className="text-slate-200 font-bold">{page}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Active alerts */}
        {activeAlerts > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-400">
            <Icon name="warning" size={14} />
            {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''}
          </div>
        )}

        {/* API status */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium
          ${wsConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
          <Icon name={wsConnected ? 'wifi_tethering' : 'signal_wifi_off'} size={14} />
          {wsConnected ? 'API connectée' : 'Données hors ligne'}
        </div>

        {/* Live clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono
          bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
          <Icon name="schedule" size={13} className="text-slate-500" />
          <span>{clockStr}</span>
        </div>

        <span className="hidden lg:block text-slate-500 text-xs capitalize">{date}</span>

        {user && (
          <p className="text-sm text-slate-300">
            Bonjour, <span className="text-blue-400 font-bold">{user.prenom}</span>
          </p>
        )}
      </div>
    </header>
  );
}
