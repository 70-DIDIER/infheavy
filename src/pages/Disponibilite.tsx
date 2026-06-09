import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { devicesApi } from '../services/api';
import { Icon } from '../components/ui/Icon';
import { DateRangeBar, toInputValue } from '../components/ui/DateRangeBar';
import type { DateRange } from '../components/ui/DateRangeBar';

// ── Types ─────────────────────────────────────────────────────
interface DeviceUptime {
  device_id:       number;
  device_name:     string;
  zone:            string;
  type:            'INPUT' | 'OUTPUT';
  status:          'ONLINE' | 'OFFLINE';
  online_buckets:  number;
  offline_buckets: number;
  total_buckets:   number;
  online_hours:    number;
  offline_hours:   number;
  online_pct:      number;
}

interface TimelineBucket {
  bucket_start: string;
  is_online:    boolean;
}

interface UptimeData {
  from:      string;
  to:        string;
  trunc:     string;
  devices:   DeviceUptime[];
  timeline:  TimelineBucket[];
}

// ── Helpers ───────────────────────────────────────────────────
function fmtHours(h: number): string {
  if (h < 1)  return `${Math.round(h * 60)}min`;
  if (h < 24) return `${h.toFixed(0)}h`;
  const days = Math.floor(h / 24);
  const rem  = h % 24;
  return rem > 0 ? `${days}j ${rem.toFixed(0)}h` : `${days}j`;
}

function fmtBucket(iso: string, trunc: string): string {
  const d = new Date(iso);
  if (trunc === 'hour')  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (trunc === 'day')   return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// ── Tooltip ───────────────────────────────────────────────────
function HistoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const online = payload[0]?.payload?.is_online;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className={`font-semibold ${online ? 'text-emerald-400' : 'text-slate-500'}`}>
        {online ? 'En ligne' : 'Hors ligne'}
      </p>
    </div>
  );
}

