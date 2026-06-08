import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Zap, Bell, BarChart2, Settings, LogOut, Cpu } from 'lucide-react';
import { useAuth }    from '../../hooks/useAuth';
import { StatusDot }  from '../ui/StatusDot';

interface Props { esp32Online: boolean }

const NAV = [
  { path: '/dashboard',   icon: Home,      label: 'Dashboard'   },
  { path: '/actionneurs', icon: Zap,       label: 'Actionneurs' },
  { path: '/alertes',     icon: Bell,      label: 'Alertes'     },
  { path: '/historique',  icon: BarChart2, label: 'Historique'  },
  { path: '/parametres',  icon: Settings,  label: 'Paramètres', adminOnly: true },
];

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border border-red-500/20',
  USER:  'bg-blue-500/20 text-blue-400 border border-blue-500/20',
  GUEST: 'bg-slate-700/80 text-slate-400 border border-slate-600',
};

export function Sidebar({ esp32Online }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 border-r border-slate-700/60 flex flex-col z-40 select-none">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-base leading-none">SmartHome</p>
            <p className="text-slate-500 text-xs mt-0.5">IoT Dashboard</p>
          </div>
        </div>
      </div>

      {/* ESP32 status */}
      <div className="mx-4 mt-4 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center gap-2">
        <StatusDot online={esp32Online} size="sm" />
        <span className="text-slate-400 text-xs">ESP32</span>
        <span className={`ml-auto text-xs font-semibold ${esp32Online ? 'text-emerald-400' : 'text-red-400'}`}>
          {esp32Online ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-5 space-y-0.5">
        {NAV.map(({ path, icon: Icon, label, adminOnly }) => {
          if (adminOnly && user?.role !== 'ADMIN') return null;
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User block */}
      <div className="p-4 border-t border-slate-700/60 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-100 text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${roleBadge[user?.role ?? 'GUEST']}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400
            hover:text-red-400 hover:bg-red-500/10 text-sm transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
