import React, { useState, useEffect, useCallback } from 'react';
import { devicesApi, settingsApi } from '../services/api';
import { useAuth }       from '../hooks/useAuth';
import { useSmartHome }  from '../context/SmartHomeContext';
import { Modal }         from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon }          from '../components/ui/Icon';
import type { Device }   from '../types';

// ── Signal type catalogue ──────────────────────────────────────
const SIGNAL_CATALOGUE = [
  { value: 'dht22',   label: 'DHT22 (Temp + Humidité)', typical: 'Capteur température/humidité', forType: 'INPUT'  as const },
  { value: 'analog',  label: 'Analogique (ADC)',          typical: 'Gaz MQ-2, LDR lumière',       forType: null },
  { value: 'digital', label: 'Digital (HIGH / LOW)',      typical: 'Relais, PIR, fuite d\'eau',    forType: null },
  { value: 'pwm',     label: 'PWM (0–255)',               typical: 'Variateur, ventilateur',       forType: 'OUTPUT' as const },
  { value: 'i2c',     label: 'I2C',                       typical: 'BMP280 pression, I2C',        forType: 'INPUT'  as const },
  { value: 'uart',    label: 'UART / Serial',             typical: 'MHZ19 CO₂, PMS5003',         forType: 'INPUT'  as const },
];

const UNIT_SUGGESTIONS: Record<string, string[]> = {
  dht22:   ['°C', '%'],
  analog:  ['ppm', 'lux', '%', 'V'],
  digital: ['boolean'],
  pwm:     ['%', 'pwm'],
  i2c:     ['Pa', 'lux', 'ppm'],
  uart:    ['ppm', 'µg/m³', 'CO₂'],
};

const DATA_TYPE_SUGGESTIONS: Record<string, string[]> = {
  dht22:   ['float'],
  analog:  ['float', 'integer'],
  digital: ['boolean'],
  pwm:     ['integer', 'percentage'],
  i2c:     ['float', 'integer'],
  uart:    ['float', 'integer'],
};

function typeIcon(d: Device) {
  const n = d.name.toLowerCase();
  if (d.type === 'INPUT') {
    if (d.signal_type === 'dht22') return <Icon name="device_thermostat" size={15} className="text-orange-400" />;
    if ((d.unit ?? '').includes('ppm')) return <Icon name="local_fire_department" size={15} className="text-red-400" />;
    if ((d.unit ?? '').includes('lux')) return <Icon name="light_mode" size={15} className="text-amber-400" />;
    if (n.includes('mouvement') || n.includes('pir')) return <Icon name="sensors" size={15} className="text-purple-400" />;
    if (n.includes('eau') || n.includes('fuite')) return <Icon name="waves" size={15} className="text-cyan-400" />;
    return <Icon name="water_drop" size={15} className="text-blue-400" />;
  }
  if (n.includes('lumière') || n.includes('light')) return <Icon name="lightbulb" size={15} className="text-amber-400" />;
  if (n.includes('ventilateur') || n.includes('fan')) return <Icon name="air" size={15} className="text-blue-400" />;
  return <Icon name="power_settings_new" size={15} className="text-slate-400" />;
}

interface FormState {
  name: string; zone: string; description: string;
  type: 'INPUT' | 'OUTPUT'; signal_type: string; data_type: string;
  unit: string; min_value: string; max_value: string; gpio_pin: string;
}
const EMPTY: FormState = {
  name: '', zone: '', description: '',
  type: 'INPUT', signal_type: '', data_type: 'float',
  unit: '', min_value: '0', max_value: '100', gpio_pin: '',
};

function CopyButton({ text, icon = 'copy' }: { text: string; icon?: 'copy' | 'key' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
      <Icon name={copied ? 'check' : icon === 'key' ? 'key' : 'content_copy'} size={13}
        className={copied ? 'text-emerald-400' : ''} />
    </button>
  );
}

