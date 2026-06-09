import React from 'react';
import { Icon } from './Icon';

export interface DateRange { from: string; to: string }

interface Preset { label: string; from: () => Date; to: () => Date }

export const DATE_PRESETS: Preset[] = [
  {
    label: "Aujourd'hui",
    from:  () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    to:    () => new Date(),
  },
  {
    label: 'Hier',
    from:  () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d; },
    to:    () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23,59,59,999); return d; },
  },
  {
    label: '7 jours',
    from:  () => new Date(Date.now() - 7  * 86_400_000),
    to:    () => new Date(),
  },
  {
    label: '30 jours',
    from:  () => new Date(Date.now() - 30 * 86_400_000),
    to:    () => new Date(),
  },
  {
    label: '3 mois',
    from:  () => new Date(Date.now() - 90 * 86_400_000),
    to:    () => new Date(),
  },
  {
    label: '1 an',
    from:  () => new Date(Date.now() - 365 * 86_400_000),
    to:    () => new Date(),
  },
];

export function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  from:      string;
  to:        string;
  loading?:  boolean;
  error?:    string;
  onChange:  (range: DateRange) => void;
  onApply:   (range: DateRange) => void;
}

export function DateRangeBar({ from, to, loading, error, onChange, onApply }: Props) {
  const setFrom = (v: string) => onChange({ from: v, to });
  const setTo   = (v: string) => onChange({ from, to: v });

  const apply = () => onApply({ from, to });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') apply();
  };

  const applyPreset = (p: Preset) => {
    const range = { from: toInputValue(p.from()), to: toInputValue(p.to()) };
    onChange(range);
    onApply(range);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-card p-4 space-y-3">
      {/* Inputs */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">De</label>
          <input
            type="datetime-local"
            value={from}
            max={to}
            onChange={e => setFrom(e.target.value)}
            onKeyDown={handleKey}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200
              focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">À</label>
          <input
            type="datetime-local"
            value={to}
            min={from}
            max={toInputValue(new Date())}
            onChange={e => setTo(e.target.value)}
            onKeyDown={handleKey}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200
              focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <button
          onClick={apply}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
            disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Icon name="search" size={14} />
          Appliquer
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600">Raccourcis :</span>
        {DATE_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="px-3 py-1 rounded-lg text-xs text-slate-400 bg-slate-700 border border-slate-600
              hover:text-slate-100 hover:border-slate-500 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="flex items-center gap-2 text-xs text-red-400">
          <Icon name="error" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}
