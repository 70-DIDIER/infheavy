import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label:    string;
  value:    string | number;
  icon:     LucideIcon;
  color:    'blue' | 'green' | 'red' | 'orange';
  subtext?: string;
}

const palette = {
  blue:   { wrap: 'bg-blue-500/10 border-blue-500/20',    icon: 'bg-blue-500/20 text-blue-400',    val: 'text-blue-400'    },
  green:  { wrap: 'bg-emerald-500/10 border-emerald-500/20', icon: 'bg-emerald-500/20 text-emerald-400', val: 'text-emerald-400' },
  red:    { wrap: 'bg-red-500/10 border-red-500/20',      icon: 'bg-red-500/20 text-red-400',      val: 'text-red-400'     },
  orange: { wrap: 'bg-amber-500/10 border-amber-500/20',  icon: 'bg-amber-500/20 text-amber-400',  val: 'text-amber-400'   },
};

export function StatCard({ label, value, icon: Icon, color, subtext }: Props) {
  const c = palette[color];
  return (
    <div className={`bg-slate-800 border rounded-card p-4 flex items-center gap-4 ${c.wrap}`}>
      <div className={`p-3 rounded-xl flex-shrink-0 ${c.icon}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs truncate">{label}</p>
        <p className={`text-xl font-bold leading-tight ${c.val}`}>{value}</p>
        {subtext && <p className="text-slate-500 text-xs">{subtext}</p>}
      </div>
    </div>
  );
}
