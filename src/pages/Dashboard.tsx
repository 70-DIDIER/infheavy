import React, { useState, useMemo, useCallback } from 'react';
import { useSmartHome }   from '../context/SmartHomeContext';
import { GaugeWidget }    from '../components/sensors/GaugeWidget';
import { Icon }           from '../components/ui/Icon';
import { VoiceFab }       from '../components/ui/VoiceFab';
import type { Device, SensorSummaryReading } from '../types';

// ── Metric mapping ────────────────────────────────────────────
interface SensorMetric {
  label: string; unit: string; icon: string; color: string;
  field: keyof SensorSummaryReading;
  gaugeType?: 'temp' | 'humidity' | 'gas';
}

function getDeviceMetrics(d: SensorSummaryReading): SensorMetric[] {
  const st   = (d.signal_type ?? '').toLowerCase();
  const u    = (d.unit ?? '').toLowerCase();
  const name = (d.device_name ?? '').toLowerCase();

  if (st === 'dht22' || st === 'dht11') return [
    { label: 'Température', unit: '°C', icon: 'device_thermostat', color: 'text-orange-400', field: 'temperature', gaugeType: 'temp' },
    { label: 'Humidité',    unit: '%',  icon: 'water_drop',        color: 'text-blue-400',   field: 'humidity',    gaugeType: 'humidity' },
  ];
  if (u.includes('ppm') || st === 'uart' || name.includes('gaz') || name.includes('smoke') || name.includes('fumée') || name.includes('gas')) return [
    { label: 'Gaz / Fumée', unit: 'ppm', icon: 'local_fire_department', color: 'text-red-400', field: 'gas_ppm', gaugeType: 'gas' },
  ];
  if (u.includes('lux') || name.includes('luminosité') || name.includes('light') || name.includes('lum')) return [
    { label: 'Luminosité', unit: 'lux', icon: 'light_mode', color: 'text-amber-400', field: 'light_lux' },
  ];
  if (name.includes('pir') || name.includes('mouvement') || name.includes('motion') || name.includes('présence') || name.includes('presence')) return [
    { label: 'Mouvement', unit: '', icon: 'sensors', color: 'text-purple-400', field: 'motion' },
  ];
  if (name.includes('fuite') || name.includes('water') || name.includes('eau') || name.includes('inondation') || name.includes('flood')) return [
    { label: "Fuite d'eau", unit: '', icon: 'waves', color: 'text-cyan-400', field: 'water_leak' },
  ];
  if (u.includes('°c') || u === 'c' || u.includes('celsius') || u.includes('temp') ||
      name.includes('temp') || name.includes('thermom')) return [
    { label: 'Température', unit: '°C', icon: 'device_thermostat', color: 'text-orange-400', field: 'temperature', gaugeType: 'temp' },
  ];
  if (u === '%' || u.includes('humid') || name.includes('humid')) return [
    { label: 'Humidité', unit: '%', icon: 'water_drop', color: 'text-blue-400', field: 'humidity', gaugeType: 'humidity' },
  ];
  return [
    { label: 'Capteur', unit: d.unit ?? '', icon: 'sensors', color: 'text-slate-400', field: 'air_quality' },
  ];
}

function actuatorIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('lumière') || n.includes('light') || n.includes('lampe') || n.includes('led')) return 'lightbulb';
  if (n.includes('ventilateur') || n.includes('fan') || n.includes('clim')) return 'air';
  if (n.includes('alarme') || n.includes('alarm') || n.includes('sirène')) return 'notifications';
  if (n.includes('chauff') || n.includes('heat')) return 'local_fire_department';
  return 'power_settings_new';
}

// ── Sub-components ────────────────────────────────────────────
function DeviceStatusDot({ online }: { online: boolean }) {
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} />;
}

