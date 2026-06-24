import React, { useState, useEffect, useCallback } from 'react';
import { Icon }          from '../components/ui/Icon';
import { automationApi, devicesApi } from '../services/api';
import { useAuth }       from '../hooks/useAuth';
import { Modal }         from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Automation, Device } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type TriggerType  = 'SENSOR_THRESHOLD' | 'TIME_BASED' | 'DEVICE_STATUS';
type ConditionOp  = 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';

const TRIGGER_LABELS: Record<TriggerType, string> = {
  SENSOR_THRESHOLD: 'Seuil capteur',
  TIME_BASED:       'Heure',
  DEVICE_STATUS:    "État d'appareil",
};
const COND_LABELS: Record<ConditionOp, string> = {
  GT: '>', LT: '<', EQ: '=', GTE: '≥', LTE: '≤',
};

const triggerIconName = (t: TriggerType): string =>
  t === 'SENSOR_THRESHOLD' ? 'device_thermostat' :
  t === 'TIME_BASED'       ? 'schedule'           :
  'sensors';

interface FormState {
  name: string; description: string;
  trigger_type: TriggerType;
  trigger_device_id: string; trigger_condition: ConditionOp; trigger_value: string;
  trigger_time: string;
  action_device_id: string; action_state: boolean;
  enabled: boolean;
}
const EMPTY: FormState = {
  name: '', description: '', trigger_type: 'SENSOR_THRESHOLD',
  trigger_device_id: '', trigger_condition: 'GT', trigger_value: '',
  trigger_time: '08:00',
  action_device_id: '', action_state: true, enabled: true,
};

