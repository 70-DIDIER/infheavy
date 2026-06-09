import React, { useState } from 'react';
import { Icon }         from '../components/ui/Icon';
import { useSmartHome } from '../context/SmartHomeContext';
import { useAuth }      from '../hooks/useAuth';
import { AlertItem }    from '../components/alerts/AlertItem';
import { alertApi }     from '../services/api';

type Filter = 'Toutes' | 'CRITICAL' | 'WARNING' | 'INFO' | 'Résolues';
const FILTERS: Filter[] = ['Toutes', 'CRITICAL', 'WARNING', 'INFO', 'Résolues'];

const filterBadge: Record<Filter, string> = {
  Toutes:    'bg-slate-700 text-slate-300',
  CRITICAL:  'bg-red-500/20 text-red-400',
  WARNING:   'bg-amber-500/20 text-amber-400',
  INFO:      'bg-blue-500/20 text-blue-400',
  Résolues:  'bg-emerald-500/20 text-emerald-400',
};

export function Alertes() {
  const { alerts, resolveAlert } = useSmartHome();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('Toutes');

  const canResolve = user?.role === 'ADMIN' || user?.role === 'USER';

  const filtered = alerts.filter(a => {
    if (filter === 'Toutes')   return !a.resolved;
    if (filter === 'Résolues') return a.resolved;
    return a.severity === filter && !a.resolved;
  });

  const activeCount = alerts.filter(a => !a.resolved).length;

  const handleResolve = async (id: number) => {
    resolveAlert(id);
    try { await alertApi.resolve(id); } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="notifications" size={24} className="text-slate-300" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {activeCount > 9 ? '9+' : activeCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Alertes</h1>
            <p className="text-slate-400 text-sm">
              {activeCount > 0 ? `${activeCount} alerte${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''}` : 'Aucune alerte active'}
            </p>
          </div>
        </div>
        {canResolve && activeCount > 0 && (
          <button
            onClick={() => alerts.filter(a => !a.resolved).forEach(a => handleResolve(a.id))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400
              hover:bg-emerald-500/30 text-sm font-medium border border-emerald-500/20 transition-all"
          >
            <Icon name="check_circle" size={15} />
            Tout résoudre
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = f === 'Toutes'   ? alerts.filter(a => !a.resolved).length
                      : f === 'Résolues' ? alerts.filter(a => a.resolved).length
                      : alerts.filter(a => a.severity === f && !a.resolved).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
                ${filter === f
                  ? (f === 'CRITICAL' ? 'bg-red-600 text-white' : f === 'WARNING' ? 'bg-amber-600 text-white' : f === 'INFO' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white')
                  : `${filterBadge[f]} border border-slate-700 hover:border-slate-500`
                }`}
            >
              {f}
              {count > 0 && (
                <span className="bg-white/20 text-[10px] px-1.5 rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Icon name="check_circle" size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune alerte dans cette catégorie</p>
          </div>
        ) : (
          filtered.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              canResolve={canResolve}
              onResolve={handleResolve}
            />
          ))
        )}
      </div>
    </div>
  );
}