function NoDataCard({ reading }: { reading: SensorSummaryReading }) {
  const metrics = getDeviceMetrics(reading);
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={metrics[0].icon} size={15} className="text-slate-600" />
          <span className="text-xs font-medium text-slate-500 truncate">{reading.device_name}</span>
        </div>
        <DeviceStatusDot online={reading.status === 'ONLINE'} />
      </div>
      <div className="py-2">
        <p className="text-xs text-slate-600">{metrics.map(m => m.label).join(' · ')}</p>
        <p className="text-xl font-bold text-slate-700 mt-1">— <span className="text-sm font-normal">En attente</span></p>
      </div>
      <p className="text-xs text-slate-700">{reading.zone} · Aucune donnée reçue</p>
    </div>
  );
}

function SensorMetricCard({ metric, reading, deviceName, zone, online }: {
  metric: SensorMetric; reading: SensorSummaryReading;
  deviceName: string; zone: string; online: boolean;
}) {
  const raw = reading[metric.field];

  if (metric.field === 'motion' || metric.field === 'water_leak') {
    const active = Boolean(raw);
    return (
      <div className={`bg-slate-800 border rounded-card p-4 flex flex-col gap-3
        ${active ? 'border-red-500/40' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name={metric.icon} size={15} className={metric.color} />
            <span className="text-xs font-medium text-slate-400 truncate">{deviceName}</span>
          </div>
          <DeviceStatusDot online={online} />
        </div>
        <div>
          <p className="text-xs text-slate-500">{metric.label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${active ? 'text-red-400' : 'text-slate-400'}`}>
            {active ? (metric.field === 'motion' ? 'Détecté' : 'Fuite !') : 'Aucun'}
          </p>
        </div>
        <p className="text-xs text-slate-600">{zone}</p>
      </div>
    );
  }

  if (metric.gaugeType) {
    const val = typeof raw === 'number' ? raw : 0;
    const max = metric.gaugeType === 'temp' ? 50 : metric.gaugeType === 'humidity' ? 100 : 1000;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-card p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name={metric.icon} size={15} className={metric.color} />
            <span className="text-xs font-medium text-slate-400 truncate">{deviceName}</span>
          </div>
          <DeviceStatusDot online={online} />
        </div>
        <div className="flex flex-col items-center py-1">
          <GaugeWidget value={val} max={max} min={0}
            label={metric.label} unit={metric.unit} type={metric.gaugeType}
            thresholdGas={400} />
        </div>
        <p className="text-xs text-slate-600 text-center">{zone}</p>
      </div>
    );
  }

  const val = typeof raw === 'number' ? raw.toFixed(1) : String(raw ?? '—');
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={metric.icon} size={15} className={metric.color} />
          <span className="text-xs font-medium text-slate-400 truncate">{deviceName}</span>
        </div>
        <DeviceStatusDot online={online} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{metric.label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-0.5">
          {val} <span className="text-sm font-normal text-slate-400">{metric.unit}</span>
        </p>
      </div>
      <p className="text-xs text-slate-600">{zone}</p>
    </div>
  );
}

