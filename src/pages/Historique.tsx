import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon }         from '../components/ui/Icon';
import { SensorChart }  from '../components/charts/SensorChart';
import { sensorApi, settingsApi } from '../services/api';
import { DateRangeBar, toInputValue } from '../components/ui/DateRangeBar';
import type { DateRange } from '../components/ui/DateRangeBar';
import type { HistoryEntry, Threshold } from '../types';

type Sensor = 'temperature' | 'humidity' | 'gas' | 'light';

const SENSORS: { value: Sensor; label: string; color: string }[] = [
  { value: 'temperature', label: 'Température', color: 'text-amber-400'  },
  { value: 'humidity',    label: 'Humidité',    color: 'text-blue-400'   },
  { value: 'gas',         label: 'Gaz',         color: 'text-red-400'    },
  { value: 'light',       label: 'Lumière',     color: 'text-purple-400' },
];

// ── Stats panel ───────────────────────────────────────────────
interface SensorStat { min: number; avg: number; max: number }
interface Stats {
  temperature:  SensorStat;
  humidity:     SensorStat;
  gas:          SensorStat;
  light:        SensorStat;
  motion_count: number;
  total:        number;
}

function StatCell({
  label, icon, iconColor, stat, fmt, warnMax,
}: {
  label: string; icon: string; iconColor: string;
  stat: SensorStat; fmt: (v: number) => string; warnMax?: number;
}) {
  const maxColor = warnMax !== undefined && stat.max > warnMax ? 'text-red-400' : 'text-slate-100';
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={14} className={iconColor} />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-slate-500 mb-1">Min</p>
          <p className="text-sm font-bold text-blue-400">{fmt(stat.min)}</p>
        </div>
        <div className="border-x border-slate-700">
          <p className="text-[10px] text-slate-500 mb-1">Moy</p>
          <p className={`text-sm font-bold ${iconColor}`}>{fmt(stat.avg)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-1">Max</p>
          <p className={`text-sm font-bold ${maxColor}`}>{fmt(stat.max)}</p>
        </div>
      </div>
    </div>
  );
}

