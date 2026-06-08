import React from 'react';
import { Lightbulb, Wind, Bell as BellIcon } from 'lucide-react';
import type { Actuator } from '../../types';
import { ToggleSwitch } from './ToggleSwitch';

interface Props {
  device:    Actuator;
  onToggle:  (id: string, state: boolean) => void;
  disabled?: boolean;
}

const typeIcon = { light: Lightbulb, fan: Wind, alarm: BellIcon };
const typeLabel = { light: 'Lumière', fan: 'Ventilateur', alarm: 'Alarme' };

export function DeviceCard({ device, onToggle, disabled = false }: Props) {
  const Icon = typeIcon[device.type];

  return (
    <div className={`bg-slate-800 border rounded-card p-4 transition-all duration-300 relative overflow-hidden
      ${device.state ? 'border-blue-500/40 shadow-md shadow-blue-500/10' : 'border-slate-700'}
      ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Subtle glow overlay when ON */}
      {device.state && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none rounded-card" />
      )}

      <div className="flex items-start justify-between mb-3 relative">
        <div className={`p-2.5 rounded-xl transition-colors
          ${device.state ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>
          <Icon size={20} />
        </div>
        <ToggleSwitch
          checked={device.state}
          onChange={(s) => onToggle(device.id, s)}
          disabled={disabled}
        />
      </div>

      <h3 className="font-semibold text-slate-100 text-sm relative">{device.name}</h3>
      <div className="flex items-center justify-between mt-1 relative">
        <span className="text-slate-500 text-xs">{device.room}</span>
        <span className={`text-xs font-medium ${device.state ? 'text-emerald-400' : 'text-slate-600'}`}>
          {device.state ? '● ON' : '○ OFF'}
        </span>
      </div>
    </div>
  );
}
