import React, { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { SensorChart }   from '../components/charts/SensorChart';
import { sensorApi, MOCK_HISTORY, MOCK_THRESHOLDS } from '../services/api';
import type { HistoryEntry } from '../types';

type Period = '1h' | '6h' | '24h' | '7j';
type Sensor = 'temperature' | 'humidity' | 'gas' | 'light';

const PERIODS: { value: Period; label: string }[] = [
  { value: '1h',  label: '1 heure'  },
  { value: '6h',  label: '6 heures' },
  { value: '24h', label: '24 heures'},
  { value: '7j',  label: '7 jours'  },
];

const SENSORS: { value: Sensor; label: string; color: string }[] = [
  { value: 'temperature', label: 'Température', color: 'text-amber-400'  },
  { value: 'humidity',    label: 'Humidité',    color: 'text-blue-400'   },
  { value: 'gas',         label: 'Gaz',         color: 'text-red-400'    },
  { value: 'light',       label: 'Lumière',     color: 'text-purple-400' },
];

function sliceHistory(data: HistoryEntry[], period: Period): HistoryEntry[] {
  const hours = period === '1h' ? 1 : period === '6h' ? 6 : period === '24h' ? 24 : 168;
  const cutoff = Date.now() - hours * 3_600_000;
  return data.filter(e => new Date(e.timestamp).getTime() >= cutoff);
}

export function Historique() {
  const [period,   setPeriod]   = useState<Period>('24h');
  const [sensors,  setSensors]  = useState<Sensor[]>(['temperature', 'humidity']);
  const [history,  setHistory]  = useState<HistoryEntry[]>(MOCK_HISTORY);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    sensorApi.getHistory(period)
      .then(res => setHistory(res.data))
      .catch(() => setHistory(MOCK_HISTORY))
      .finally(() => setLoading(false));
  }, [period]);

  const displayed = sliceHistory(history, period);

  const toggleSensor = (s: Sensor) =>
    setSensors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const tableRows = [...displayed].reverse().slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 size={22} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-100">Historique des capteurs</h1>
          <p className="text-slate-400 text-sm">{displayed.length} mesures sur la période sélectionnée</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-6 items-start">
        {/* Period */}
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Période</p>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                  ${period === p.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sensor toggles */}
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Capteurs</p>
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
      </div>

      {/* Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-card p-5">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            <div className="w-7 h-7 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
            Aucune donnée sur cette période
          </div>
        ) : (
          <SensorChart
            data={displayed}
            sensors={sensors.length ? sensors : ['temperature']}
            tempThreshold={MOCK_THRESHOLDS.tempMax}
            gasThreshold={MOCK_THRESHOLDS.gasMax}
          />
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200">20 dernières mesures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Heure', 'Température', 'Humidité', 'Gaz', 'Mouvement', 'Lumière'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${row.temperature > 35 ? 'text-red-400' : row.temperature > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {row.temperature.toFixed(1)}°C
                  </td>
                  <td className="px-4 py-2.5 text-blue-400">{row.humidity.toFixed(1)}%</td>
                  <td className={`px-4 py-2.5 font-medium ${row.gas > 500 ? 'text-red-400' : row.gas > 300 ? 'text-amber-400' : 'text-slate-300'}`}>
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
    </div>
  );
}
