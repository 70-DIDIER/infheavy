import React, { useEffect, useState } from 'react';
import { X, Flame, Wind, UserCheck, Thermometer, Snowflake, Cloud } from 'lucide-react';
import type { Alert } from '../../types';

const typeConfig: Record<Alert['type'], { label: string; icon: typeof Flame; cls: string }> = {
  FIRE:      { label: 'Incendie',     icon: Flame,       cls: 'border-red-500    bg-red-500/10'    },
  GAS_LEAK:  { label: 'Fuite de gaz', icon: Wind,        cls: 'border-orange-500 bg-orange-500/10' },
  INTRUSION: { label: 'Intrusion',    icon: UserCheck,   cls: 'border-yellow-500 bg-yellow-500/10' },
  TEMP_HIGH: { label: 'Temp. élevée', icon: Thermometer, cls: 'border-orange-500 bg-orange-500/10' },
  TEMP_LOW:  { label: 'Temp. basse',  icon: Snowflake,   cls: 'border-blue-500   bg-blue-500/10'   },
  AIR_BAD:   { label: 'Air dégradé',  icon: Cloud,       cls: 'border-purple-500 bg-purple-500/10' },
};

function SingleToast({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const { label, icon: Icon, cls } = typeConfig[alert.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-card border shadow-2xl max-w-xs
      transition-all duration-300 ${cls}
      ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <div className="flex-shrink-0 pt-0.5">
        <Icon size={16} className="text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-100">{label}</p>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{alert.message} — {alert.zone}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="text-slate-500 hover:text-slate-200 flex-shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}

interface ContainerProps {
  toasts:    Alert[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(a => (
        <div key={a.id} className="pointer-events-auto">
          <SingleToast alert={a} onDismiss={() => onDismiss(a.id)} />
        </div>
      ))}
    </div>
  );
}
