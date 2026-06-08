import React from 'react';
import { Thermometer, type LucideIcon } from 'lucide-react';
import { StatusDot } from '../ui/StatusDot';

interface Device { name: string; state: boolean }

interface Props {
  name:         string;
  icon:         LucideIcon;
  temperature?: number;
  devices:      Device[];
  online?:      boolean;
}

export function RoomCard({ name, icon: Icon, temperature, devices, online = true }: Props) {
  const on = devices.filter(d => d.state).length;

  return (
    <div className={`bg-slate-800 border rounded-card p-4 hover:border-slate-600 transition-colors
      ${on > 0 ? 'border-blue-500/30 shadow-sm shadow-blue-500/10' : 'border-slate-700'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${on > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
            <Icon size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{name}</h3>
            <p className="text-slate-500 text-xs">{devices.length} appareil{devices.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <StatusDot online={online} size="sm" showLabel />
      </div>

      {temperature !== undefined && (
        <div className="flex items-center gap-1.5 mb-2 text-slate-400">
          <Thermometer size={13} />
          <span className="text-sm font-medium">{temperature.toFixed(1)}°C</span>
        </div>
      )}

      <div className="space-y-1">
        {devices.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-400 truncate">{d.name}</span>
            <span className={`ml-2 flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium
              ${d.state ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
              {d.state ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${on > 0 ? 'bg-blue-400' : 'bg-slate-600'}`} />
        <span className="text-xs text-slate-500">{on}/{devices.length} actif{on > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