// ── Device row ─────────────────────────────────────────────────
function DeviceRow({
  device, selected, onSelect, timeline, trunc, loadingTimeline,
}: {
  device:          DeviceUptime;
  selected:        boolean;
  onSelect:        (id: number) => void;
  timeline:        TimelineBucket[];
  trunc:           string;
  loadingTimeline: boolean;
}) {
  const chartData = timeline.map(b => ({
    label:     fmtBucket(b.bucket_start, trunc),
    value:     1,
    is_online: b.is_online,
  }));

  const onlinePct = device.online_pct;
  const dotCls    = device.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-slate-600';

  return (
    <div className={`bg-slate-800 border rounded-card transition-colors ${selected ? 'border-blue-500/50' : 'border-slate-700'}`}>
      <button
        className="w-full px-5 py-4 flex items-center gap-4 text-left"
        onClick={() => onSelect(device.device_id)}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotCls}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-100 truncate">{device.device_name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              device.type === 'INPUT' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
            }`}>
              {device.type === 'INPUT' ? 'Capteur' : 'Actionneur'}
            </span>
            <span className="text-xs text-slate-600">{device.zone}</span>
          </div>
        </div>

        {/* Uptime bar */}
        <div className="hidden sm:flex flex-col gap-1 w-48 flex-shrink-0">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span className="text-emerald-400 font-medium">{fmtHours(device.online_hours)} en ligne</span>
            <span>{fmtHours(device.offline_hours)} hors ligne</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${onlinePct}%` }}
            />
          </div>
        </div>

        <div className="flex-shrink-0 w-14 text-right">
          <span className={`text-lg font-bold ${
            onlinePct >= 90 ? 'text-emerald-400' : onlinePct >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>{onlinePct}%</span>
        </div>

        <Icon name={selected ? 'expand_less' : 'expand_more'} size={16} className="text-slate-500 flex-shrink-0" />
      </button>

      {/* Expanded histogram */}
      {selected && (
        <div className="px-5 pb-5 border-t border-slate-700/60 pt-4">
          {loadingTimeline ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Icon name="show_chart" size={32} className="text-slate-700" />
              <p className="text-slate-600 text-sm">Aucune donnée pour cette période</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Disponibilité par {trunc === 'hour' ? 'heure' : trunc === 'day' ? 'jour' : 'mois'}
                {' — '}<span className="text-emerald-400">vert</span> = en ligne,{' '}
                <span className="text-slate-500">gris</span> = hors ligne
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chartData} barCategoryGap="8%">
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
                  />
                  <Tooltip content={<HistoTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.is_online ? '#10b981' : '#1e293b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Mobile uptime bar */}
              <div className="sm:hidden mt-3 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="text-emerald-400">{fmtHours(device.online_hours)} en ligne</span>
                  <span>{fmtHours(device.offline_hours)} hors ligne</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${onlinePct}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function Disponibilite() {
  const [range,           setRange]           = useState<DateRange>({
    from: toInputValue(new Date(Date.now() - 7 * 86_400_000)),
    to:   toInputValue(new Date()),
  });
  const [data,            setData]            = useState<UptimeData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [selectedId,      setSelectedId]      = useState<number | null>(null);
  const [timeline,        setTimeline]        = useState<TimelineBucket[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [filterType,      setFilterType]      = useState<'all' | 'INPUT' | 'OUTPUT'>('all');

  const load = useCallback(async (r: DateRange) => {
    if (!r.from || !r.to) return;
    const from = new Date(r.from), to = new Date(r.to);
    if (from >= to) { setError('La date de début doit être avant la date de fin.'); return; }
    setError('');
    setLoading(true);
    setSelectedId(null);
    setTimeline([]);
    try {
      const res = await devicesApi.getUptime(from.toISOString(), to.toISOString());
      setData(res.data);
    } catch {
      setError('Impossible de charger les données de disponibilité.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(async (id: number) => {
    if (selectedId === id) { setSelectedId(null); setTimeline([]); return; }
    setSelectedId(id);
    setTimeline([]);
    setLoadingTimeline(true);
    try {
      const from = new Date(range.from), to = new Date(range.to);
      const res  = await devicesApi.getUptime(from.toISOString(), to.toISOString(), id);
      setTimeline(res.data.timeline ?? []);
    } catch {}
    finally { setLoadingTimeline(false); }
  }, [selectedId, range]);

  const visibleDevices = (data?.devices ?? []).filter(d =>
    filterType === 'all' || d.type === filterType,
  );

  const avgUptime   = visibleDevices.length
    ? Math.round(visibleDevices.reduce((s, d) => s + d.online_pct, 0) / visibleDevices.length) : 0;
  const topStable   = [...visibleDevices].sort((a, b) => b.online_pct - a.online_pct)[0];
  const topUnstable = [...visibleDevices].sort((a, b) => a.online_pct - b.online_pct)[0];
  const trunc       = data?.trunc ?? 'day';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Disponibilité des appareils</h1>
        <p className="text-sm text-slate-500 mt-0.5">Temps en ligne et hors ligne par période</p>
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
            <SummaryCard
              icon="wifi_tethering" label="Disponibilité moyenne" value={`${avgUptime}%`}
              iconColor={avgUptime >= 90 ? 'text-emerald-400' : avgUptime >= 60 ? 'text-amber-400' : 'text-red-400'}
              bg={avgUptime >= 90 ? 'bg-emerald-500/10' : avgUptime >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'}
            />
            <SummaryCard icon="device_hub" label="Appareils surveillés" value={String(data.devices.length)} iconColor="text-blue-400" bg="bg-blue-500/10" />
            <SummaryCard icon="verified"  label="Plus stable"     value={topStable   ? `${topStable.online_pct}%`   : '—'} sub={topStable?.device_name}   iconColor="text-emerald-400" bg="bg-emerald-500/10" />
            <SummaryCard icon="warning"   label="Moins stable"    value={topUnstable ? `${topUnstable.online_pct}%` : '—'} sub={topUnstable?.device_name} iconColor="text-amber-400"  bg="bg-amber-500/10"  />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Filtrer :</span>
            <div className="flex rounded-xl overflow-hidden border border-slate-700">
              {([['all', 'Tous'], ['INPUT', 'Capteurs'], ['OUTPUT', 'Actionneurs']] as [typeof filterType, string][]).map(([v, label]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    filterType === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visibleDevices.length === 0 ? (
            <div className="text-center py-20">
              <Icon name="device_hub" size={48} className="mx-auto mb-4 text-slate-700" />
              <p className="text-slate-400 font-medium">Aucun appareil trouvé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleDevices.map(device => (
                <DeviceRow
                  key={device.device_id}
                  device={device}
                  selected={selectedId === device.device_id}
                  onSelect={handleSelect}
                  timeline={selectedId === device.device_id ? timeline : []}
                  trunc={trunc}
                  loadingTimeline={selectedId === device.device_id && loadingTimeline}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, iconColor, bg }: {
  icon: string; label: string; value: string; sub?: string; iconColor: string; bg: string;
}) {
  return (
    <div className={`${bg} border border-slate-700 rounded-card p-4 flex items-start gap-4`}>
      <Icon name={icon} size={20} className={iconColor} />
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-100 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