function ActuatorCard({ device, onToggle, isOn }: {
  device: Device; onToggle: (id: number, state: boolean) => void; isOn: boolean;
}) {
  const iconName = actuatorIcon(device.name);
  return (
    <div className={`bg-slate-800 border rounded-card p-4 flex flex-col gap-3 transition-all
      ${isOn ? 'border-blue-500/40' : 'border-slate-700'}`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${isOn ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>
          <Icon name={iconName} size={16} />
        </div>
        <div className="flex items-center gap-2">
          <DeviceStatusDot online={device.status === 'ONLINE'} />
          <button
            onClick={() => onToggle(device.id, !isOn)}
            title={device.status === 'OFFLINE' ? 'Commande mise en file — sera appliquée à la reconnexion' : undefined}
            className={`relative w-10 h-5 rounded-full transition-colors
              ${isOn ? 'bg-blue-500' : 'bg-slate-700'}
              ${device.status === 'OFFLINE' ? 'opacity-50' : ''}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${isOn ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200 truncate">{device.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{device.zone}</p>
      </div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────
type StatusFilter = 'all' | 'ONLINE' | 'OFFLINE';
type TypeFilter   = 'all' | 'sensor' | 'actuator';

function FilterBar({
  zones, search, zone, status, type,
  onSearch, onZone, onStatus, onType, onClear, hasActive,
}: {
  zones: string[]; search: string; zone: string; status: StatusFilter; type: TypeFilter;
  onSearch: (v: string) => void; onZone: (v: string) => void;
  onStatus: (v: StatusFilter) => void; onType: (v: TypeFilter) => void;
  onClear: () => void; hasActive: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative">
        <Icon name="search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Rechercher…"
          className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200
            placeholder-slate-600 focus:outline-none focus:border-blue-500 w-44 transition-colors"
        />
      </div>

      <select
        value={zone} onChange={e => onZone(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300
          focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
      >
        <option value="all">Toutes les zones</option>
        {zones.map(z => <option key={z} value={z}>{z}</option>)}
      </select>

      <div className="flex rounded-xl overflow-hidden border border-slate-700">
        {(['all', 'ONLINE', 'OFFLINE'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => onStatus(s)}
            className={`px-3 py-2 text-xs transition-colors ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}>
            {s === 'all' ? 'Tous' : s === 'ONLINE' ? 'En ligne' : 'Hors ligne'}
          </button>
        ))}
      </div>

      <div className="flex rounded-xl overflow-hidden border border-slate-700">
        {([['all', 'Tous'], ['sensor', 'Capteurs'], ['actuator', 'Actionneurs']] as [TypeFilter, string][]).map(([v, label]) => (
          <button key={v} onClick={() => onType(v)}
            className={`px-3 py-2 text-xs transition-colors ${
              type === v
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {hasActive && (
        <button onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400
            hover:text-red-400 hover:bg-red-500/10 border border-slate-700 transition-colors">
          <Icon name="close" size={12} /> Réinitialiser
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function Dashboard() {
  const { actuators, alerts, sendCommand, sensorReadings, sensorLoading } = useSmartHome();

  const [search,       setSearch]       = useState('');
  const [filterZone,   setFilterZone]   = useState('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterType,   setFilterType]   = useState<TypeFilter>('all');

  const activeAlerts = alerts.filter(a => !a.resolved).length;
  const onlineOutput = actuators.filter(a => a.status === 'ONLINE').length;
  const activeOutput = actuators.filter(a => a.state).length;

  const allZones = useMemo(() => {
    const s = new Set([
      ...sensorReadings.map(r => r.zone || 'Général'),
      ...actuators.map(a => a.room || 'Général'),
    ]);
    return [...s].sort();
  }, [sensorReadings, actuators]);

  const hasActiveFilters = search !== '' || filterZone !== 'all' || filterStatus !== 'all' || filterType !== 'all';

  const clearFilters = () => {
    setSearch(''); setFilterZone('all'); setFilterStatus('all'); setFilterType('all');
  };

  const filteredSensors = useMemo(() => {
    if (filterType === 'actuator') return [];
    return sensorReadings.filter(r => {
      if (search && !r.device_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterZone !== 'all' && (r.zone || 'Général') !== filterZone) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });
  }, [sensorReadings, search, filterZone, filterStatus, filterType]);

  const filteredActuators = useMemo(() => {
    if (filterType === 'sensor') return [];
    return actuators.filter(a => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterZone !== 'all' && (a.room || 'Général') !== filterZone) return false;
      if (filterStatus !== 'all' && (a.status ?? 'OFFLINE') !== filterStatus) return false;
      return true;
    });
  }, [actuators, search, filterZone, filterStatus, filterType]);

  const visibleZones = useMemo(() => {
    const s = new Set([
      ...filteredSensors.map(r => r.zone || 'Général'),
      ...filteredActuators.map(a => a.room || 'Général'),
    ]);
    return [...s];
  }, [filteredSensors, filteredActuators]);

  const handleAllOn  = useCallback(() => {
    filteredActuators.filter(a => !a.state).forEach(a => sendCommand(a.id, true));
  }, [filteredActuators, sendCommand]);

  const handleAllOff = useCallback(() => {
    filteredActuators.filter(a => a.state).forEach(a => sendCommand(a.id, false));
  }, [filteredActuators, sendCommand]);

  if (sensorLoading) return (
    <div className="flex justify-center items-center py-24">
      <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const onlineCount = sensorReadings.filter(r => r.status === 'ONLINE').length;
  const summaryCards = [
    { label: 'Capteurs actifs', value: `${onlineCount}/${sensorReadings.length}`, icon: 'sensors',           colorCls: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Actionneurs ON',  value: `${activeOutput}/${actuators.length}`,     icon: 'bolt',              colorCls: 'text-blue-400   bg-blue-500/10'    },
    { label: 'Alertes actives', value: activeAlerts,                               icon: 'warning',           colorCls: activeAlerts > 0 ? 'text-red-400 bg-red-500/10' : 'text-slate-500 bg-slate-700/50' },
    { label: 'En ligne',        value: onlineOutput + onlineCount,                 icon: 'wifi',              colorCls: 'text-emerald-400 bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Top row: summary stats + voice button */}
      <div className="flex items-start gap-4">
        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(s => {
            const [iconCls, bgCls] = s.colorCls.split(' ');
            return (
              <div key={s.label} className={`${bgCls} border border-slate-700 rounded-card p-4 flex items-center gap-4`}>
                <Icon name={s.icon} size={20} className={iconCls} />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        <VoiceFab />
      </div>

      {/* Filters + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <FilterBar
            zones={allZones}
            search={search} zone={filterZone} status={filterStatus} type={filterType}
            onSearch={setSearch} onZone={setFilterZone} onStatus={setFilterStatus} onType={setFilterType}
            onClear={clearFilters} hasActive={hasActiveFilters}
          />
        </div>
        {filteredActuators.length > 1 && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAllOn}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                bg-blue-600/20 text-blue-400 border border-blue-500/30
                hover:bg-blue-600/30 transition-colors"
            >
              <Icon name="flash_on" size={13} />
              Tout allumer
            </button>
            <button
              onClick={handleAllOff}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                bg-slate-700/60 text-slate-400 border border-slate-600
                hover:bg-slate-700 hover:text-slate-200 transition-colors"
            >
              <Icon name="power_settings_new" size={13} />
              Tout éteindre
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {visibleZones.length === 0 && (
        <div className="text-center py-20">
          {hasActiveFilters ? (
            <>
              <Icon name="search" size={40} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400 font-medium">Aucun résultat</p>
              <p className="text-slate-600 text-sm mt-1">Modifiez ou <button onClick={clearFilters} className="text-blue-400 hover:underline">réinitialisez les filtres</button></p>
            </>
          ) : (
            <>
              <Icon name="sensors" size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 font-medium">Aucun appareil configuré</p>
              <p className="text-slate-600 text-sm mt-1">Ajoutez des appareils depuis la page <strong className="text-slate-400">Appareils</strong></p>
            </>
          )}
        </div>
      )}

      {/* Device grid — all zones flat */}
      {visibleZones.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredSensors.flatMap(reading => {
            const hasData = reading.recorded_at != null;
            if (!hasData) return [
              <NoDataCard key={`nodata-${reading.device_id}`} reading={reading} />,
            ];
            return getDeviceMetrics(reading).map(metric => (
              <SensorMetricCard
                key={`${reading.device_id}-${metric.field}`}
                metric={metric}
                reading={reading}
                deviceName={reading.device_name}
                zone={reading.zone}
                online={reading.status === 'ONLINE'}
              />
            ));
          })}

          {filteredActuators.map(a => (
            <ActuatorCard
              key={a.id}
              device={{ id: a.id, name: a.name, zone: a.room, type: 'OUTPUT',
                        status: a.status ?? 'OFFLINE', created_at: '', updated_at: '' }}
              isOn={a.state}
              onToggle={sendCommand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
