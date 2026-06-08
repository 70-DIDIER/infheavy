import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Radio, RadioTower } from 'lucide-react';
import { useAuth }       from '../../hooks/useAuth';
import { useSmartHome }  from '../../context/SmartHomeContext';

const labels: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/actionneurs': 'Actionneurs',
  '/alertes':     'Alertes',
  '/historique':  'Historique',
  '/parametres':  'Paramètres',
};

export function Header() {
  const { pathname }              = useLocation();
  const { user }                  = useAuth();
  const { wsConnected: apiOk }    = useSmartHome();
  const page = labels[pathname]   ?? 'Dashboard';
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 h-14 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/60 flex items-center px-6 gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
        <span>SmartHome</span>
        <ChevronRight size={13} />
        <span className="text-slate-200 font-medium">{page}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* API status */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium
          ${apiOk ? 'text-emerald-400' : 'text-slate-500'}`}>
          {apiOk ? <Radio size={13} /> : <RadioTower size={13} />}
          {apiOk ? 'API connectée' : 'Données hors ligne'}
        </div>

        <span className="hidden md:block text-slate-500 text-xs capitalize">{date}</span>

        {user && (
          <p className="text-sm text-slate-300">
            Bonjour, <span className="text-blue-400 font-semibold">{user.prenom}</span>
          </p>
        )}
      </div>
    </header>
  );
}
