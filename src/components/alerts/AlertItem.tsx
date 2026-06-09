import React from 'react';
import { Icon }        from '../ui/Icon';
import type { Alert }  from '../../types';
import { AlertBadge }  from './AlertBadge';

interface Props {
  alert:       Alert;
  onResolve?:  (id: number) => void;
  canResolve?: boolean;
}

const cfg: Record<Alert['type'], { icon: string; label: string; accent: string; iconCls: string }> = {
  FIRE:       { icon: 'local_fire_department', label: 'Incendie',        accent: 'border-l-red-500',    iconCls: 'bg-red-500/10 text-red-400'    },
  GAS_LEAK:   { icon: 'air',                   label: 'Fuite de gaz',    accent: 'border-l-orange-500', iconCls: 'bg-orange-500/10 text-orange-400' },
  INTRUSION:  { icon: 'person_check',          label: 'Intrusion',       accent: 'border-l-amber-500',  iconCls: 'bg-amber-500/10 text-amber-400'  },
  HIGH_TEMP:  { icon: 'device_thermostat',     label: 'Temp. élevée',    accent: 'border-l-orange-500', iconCls: 'bg-orange-500/10 text-orange-400' },
  WATER_LEAK: { icon: 'water_drop',            label: "Fuite d'eau",     accent: 'border-l-blue-500',   iconCls: 'bg-blue-500/10 text-blue-400'    },
  POWER_CUT:  { icon: 'bolt',                  label: 'Coupure secteur', accent: 'border-l-purple-500', iconCls: 'bg-purple-500/10 text-purple-400' },
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 60)   return `Il y a ${m} min`;
  if (m < 1440) return `Il y a ${Math.floor(m / 60)} h`;
  return `Il y a ${Math.floor(m / 1440)} j`;
}

export function AlertItem({ alert, onResolve, canResolve }: Props) {
  const entry = cfg[alert.type] ?? cfg['FIRE'];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-card bg-slate-800 border border-slate-700
      border-l-4 ${alert.resolved ? 'border-l-slate-600 opacity-60' : entry.accent}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${alert.resolved ? 'bg-slate-700 text-slate-500' : entry.iconCls}`}>
        <Icon name={entry.icon} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-slate-100">{entry.label}</span>
          <AlertBadge severity={alert.severity} />
          {alert.resolved && (
            <span className="text-[10px] px-2 py-px font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              RÉSOLU
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs">{alert.message}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-slate-500 text-xs">
            <Icon name="location_on" size={11} /> {alert.zone}
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 text-slate-500 text-xs">
            <Icon name="schedule" size={11} /> {timeAgo(alert.createdAt)}
          </span>
        </div>
      </div>

      {canResolve && !alert.resolved && (
        <button
          onClick={() => onResolve?.(alert.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg flex-shrink-0
            bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
            hover:bg-emerald-500/20 transition-colors"
        >
          <Icon name="check_circle" size={13} />
          Résoudre
        </button>
      )}
    </div>
  );
}
