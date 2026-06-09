import React, { type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

interface Props {
  label:        string;
  value:        string | number;
  unit:         string;
  icon:         string;
  status?:      'good' | 'warning' | 'danger';
  statusLabel?: string;
  extra?:       ReactNode;
  animate?:     boolean;
}

const statusCls = {
  good:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  warning: 'text-amber-400  bg-amber-500/10  border-amber-500/25',
  danger:  'text-red-400    bg-red-500/10    border-red-500/25',
};

export function SensorCard({ label, value, unit, icon, status = 'good', statusLabel, extra, animate }: Props) {
  const cls = statusCls[status];
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-card p-4 transition-all
      ${animate ? 'border-blue-500/40 shadow-lg shadow-blue-500/10' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl border ${cls}`}>
          <Icon name={icon} size={18} />
        </div>
        {statusLabel && (
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cls}`}>{statusLabel}</span>
        )}
      </div>
      <p className="text-slate-500 text-xs mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-slate-100">{value}</span>
        {unit && <span className="text-slate-400 text-sm">{unit}</span>}
      </div>
      {extra}
    </div>
  );
}