function StatsPanel({ stats, thresholds }: { stats: Stats; thresholds: Threshold }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          Statistiques
        </p>
        <p className="text-xs text-slate-600">{stats.total} mesures</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCell
          label="Température" icon="device_thermostat" iconColor="text-amber-400"
          stat={stats.temperature}
          fmt={v => `${v.toFixed(1)}°C`}
          warnMax={thresholds.tempMax}
        />
        <StatCell
          label="Humidité" icon="water_drop" iconColor="text-blue-400"
          stat={stats.humidity}
          fmt={v => `${v.toFixed(1)}%`}
        />
        <StatCell
          label="Gaz" icon="local_fire_department" iconColor="text-red-400"
          stat={stats.gas}
          fmt={v => `${Math.round(v)} ppm`}
          warnMax={thresholds.gasMax}
        />
        <StatCell
          label="Lumière" icon="light_mode" iconColor="text-purple-400"
          stat={stats.light}
          fmt={v => `${Math.round(v)} lux`}
        />
        {/* Motion — boolean, show count */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3 col-span-2 xl:col-span-1">
          <div className="flex items-center gap-2">
            <Icon name="sensors" size={14} className="text-orange-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Mouvement</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 pt-1">
            <p className={`text-2xl font-bold ${stats.motion_count > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
              {stats.motion_count}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              détection{stats.motion_count !== 1 ? 's' : ''} / {stats.total} mesures
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeReading(raw: Record<string, unknown>): HistoryEntry {
  return {
    timestamp:   (raw.recorded_at ?? raw.timestamp) as string,
    temperature: (raw.temperature as number) ?? 0,
    humidity:    (raw.humidity    as number) ?? 0,
    gas:         (raw.gas_ppm     as number) ?? (raw.gas as number) ?? 0,
    motion:      (raw.motion      as boolean) ?? false,
    light:       (raw.light_lux   as number) ?? (raw.light as number) ?? 0,
  };
}

function fmtTimestamp(iso: string, spansDays: boolean): string {
  const d = new Date(iso);
  if (spansDays)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Historique() {
  const [range,      setRange]      = useState<DateRange>({
    from: toInputValue(new Date(Date.now() - 86_400_000)),
    to:   toInputValue(new Date()),
  });
  const [sensors,    setSensors]    = useState<Sensor[]>(['temperature', 'humidity']);
  const [history,    setHistory]    = useState<HistoryEntry[]>([]);
  const [thresholds, setThresholds] = useState<Threshold>({ tempMax: 35, tempCrit: 45, gasMax: 800, gasCrit: 1500, lightMin: 100 });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    settingsApi.getThresholds().then(setThresholds).catch(() => {});
  }, []);

  const load = useCallback(async (r: DateRange) => {
    if (!r.from || !r.to) return;
    const from = new Date(r.from), to = new Date(r.to);
    if (from >= to) { setError('La date de début doit être avant la date de fin.'); return; }
    setError('');
    setLoading(true);
    const hours = (to.getTime() - from.getTime()) / 3_600_000;
    const limit = Math.min(500, Math.max(50, Math.ceil(hours * 6)));
    sensorApi.getHistory(from.toISOString(), to.toISOString(), limit)
      .then(res => {
        const raw  = res.data as Record<string, unknown>;
        const list = (raw.readings ?? raw) as Record<string, unknown>[];
        if (Array.isArray(list))
          setHistory([...list].reverse().map(normalizeReading));
      })
      .catch(() => { setHistory([]); setError('Erreur lors du chargement des données.'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(range); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const calc = (vals: number[]) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { min, avg, max };
    };
    return {
      temperature:  calc(history.map(h => h.temperature)),
      humidity:     calc(history.map(h => h.humidity)),
      gas:          calc(history.map(h => h.gas)),
      light:        calc(history.map(h => h.light)),
      motion_count: history.filter(h => h.motion).length,
      total:        history.length,
    };
  }, [history]);

  const toggleSensor = (s: Sensor) =>
    setSensors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const spansDays = (() => {
    if (!range.from || !range.to) return false;
    return (new Date(range.to).getTime() - new Date(range.from).getTime()) > 86_400_000;
  })();

  const tableRows = [...history].reverse().slice(0, 50);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon name="bar_chart" size={22} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-100">Historique des capteurs</h1>
          <p className="text-slate-400 text-sm">
            {history.length > 0
              ? `${history.length} mesure${history.length > 1 ? 's' : ''} sur la période sélectionnée`
              : 'Sélectionnez une plage de dates'}
          </p>
        </div>
      </div>

      {/* Date range */}
      <DateRangeBar
        from={range.from}
        to={range.to}
        loading={loading}
        error={error}
        onChange={setRange}
        onApply={r => { setRange(r); load(r); }}
      />

      {/* Stats panel */}
      {!loading && stats && <StatsPanel stats={stats} thresholds={thresholds} />}

      {/* Sensor toggles */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Capteurs affichés</p>
        <div className="flex flex-wrap gap-2">
          {SENSORS.map(s => (
            <button key={s.value} onClick={() => toggleSensor(s.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5
                ${sensors.includes(s.value)
                  ? 'bg-slate-700 border-slate-500 text-slate-100'
                  : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${sensors.includes(s.value) ? s.color.replace('text-', 'bg-') : 'bg-slate-600'}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-card p-5">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
            <Icon name="show_chart" size={40} className="text-slate-700" />
            <p className="text-sm">Aucune donnée sur la période sélectionnée</p>
          </div>
        ) : (
          <SensorChart
            data={history}
            sensors={sensors.length ? sensors : ['temperature']}
            tempThreshold={thresholds.tempMax}
            gasThreshold={thresholds.gasMax}
          />
        )}
      </div>

      {/* Table */}
      {history.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Mesures récentes</h2>
            <span className="text-xs text-slate-500">{Math.min(50, history.length)} / {history.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Horodatage', 'Température', 'Humidité', 'Gaz', 'Mouvement', 'Lumière'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {fmtTimestamp(row.timestamp, spansDays)}
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${row.temperature > thresholds.tempMax ? 'text-red-400' : row.temperature > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {row.temperature.toFixed(1)}°C
                    </td>
                    <td className="px-4 py-2.5 text-blue-400">{row.humidity.toFixed(1)}%</td>
                    <td className={`px-4 py-2.5 font-medium ${row.gas > thresholds.gasMax ? 'text-red-400' : row.gas > thresholds.gasMax * 0.6 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {Math.round(row.gas)} ppm
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${row.motion ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-500'}`}>
                        {row.motion ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-purple-400">{Math.round(row.light)} lux</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
