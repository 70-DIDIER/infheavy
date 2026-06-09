import React from 'react';
import type { Alert } from '../../types';

const cfg: Record<Alert['severity'], string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border border-red-500/30',
  WARNING:  'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  INFO:     'bg-blue-500/10 text-blue-400 border border-blue-500/30',
};

export function AlertBadge({ severity }: { severity: Alert['severity'] }) {
  return (
    <span className={`text-[10px] px-2 py-px font-bold uppercase rounded ${cfg[severity]}`}>
      {severity}
    </span>
  );
}
