import React from 'react';
import { Icon } from './Icon';

interface Props {
  label:    string;
  value:    string | number;
  icon:     string;
  color:    'blue' | 'green' | 'red' | 'orange';
  subtext?: string;
}

const palette = {
  blue:   { accent: 'border-l-blue-500',   iconCls: 'bg-blue-500/10 text-blue-400',   valCls: 'text-blue-300'   },
  green:  { accent: 'border-l-emerald-500', iconCls: 'bg-emerald-500/10 text-emerald-400', valCls: 'text-emerald-300' },
  red:    { accent: 'border-l-red-500',    iconCls: 'bg-red-500/10 text-red-400',     valCls: 'text-red-300'    },
  orange: { accent: 'border-l-amber-500',  iconCls: 'bg-amber-500/10 text-amber-400', valCls: 'text-amber-300'  },
};

export function StatCard({ label, value, icon, color, subtext }: Props) {
  const c = palette[color];
  return (
    <div className={`bg-slate-800 border border-slate-700 border-l-4 ${c.accent} rounded-card p-4 flex items-center gap-3`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${c.iconCls}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs truncate">{label}</p>
        <p className={`text-xl font-bold leading-tight ${c.valCls}`}>{value}</p>
        {subtext && <p className="text-slate-500 text-xs">{subtext}</p>}
      </div>
    </div>
  );
}