export function Appareils() {
  const { user }   = useAuth();
  const { actuators, sendCommand } = useSmartHome();
  const isAdmin = user?.role === 'ADMIN';

  const [devices,      setDevices]      = useState<Device[]>([]);
  const [zones,        setZones]        = useState<string[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState<'ALL' | 'INPUT' | 'OUTPUT'>('ALL');

  const [modal,        setModal]        = useState<'create' | 'edit' | 'key' | null>(null);
  const [editTarget,   setEditTarget]   = useState<Device | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);
  const [newDeviceKey, setNewDeviceKey] = useState('');

  const [step,   setStep]   = useState(1);
  const [form,   setForm]   = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const load = useCallback(async () => {
    try {
      const [devRes, zonesArr] = await Promise.all([
        devicesApi.getAll(),
        settingsApi.getZones(),
      ]);
      setDevices(devRes.data.devices ?? []);
      setZones(zonesArr);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stateMap = Object.fromEntries(actuators.map(a => [a.id, a.state]));

  const openCreate = () => {
    setForm(EMPTY); setError(''); setStep(1); setModal('create');
  };
  const openEdit = (d: Device) => {
    setForm({
      name: d.name, zone: d.zone ?? '', description: d.description ?? '',
      type: d.type, signal_type: d.signal_type ?? '',
      data_type: d.data_type ?? 'float', unit: d.unit ?? '',
      min_value: String(d.min_value ?? 0), max_value: String(d.max_value ?? 100),
      gpio_pin: String(d.gpio_pin ?? ''),
    });
    setEditTarget(d); setError(''); setModal('edit');
  };

  const f = (patch: Partial<FormState>) => setForm(p => ({ ...p, ...patch }));

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return; }
    if (!form.signal_type) { setError('Choisissez un type de signal'); return; }
    if (!form.zone)        { setError('Choisissez une zone'); return; }
    setSaving(true); setError('');
    try {
      const res = await devicesApi.create({
        name: form.name.trim(), type: form.type, zone: form.zone,
        description: form.description.trim() || undefined,
        signal_type: form.signal_type, data_type: form.data_type,
        unit: form.unit || undefined,
        min_value: form.min_value ? parseFloat(form.min_value) : undefined,
        max_value: form.max_value ? parseFloat(form.max_value) : undefined,
        gpio_pin:  form.gpio_pin ? parseInt(form.gpio_pin) : undefined,
      });
      const key = (res.data as { device?: { device_key?: string } })?.device?.device_key ?? '';
      setNewDeviceKey(key);
      setModal('key'); load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur');
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true); setError('');
    try {
      await devicesApi.update(editTarget.id, {
        name: form.name.trim(), zone: form.zone, description: form.description || undefined,
        signal_type: form.signal_type, data_type: form.data_type,
        unit: form.unit || undefined,
        min_value: form.min_value ? parseFloat(form.min_value) : undefined,
        max_value: form.max_value ? parseFloat(form.max_value) : undefined,
        gpio_pin:  form.gpio_pin ? parseInt(form.gpio_pin) : undefined,
      });
      setModal(null); load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await devicesApi.remove(deleteTarget.id); load(); } catch {}
    setDeleteTarget(null);
  };

  const toggleStatus = async (d: Device) => {
    const next = d.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try { await devicesApi.updateStatus(d.id, next); load(); } catch {}
  };

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || (d.zone ?? '').toLowerCase().includes(q);
    const matchT = typeFilter === 'ALL' || d.type === typeFilter;
    return matchQ && matchT;
  });

  const unitSuggestions  = UNIT_SUGGESTIONS[form.signal_type]  ?? [];
  const dataTypeSuggests = DATA_TYPE_SUGGESTIONS[form.signal_type] ?? ['float', 'boolean', 'integer'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Appareils</h1>
          <p className="text-slate-400 text-sm">
            {devices.filter(d => d.status === 'ONLINE').length} en ligne · {devices.length} total
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
              text-white text-sm font-semibold rounded-xl transition-colors">
            <Icon name="add" size={15} /> Nouvel appareil
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm
              text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52" />
        </div>
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {(['ALL', 'INPUT', 'OUTPUT'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${typeFilter === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'ALL' ? 'Tout' : t === 'INPUT' ? 'Capteurs' : 'Actionneurs'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Icon name="power_settings_new" size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun appareil trouvé</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Appareil', 'Zone', 'Signal / Data', 'Statut', 'Contrôle', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const isOn   = stateMap[d.id] ?? false;
                  const isOut  = d.type === 'OUTPUT';
                  return (
                    <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {typeIcon(d)}
                          <div>
                            <p className="text-slate-200 font-medium">{d.name}</p>
                            {d.description && <p className="text-slate-600 text-xs truncate max-w-[160px]">{d.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{d.zone || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                        {d.signal_type}/{d.data_type}
                        {d.unit && <span className="ml-1 text-slate-600">({d.unit})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => isAdmin && toggleStatus(d)}
                          disabled={!isAdmin}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors
                            ${d.status === 'ONLINE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-500'}
                            ${isAdmin ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}>
                          <Icon name={d.status === 'ONLINE' ? 'wifi' : 'wifi_off'} size={11} />
                          {d.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <button
                            onClick={() => sendCommand(d.id, !isOn)}
                            disabled={d.status === 'OFFLINE'}
                            className={`relative w-9 h-[18px] rounded-full transition-colors disabled:opacity-40
                              ${isOn ? 'bg-blue-500' : 'bg-slate-700'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform
                              ${isOn ? 'translate-x-[18px]' : ''}`} />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {d.device_key && (
                            <div className="relative group">
                              <CopyButton text={d.device_key} icon="key" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                Copier la clé appareil
                              </div>
                            </div>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => openEdit(d)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                <Icon name="edit" size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(d)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Icon name="delete" size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create modal (3-step wizard) ──────────────────────────── */}
      {modal === 'create' && (
        <Modal title="Nouvel appareil" onClose={() => setModal(null)} size="lg">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors
                  ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                  {s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-700'}`} />}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">{error}</p>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Identité de l'appareil</p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom *</label>
                <input value={form.name} onChange={e => f({ name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ex. Capteur DHT22 Salon, Lumière Cuisine" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Zone *</label>
                <select value={form.zone} onChange={e => f({ zone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">— Sélectionner une zone —</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <input value={form.description} onChange={e => f({ description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Optionnel" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Type d'appareil</p>
              <div className="flex gap-3">
                {(['INPUT', 'OUTPUT'] as const).map(t => (
                  <button key={t} onClick={() => f({ type: t, signal_type: '' })}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors
                      ${form.type === t
                        ? t === 'INPUT'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {t === 'INPUT' ? '🔍 Capteur' : '⚡ Actionneur'}
                    <p className="text-xs font-normal mt-1 opacity-70">
                      {t === 'INPUT' ? 'Lit des valeurs physiques' : 'Contrôle un équipement'}
                    </p>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Type de signal *</label>
                <div className="space-y-2">
                  {SIGNAL_CATALOGUE.filter(s => !s.forType || s.forType === form.type).map(s => (
                    <button key={s.value} onClick={() => f({ signal_type: s.value,
                      data_type: (DATA_TYPE_SUGGESTIONS[s.value] ?? ['float'])[0],
                      unit: (UNIT_SUGGESTIONS[s.value] ?? [''])[0] })}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
                        ${form.signal_type === s.value
                          ? 'bg-blue-600/10 border-blue-500 text-blue-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-current">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.typical}</p>
                      </div>
                      {form.signal_type === s.value && <Icon name="check" size={14} className="text-blue-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Configuration des données</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Type de données</label>
                  <select value={form.data_type} onChange={e => f({ data_type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                      text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {dataTypeSuggests.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unité</label>
                  <div className="flex gap-1">
                    <input value={form.unit} onChange={e => f({ unit: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                        text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="°C, ppm, lux…" />
                    {unitSuggestions.length > 0 && (
                      <div className="flex gap-1">
                        {unitSuggestions.map(u => (
                          <button key={u} onClick={() => f({ unit: u })}
                            className={`px-2 py-2 rounded-xl text-xs border transition-colors
                              ${form.unit === u
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                            {u}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {form.type === 'INPUT' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur min</label>
                      <input type="number" value={form.min_value} onChange={e => f({ min_value: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                          text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur max</label>
                      <input type="number" value={form.max_value} onChange={e => f({ max_value: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                          text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
            <button onClick={() => step > 1 ? setStep(s => s - 1) : setModal(null)}
              className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
              {step > 1 ? '← Retour' : 'Annuler'}
            </button>
            {step < 3 ? (
              <button onClick={() => {
                if (step === 1 && !form.name.trim()) { setError('Le nom est obligatoire'); return; }
                if (step === 1 && !form.zone) { setError('Choisissez une zone'); return; }
                if (step === 2 && !form.signal_type) { setError('Choisissez un type de signal'); return; }
                setError(''); setStep(s => s + 1);
              }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                  bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                Suivant <Icon name="chevron_right" size={14} />
              </button>
            ) : (
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                  bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl transition-colors">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Créer l'appareil
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────── */}
      {modal === 'edit' && editTarget && (
        <Modal title={`Modifier — ${editTarget.name}`} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom</label>
                <input value={form.name} onChange={e => f({ name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Zone</label>
                <select value={form.zone} onChange={e => f({ zone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">— Sélectionner —</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Unité</label>
                <input value={form.unit} onChange={e => f({ unit: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="°C, ppm, lux…" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <input value={form.description} onChange={e => f({ description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-slate-400 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
                Annuler
              </button>
              <button onClick={handleEdit} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                  bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl transition-colors">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Device key modal ───────────────────────────────────────── */}
      {modal === 'key' && (
        <Modal title="Appareil créé — clé à copier" onClose={() => setModal(null)} size="md">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Icon name="key" size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                La clé de l'appareil n'est affichée <strong>qu'une seule fois</strong>. Copiez-la et configurez votre ESP32 avant de fermer.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Clé appareil (x-device-key)</p>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5">
                <code className="text-xs text-emerald-400 font-mono flex-1 break-all">{newDeviceKey}</code>
                <CopyButton text={newDeviceKey} />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-500 space-y-1">
              <p className="text-slate-400 font-medium mb-1">Headers à utiliser sur l'ESP32 :</p>
              <p>x-api-key: <span className="text-slate-300 font-mono">{'<votre api_key>'}</span></p>
              <p>x-device-key: <span className="text-emerald-400 font-mono">{newDeviceKey.slice(0, 16)}…</span></p>
            </div>
            <button onClick={() => setModal(null)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
              J'ai copié la clé
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'appareil"
          message={`Supprimer "${deleteTarget.name}" ? Toutes les données liées seront perdues.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
