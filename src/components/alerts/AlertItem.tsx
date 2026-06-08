import React from 'react';
import { CheckCircle, Flame, Wind, UserCheck, Thermometer, Snowflake, Cloud, MapPin, Clock } from 'lucide-react';
import type { Alert } from '../../types';
import { AlertBadge } from './AlertBadge';

interface Props {
  alert:       Alert;
  onResolve?:  (id: number) => void;
  canResolve?: boolean;
}

const cfg: Record<Alert['type'], { icon: typeof Flame; label: string; cls: string }> = {
  FIRE:      { icon: Flame,        label: 'Incendie',      cls: 'text-red-400    bg-red-500/10    border-red-500/20'    },
  GAS_LEAK:  { icon: Wind,         label: 'Fuite de gaz',  cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  INTRUSION: { icon: UserCheck,    label: 'Intrusion',     cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  TEMP_HIGH: { icon: Thermometer,  label: 'Temp. élevée',  cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  TEMP_LOW:  { icon: Snowflake,    label: 'Temp. basse',   cls: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
  AIR_BAD:   { icon: Cloud,        label: 'Air dégradé',   cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 60)   return `Il y a ${m} min`;
  if (m < 1440) return `Il y a ${Math.floor(m / 60)} h`;
  return `Il y a ${Math.floor(m / 1440)} j`;
}

export function AlertItem({ alert, onResolve, canResolve }: Props) {
  const { icon: Icon, label, cls } = cfg[alert.type];
  const critical = alert.severity === 'CRITICAL' && !alert.resolved;
  const textCls  = cls.split(' ')[0];

  return (
    <div className={`flex items-center gap-4 p-4 rounded-card border transition-all
      ${alert.resolved
        ? 'bg-slate-800/50 border-slate-700/50 opacity-60'
        : `border ${cls} ${critical ? 'animate-pulse' : ''}`
      }`}
    >
      {/* Icon */}
      <div className={`p-2.5 rounded-xl border flex-shrink-0
        ${alert.resolved ? 'bg-slate-800 border-slate-700 text-slate-500' : cls}`}>
        <Icon size={17} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={`font-semibold text-sm ${alert.resolved ? 'text-slate-500' : textCls}`}>
            {label}
          </span>
          <AlertBadge severity={alert.severity} />
          {alert.resolved && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Résolu
            </span>
          )}
        </div>

        <p className="text-slate-400 text-xs">{alert.message}</p>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-slate-500 text-xs">
            <MapPin size={11} />
            {alert.zone}
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1 text-slate-500 text-xs">
            <Clock size={11} />
            {timeAgo(alert.createdAt)}
          </span>
        </div>
      </div>

      {/* Resolve button */}
      {canResolve && !alert.resolved && (
        <button
          onClick={() => onResolve?.(alert.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400
            hover:bg-emerald-500/30 text-xs font-medium transition-all border border-emerald-500/20 flex-shrink-0"
        >
          <CheckCircle size={13} />
          Résoudre
        </button>
      )}
    </div>
  );
}
