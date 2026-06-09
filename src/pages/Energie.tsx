import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { energyApi } from '../services/api';
import { Icon }      from '../components/ui/Icon';
import { DateRangeBar, toInputValue } from '../components/ui/DateRangeBar';
import type { DateRange } from '../components/ui/DateRangeBar';

// ── Types ─────────────────────────────────────────────────────
interface TimelineBucket {
  period_start: string;
  total_wh:     number;
  total_kwh:    number;
  avg_power_w:  number;
}

interface DeviceEnergy {
  device_id:     number;
  device_name:   string;
  zone:          string;
  total_wh:      number;
  total_kwh:     number;
  avg_power_w:   number;
  reading_count: number;
  share_pct:     number;
}

interface EnergyData {
  from:        string;
  to:          string;
  trunc:       string;
  trunc_label: string;
  summary:     { total_wh: number; total_kwh: number; device_count: number };
  timeline:    TimelineBucket[];
  by_device:   DeviceEnergy[];
}

// ── Helpers ───────────────────────────────────────────────────
const DEVICE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
];

function fmtWh(wh: number): string {
  if (wh >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${wh.toFixed(1)} Wh`;
}

function fmtBucketLabel(iso: string, trunc: string): string {
  const d = new Date(iso);
  if (trunc === 'hour')  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (trunc === 'day')   return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// ── Tooltip ───────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-blue-400 font-semibold">{fmtWh(payload[0].value)}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export function Energie() {
  const [range,   setRange]   = useState<DateRange>({
    from: toInputValue(new Date(Date.now() - 7 * 86_400_000)),
    to:   toInputValue(new Date()),
  });
  const [data,    setData]    = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async (r: DateRange) => {
    if (!r.from || !r.to) return;
    const from = new Date(r.from), to = new Date(r.to);
    if (from >= to) { setError('La date de début doit être avant la date de fin.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await energyApi.getStats(from.toISOString(), to.toISOString());
      setData(res.data);
    } catch {
      setError('Impossible de charger les données énergétiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = (data?.timeline ?? []).map(b => ({
    label:    fmtBucketLabel(b.period_start, data?.trunc ?? 'day'),
    total_wh: b.total_wh,
  }));

  const topDevice    = data?.by_device?.[0];
  const bucketCount  = data?.timeline.length ?? 1;
  const avgPerBucket = data ? data.summary.total_wh / (bucketCount || 1) : 0;
  const truncLabel   = data?.trunc_label ?? 'période';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Consommation énergétique</h1>
        <p className="text-sm text-slate-500 mt-0.5">Suivi de la consommation de vos actionneurs</p>
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

      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard icon="bolt"          label="Consommation totale"        value={fmtWh(data.summary.total_wh)} iconColor="text-yellow-400" bg="bg-yellow-500/10" />
            <SummaryCard icon="electric_meter" label={`Moy. par ${truncLabel}`}  value={fmtWh(avgPerBucket)}          iconColor="text-blue-400"   bg="bg-blue-500/10"   />
            <SummaryCard icon="device_hub"    label="Appareils suivis"           value={String(data.summary.device_count)} iconColor="text-emerald-400" bg="bg-emerald-500/10" />
            <SummaryCard
              icon="trending_up" label="+ consommateur"
              value={topDevice ? topDevice.device_name : '—'}
              sub={topDevice ? fmtWh(topDevice.total_wh) : undefined}
              iconColor="text-orange-400" bg="bg-orange-500/10"
            />
          </div>

          {/* Bar chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-card p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-5">
              Consommation par {truncLabel}
            </h2>
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="28%">
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 12) - 1)}
                  />
                  <YAxis
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false} tickLine={false} width={45}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total_wh" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === chartData.length - 1 ? '#3b82f6' : '#1e40af'}
                        opacity={i === chartData.length - 1 ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-device breakdown */}
          <div className="bg-slate-800 border border-slate-700 rounded-card p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">Répartition par appareil</h2>
            {data.by_device.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">Aucune donnée pour cette période.</p>
            ) : (
              <div className="space-y-3">
                {data.by_device.map((d, i) => (
                  <DeviceRow key={d.device_id} device={d} color={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !error && data && data.summary.total_wh === 0 && data.timeline.length === 0 && (
        <div className="text-center py-20">
          <Icon name="electric_meter" size={48} className="mx-auto mb-4 text-slate-700" />
          <p className="text-slate-400 font-medium">Aucune donnée pour cette période</p>
          <p className="text-slate-600 text-sm mt-1">
            Les données apparaissent dès que l'ESP32 envoie des relevés de consommation.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, iconColor, bg }: {
  icon: string; label: string; value: string; sub?: string; iconColor: string; bg: string;
}) {
  return (
    <div className={`${bg} border border-slate-700 rounded-card p-4 flex items-start gap-4`}>
      <Icon name={icon} size={20} className={iconColor} />
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-100 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DeviceRow({ device, color }: { device: DeviceEnergy; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-slate-200 font-medium truncate">{device.device_name}</span>
          <span className="text-slate-600 flex-shrink-0">{device.zone}</span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <span className="text-slate-400">{device.share_pct}%</span>
          <span className="text-slate-200 font-semibold w-20 text-right">{fmtWh(device.total_wh)}</span>
          <span className="text-slate-600 w-16 text-right">{device.avg_power_w.toFixed(0)} W moy.</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${device.share_pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[220px] gap-2">
      <Icon name="show_chart" size={36} className="text-slate-700" />
      <p className="text-slate-600 text-sm">Aucune donnée disponible pour cette période</p>
    </div>
  );
}