export function Automations() {
  const { user }   = useAuth();
  const canWrite   = user?.role === 'ADMIN' || user?.role === 'USER';

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [devices,     setDevices]     = useState<Device[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState<'create' | 'edit' | null>(null);
  const [editTarget,  setEditTarget]  = useState<Automation | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<Automation | null>(null);
  const [form,        setForm]        = useState<FormState>(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [serverTime,  setServerTime]  = useState<{ hhmm: string; timezone: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/time`)
      .then(r => r.json())
      .then(d => setServerTime({ hhmm: d.hhmm, timezone: d.timezone }))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, devRes] = await Promise.all([
        automationApi.getAll(),
        devicesApi.getAll(),
      ]);
      setAutomations(autoRes.data.automations ?? []);
      setDevices(devRes.data.devices ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inputDevices  = devices.filter(d => d.type === 'INPUT');
  const outputDevices = devices.filter(d => d.type === 'OUTPUT');

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit   = (a: Automation) => {
    setForm({
      name: a.name, description: a.description ?? '',
      trigger_type: a.trigger_type,
      trigger_device_id: String(a.trigger_device_id ?? ''),
      trigger_condition: (a.trigger_condition ?? 'GT') as ConditionOp,
      trigger_value: String(a.trigger_value ?? ''),
      trigger_time: a.trigger_time ?? '08:00',
      action_device_id: String(a.action_device_id),
      action_state: a.action_state, enabled: a.enabled,
    });
    setEditTarget(a); setError(''); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return; }
    if (!form.action_device_id) { setError("Choisissez un appareil d'action"); return; }
    setSaving(true); setError('');
    const payload: Partial<Automation> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      trigger_type: form.trigger_type,
      action_device_id: parseInt(form.action_device_id),
      action_state: form.action_state,
      enabled: form.enabled,
    };
    if (form.trigger_type === 'SENSOR_THRESHOLD' || form.trigger_type === 'DEVICE_STATUS') {
      payload.trigger_device_id = form.trigger_device_id ? parseInt(form.trigger_device_id) : undefined;
      payload.trigger_condition = form.trigger_condition;
      payload.trigger_value     = form.trigger_value ? parseFloat(form.trigger_value) : undefined;
    }
    if (form.trigger_type === 'TIME_BASED') {
      payload.trigger_time = form.trigger_time;
    }
    try {
      if (modal === 'create') await automationApi.create(payload);
      else if (editTarget)    await automationApi.update(editTarget.id, payload);
      setModal(null); load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await automationApi.remove(deleteTarget.id); load(); } catch {}
    setDeleteTarget(null);
  };

  const handleToggle = async (a: Automation) => {
    try { await automationApi.toggle(a.id); load(); } catch {}
  };

  const f = (patch: Partial<FormState>) => setForm(p => ({ ...p, ...patch }));

  const filtered = automations.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Icon name="bolt" size={22} className="text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">Automations</h1>
            <p className="text-slate-400 text-sm">{automations.length} règle{automations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canWrite && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500
              text-white text-sm font-semibold rounded-xl transition-colors">
            <Icon name="add" size={15} /> Nouvelle règle
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm
            text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Icon name="bolt" size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune automation trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id}
              className={`bg-slate-800 border rounded-card px-5 py-4 flex items-center gap-4
                ${a.enabled ? 'border-slate-700' : 'border-slate-700/40 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full
                    bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Icon name={triggerIconName(a.trigger_type)} size={13} />
                    {TRIGGER_LABELS[a.trigger_type]}
                  </span>
                  {a.last_triggered_at && (
                    <span className="text-xs text-slate-500">
                      Déclenchée {new Date(a.last_triggered_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-slate-100 font-medium text-sm">{a.name}</p>
                {a.description && <p className="text-slate-500 text-xs truncate">{a.description}</p>}
                <p className="text-slate-500 text-xs mt-1">
                  {a.trigger_type === 'TIME_BASED'
                    ? `À ${a.trigger_time}`
                    : a.trigger_device_name
                      ? `${a.trigger_device_name} ${COND_LABELS[a.trigger_condition ?? 'GT']} ${a.trigger_value}`
                      : 'Aucune condition'}
                  {' → '}
                  <span className={a.action_state ? 'text-emerald-400' : 'text-red-400'}>
                    {a.action_state ? 'Allumer' : 'Éteindre'}
                  </span>
                  {' '}{a.action_device_name ?? `Appareil #${a.action_device_id}`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {canWrite && (
                  <button onClick={() => handleToggle(a)}
                    className={`transition-colors ${a.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'}`}
                    title={a.enabled ? 'Désactiver' : 'Activer'}>
                    <Icon name={a.enabled ? 'toggle_on' : 'toggle_off'} size={22} />
                  </button>
                )}
                {canWrite && (
                  <button onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                    <Icon name="edit" size={14} />
                  </button>
                )}
                {canWrite && (
                  <button onClick={() => setDeleteTarget(a)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Icon name="delete" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nouvelle automation' : "Modifier l'automation"}
          onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom *</label>
                <input value={form.name} onChange={e => f({ name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="ex. Ventilateur si trop chaud" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <input value={form.description} onChange={e => f({ description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Description optionnelle" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type de déclencheur</label>
                <div className="flex gap-2">
                  {(['SENSOR_THRESHOLD', 'TIME_BASED', 'DEVICE_STATUS'] as TriggerType[]).map(t => (
                    <button key={t} onClick={() => f({ trigger_type: t })}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors
                        ${form.trigger_type === t
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <Icon name={triggerIconName(t)} size={13} /> {TRIGGER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {form.trigger_type !== 'TIME_BASED' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      {form.trigger_type === 'SENSOR_THRESHOLD' ? 'Capteur' : 'Appareil déclencheur'}
                    </label>
                    <select value={form.trigger_device_id} onChange={e => f({ trigger_device_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                        text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500">
                      <option value="">— Sélectionner —</option>
                      {(form.trigger_type === 'SENSOR_THRESHOLD' ? inputDevices : devices).map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.zone})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Condition</label>
                      <select value={form.trigger_condition} onChange={e => f({ trigger_condition: e.target.value as ConditionOp })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                          text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500">
                        {(Object.entries(COND_LABELS) as [ConditionOp, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur</label>
                      <input type="number" step="any" value={form.trigger_value}
                        onChange={e => f({ trigger_value: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                          text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="ex. 30" />
                    </div>
                  </div>
                </>
              )}

              {form.trigger_type === 'TIME_BASED' && (
                <div className="col-span-2 space-y-2">
                  <label className="block text-xs font-medium text-slate-400">Heure de déclenchement</label>
                  <input type="time" value={form.trigger_time} onChange={e => f({ trigger_time: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                      text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  {serverTime && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5">
                      <Icon name="info" size={12} />
                      Heure actuelle du serveur&nbsp;:&nbsp;<strong>{serverTime.hhmm}</strong>
                      &nbsp;({serverTime.timezone}) — entrez l'heure dans ce fuseau.
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-2 border-t border-slate-700 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Action</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Appareil à contrôler *</label>
                <select value={form.action_device_id} onChange={e => f({ action_device_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                    text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="">— Sélectionner —</option>
                  {outputDevices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.zone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">État cible</label>
                <div className="flex gap-2">
                  <button onClick={() => f({ action_state: true })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                      ${form.action_state
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    Allumer
                  </button>
                  <button onClick={() => f({ action_state: false })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                      ${!form.action_state
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    Éteindre
                  </button>
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <button onClick={() => f({ enabled: !form.enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors
                    ${form.enabled ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                    ${form.enabled ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-slate-400">Règle {form.enabled ? 'activée' : 'désactivée'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                  bg-amber-600 hover:bg-amber-500 disabled:opacity-60 rounded-xl transition-colors">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modal === 'create' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'automation"
          message={`Supprimer "${deleteTarget.name}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
