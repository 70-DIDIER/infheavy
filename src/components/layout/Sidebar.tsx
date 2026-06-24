import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon }         from '../ui/Icon';
import { useAuth }      from '../../hooks/useAuth';
import { useSmartHome } from '../../context/SmartHomeContext';

const NAV = [
  { path: '/dashboard',   icon: 'home',          label: 'Dashboard'   },
  { path: '/appareils',   icon: 'device_hub',    label: 'Appareils'   },
  { path: '/alertes',     icon: 'notifications', label: 'Alertes'     },
  { path: '/cameras',     icon: 'videocam',      label: 'Caméras'     },
  { path: '/historique',  icon: 'bar_chart',     label: 'Historique'  },
  { path: '/energie',        icon: 'bolt',          label: 'Énergie',        roles: ['ADMIN', 'USER'] as string[] },
  { path: '/disponibilite', icon: 'wifi_tethering', label: 'Disponibilité',  roles: ['ADMIN', 'USER'] as string[] },
  { path: '/voix',        icon: 'mic',           label: 'Voix',        roles: ['ADMIN', 'USER'] as string[] },
  { path: '/automations', icon: 'account_tree',  label: 'Automations', roles: ['ADMIN', 'USER'] as string[] },
  { path: '/zones',       icon: 'location_on',   label: 'Zones',       adminOnly: true },
  { path: '/parametres',  icon: 'settings',      label: 'Paramètres',  adminOnly: true },
];

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border border-red-500/20',
  USER:  'bg-blue-500/20 text-blue-400 border border-blue-500/20',
  GUEST: 'bg-slate-700/80 text-slate-400 border border-slate-600',
};

export function Sidebar() {
  const { user, logout }           = useAuth();
  const { actuators, wsConnected, esp32Online } = useSmartHome();
  const navigate                                = useNavigate();
  const onlineCount = actuators.filter(a => a.status === 'ONLINE').length;

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 border-r border-slate-700/60 flex flex-col z-40 select-none">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <Icon name="developer_board" size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-base leading-none">SmartHome</p>
            <p className="text-slate-500 text-xs mt-0.5">IoT Dashboard</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mx-4 mt-4 rounded-xl bg-slate-800 border border-slate-700/60 divide-y divide-slate-700/60">
        <div className="px-3 py-2 flex items-center gap-2">
          <Icon name={esp32Online ? 'developer_board' : 'cloud_off'} size={13}
                className={esp32Online ? 'text-emerald-400' : 'text-slate-600'} />
          <span className="text-slate-400 text-xs">ESP32</span>
          <span className={`ml-auto text-xs font-semibold ${esp32Online ? 'text-emerald-400' : 'text-slate-500'}`}>
            {esp32Online ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
        <div className="px-3 py-2 flex items-center gap-2">
          <Icon name={wsConnected ? 'wifi_tethering' : 'signal_wifi_off'} size={13}
                className={wsConnected ? 'text-blue-400' : 'text-slate-600'} />
          <span className="text-slate-400 text-xs">Temps réel</span>
          <span className={`ml-auto text-xs font-semibold ${wsConnected ? 'text-blue-400' : 'text-slate-500'}`}>
            {wsConnected ? `${onlineCount} actifs` : 'Déconnecté'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-5 space-y-0.5">
        {NAV.map(({ path, icon, label, adminOnly, roles }) => {
          if (adminOnly && user?.role !== 'ADMIN') return null;
          if (roles && !roles.includes(user?.role ?? '')) return null;
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <Icon name={icon} size={17} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700/60 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-100 text-sm font-semibold truncate">{user?.prenom} {user?.nom}</p>
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
          <Icon name="logout" size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
