import React, { useState, useEffect, useCallback } from 'react';
import { Icon }          from '../components/ui/Icon';
import { settingsApi, authApi, adminApi } from '../services/api';
import { ToggleSwitch }  from '../components/actuators/ToggleSwitch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Invitation, Threshold, AdminUser } from '../types';

const DEFAULT_THRESHOLDS: Threshold = { tempMax: 35, tempCrit: 45, gasMax: 800, gasCrit: 1500, lightMin: 100 };

const sliderColors: Record<string, string> = {
  amber: '#F59E0B', red: '#EF4444', purple: '#8B5CF6',
};

function SliderField({ label, icon, value, min, max, step, unit, accent, onChange }: {
  label: string; icon: string; value: number;
  min: number; max: number; step: number; unit: string;
  accent: 'amber' | 'red' | 'purple'; onChange: (v: number) => void;
}) {
  const pct   = ((value - min) / (max - min)) * 100;
  const color = sliderColors[accent];
  const textCls = accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-red-400' : 'text-purple-400';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={icon} size={15} className={textCls} />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${textCls}`}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #334155 ${pct}%, #334155 100%)` }} />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  );
}

const roleCls: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  USER:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  GUEST: 'bg-slate-700 text-slate-400 border-slate-600',
};

export function Parametres() {
  const [thresholds,  setThresholds]  = useState<Threshold>(DEFAULT_THRESHOLDS);
  const [zones,       setZones]       = useState<string[]>([]);
  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<'USER' | 'GUEST'>('USER');
  const [inviteMsg,   setInviteMsg]   = useState('');
  const [deleteUser,  setDeleteUser]  = useState<AdminUser | null>(null);

  const [apiKey,        setApiKey]        = useState('');
  const [apiKeyCopied,  setApiKeyCopied]  = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyRegen,   setApiKeyRegen]   = useState(false);

  const [emailNotif, setEmailNotif] = useState(true);
  const [critNotif,  setCritNotif]  = useState(true);

  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [inviting,  setInviting]  = useState(false);

  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    const [thresh, zonesArr, invRes, usersRes, meRes] = await Promise.allSettled([
      settingsApi.getThresholds(),
      settingsApi.getZones(),
      authApi.getInvitations(),
      adminApi.listUsers(),
      authApi.getMe(),
    ]);
    if (thresh.status === 'fulfilled')   setThresholds(thresh.value);
    if (zonesArr.status === 'fulfilled') setZones(zonesArr.value);
    if (invRes.status === 'fulfilled')   setInvitations(invRes.value.data.invitations ?? []);
    if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users ?? []);
    if (meRes.status === 'fulfilled') {
      const raw = meRes.value.data as { user?: { api_key?: string }; api_key?: string };
      setApiKey(raw?.user?.api_key ?? raw?.api_key ?? '');
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    });
  };
  const regenerateApiKey = async () => {
    setApiKeyRegen(true);
    try {
      const res = await authApi.regenerateApiKey();
      const raw = res.data as { api_key?: string };
      if (raw.api_key) setApiKey(raw.api_key);
    } catch {}
    setApiKeyRegen(false);
  };

  const saveThresholds = async () => {
    setSaving(true);
    try { await settingsApi.updateThresholds(thresholds); } catch {}
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg('');
    try {
      await authApi.invite(inviteEmail.trim(), inviteRole);
      setInviteMsg(`Invitation envoyée à ${inviteEmail.trim()}`);
      setInviteEmail('');
      const r = await authApi.getInvitations();
      setInvitations(r.data.invitations ?? []);
    } catch (err: unknown) {
      setInviteMsg((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur');
    }
    setInviting(false);
    setTimeout(() => setInviteMsg(''), 4000);
  };
  const cancelInvite = async (id: number) => {
    try { await authApi.cancelInvitation(id); setInvitations(p => p.filter(i => i.id !== id)); } catch {}
  };

  const changeRole = async (u: AdminUser, role: 'ADMIN' | 'USER' | 'GUEST') => {
    try {
      await adminApi.updateRole(u.id, role);
      setUsers(p => p.map(x => x.id === u.id ? { ...x, role } : x));
    } catch {}
  };

  const toggleZoneRestriction = async (u: AdminUser, zone: string) => {
    const current = u.restricted_zones ?? [];
    const next = current.includes(zone) ? current.filter(z => z !== zone) : [...current, zone];
    try {
      await adminApi.setRestrictions(u.id, next);
      setUsers(p => p.map(x => x.id === u.id ? { ...x, restricted_zones: next } : x));
    } catch {}
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try { await adminApi.deleteUser(deleteUser.id); setUsers(p => p.filter(x => x.id !== deleteUser.id)); } catch {}
    setDeleteUser(null);
  };

  const pendingInvitations = invitations.filter(i => !i.accepted);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Icon name="settings" size={22} className="text-blue-400" />
        <h1 className="text-xl font-bold text-slate-100">Paramètres</h1>
      </div>

      {/* ── Clé API ───────────────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Icon name="key" size={15} className="text-blue-400" /> Clé API du compte (ESP32)
        </h2>
        <p className="text-xs text-slate-500">
          Configurez chaque ESP32 avec cette clé dans le header <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">x-api-key</code>.
          Combinez-la avec la clé propre à chaque appareil (<code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">x-device-key</code>).
        </p>

        {apiKey ? (
          <>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
              <code className="flex-1 text-sm font-mono text-emerald-400 break-all">
                {apiKeyVisible ? apiKey : `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 8))}`}
              </code>
              <button onClick={() => setApiKeyVisible(v => !v)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                title={apiKeyVisible ? 'Masquer' : 'Afficher'}>
                <Icon name={apiKeyVisible ? 'visibility_off' : 'visibility'} size={15} />
              </button>
              <button onClick={copyApiKey}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                title="Copier">
                <Icon name={apiKeyCopied ? 'check' : 'content_copy'} size={15}
                  className={apiKeyCopied ? 'text-emerald-400' : ''} />
              </button>
            </div>
            <button onClick={regenerateApiKey} disabled={apiKeyRegen}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-400
                bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20
                disabled:opacity-60 rounded-xl transition-colors">
              {apiKeyRegen
                ? <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                : <Icon name="refresh" size={14} />}
              Régénérer la clé API
            </button>
            <p className="text-xs text-slate-600">
              ⚠ Régénérer invalide immédiatement l'ancienne clé — tous les ESP32 devront être mis à jour.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <Icon name="warning" size={13} /> Aucune clé API générée pour ce compte.
            </p>
            <button onClick={regenerateApiKey} disabled={apiKeyRegen}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400
                bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20
                disabled:opacity-60 rounded-xl transition-colors w-fit">
              {apiKeyRegen
                ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                : <Icon name="add" size={14} />}
              Générer une clé API
            </button>
          </div>
        )}
      </section>

      {/* ── Seuils ────────────────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card p-6 space-y-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Icon name="notifications" size={15} className="text-amber-400" /> Seuils d'alerte
        </h2>
        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Température</p>
          <div className="pl-2 space-y-4 border-l-2 border-amber-500/30 pt-2">
            <SliderField label="Seuil alerte (WARNING)" icon="device_thermostat" accent="amber"
              value={thresholds.tempMax} min={20} max={60} step={1} unit="°C"
              onChange={v => setThresholds(p => ({ ...p, tempMax: v }))} />
            <SliderField label="Seuil critique (CRITICAL)" icon="device_thermostat" accent="red"
              value={thresholds.tempCrit} min={thresholds.tempMax + 1} max={80} step={1} unit="°C"
              onChange={v => setThresholds(p => ({ ...p, tempCrit: v }))} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Gaz (ADC 0–4095)</p>
          <div className="pl-2 space-y-4 border-l-2 border-red-500/30 pt-2">
            <SliderField label="Seuil alerte (WARNING)" icon="air" accent="amber"
              value={thresholds.gasMax} min={100} max={2000} step={50} unit=""
              onChange={v => setThresholds(p => ({ ...p, gasMax: v }))} />
            <SliderField label="Seuil critique (CRITICAL)" icon="air" accent="red"
              value={thresholds.gasCrit} min={thresholds.gasMax + 50} max={4000} step={50} unit=""
              onChange={v => setThresholds(p => ({ ...p, gasCrit: v }))} />
          </div>
        </div>
        <SliderField label="Luminosité minimale" icon="light_mode" accent="purple"
          value={thresholds.lightMin} min={0} max={1000} step={10} unit="lux"
          onChange={v => setThresholds(p => ({ ...p, lightMin: v }))} />
        <button onClick={saveThresholds} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500
            disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
          {saving
            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Icon name="save" size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer les seuils'}
        </button>
      </section>

      {/* ── Notifications ──────────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Icon name="notifications" size={15} className="text-blue-400" /> Notifications
        </h2>
        {[
          { label: 'Notifications par e-mail',    desc: 'Alertes envoyées par e-mail',        val: emailNotif, set: setEmailNotif },
          { label: 'Alertes critiques uniquement', desc: "N'envoyer que les alertes CRITICAL", val: critNotif,  set: setCritNotif  },
        ].map(({ label, desc, val, set }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
            <div>
              <p className="text-sm text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ToggleSwitch checked={val} onChange={set} />
          </div>
        ))}
      </section>

      {/* ── Invitations ────────────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
          <Icon name="mail" size={15} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Invitations</h2>
        </div>
        <div className="px-6 py-4 border-b border-slate-700/60 space-y-3">
          <p className="text-xs text-slate-500">Inviter un nouvel utilisateur (lien valable 48h)</p>
          <div className="flex gap-2">
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'USER' | 'GUEST')}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm
                text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="USER">USER</option>
              <option value="GUEST">GUEST</option>
            </select>
            <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500
                disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
              {inviting
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icon name="add" size={14} />}
              Inviter
            </button>
          </div>
          {inviteMsg && (
            <p className={`text-xs ${inviteMsg.startsWith('Invitation') ? 'text-emerald-400' : 'text-red-400'}`}>
              {inviteMsg}
            </p>
          )}
        </div>
        {pendingInvitations.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500 text-sm">
            <Icon name="mail" size={28} className="mx-auto mb-2 opacity-40" /> Aucune invitation en attente
          </div>
        ) : (
          <div className="divide-y divide-slate-700/60">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Icon name="mail" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-slate-500">Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border ${roleCls[inv.role]}`}>{inv.role}</span>
                <button onClick={() => cancelInvite(inv.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Icon name="delete" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Users & Permissions ─────────────────────────── */}
      {users.length > 0 && (
        <section className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
            <Icon name="security" size={15} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-200">Utilisateurs & Permissions</h2>
          </div>
          <div className="divide-y divide-slate-700/60">
            {users.map(u => {
              const isExpanded = expandedUser === u.id;
              const hasRestrictions = (u.restricted_zones ?? []).length > 0;
              return (
                <div key={u.id}>
                  <div className="flex items-center gap-4 px-6 py-4">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                      flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      {hasRestrictions && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          Restreint : {(u.restricted_zones ?? []).join(', ')}
                        </p>
                      )}
                    </div>
                    <select value={u.role} onChange={e => changeRole(u, e.target.value as 'ADMIN'|'USER'|'GUEST')}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs
                        text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="ADMIN">ADMIN</option>
                      <option value="USER">USER</option>
                      <option value="GUEST">GUEST</option>
                    </select>
                    {zones.length > 0 && (
                      <button onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="Gérer les restrictions de zones">
                        <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={15} />
                      </button>
                    )}
                    <button onClick={() => setDeleteUser(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Icon name="person_remove" size={14} />
                    </button>
                  </div>

                  {isExpanded && zones.length > 0 && (
                    <div className="px-6 pb-4 bg-slate-900/30 border-t border-slate-700/40">
                      <p className="text-xs text-slate-500 mt-3 mb-2">
                        Zones <strong className="text-slate-400">bloquées</strong> pour cet utilisateur (vide = accès complet) :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zones.map(z => {
                          const blocked = (u.restricted_zones ?? []).includes(z);
                          return (
                            <button key={z} onClick={() => toggleZoneRestriction(u, z)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                                border transition-colors
                                ${blocked
                                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                              {blocked && <Icon name="check" size={10} />}
                              {z}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {deleteUser && (
        <ConfirmDialog
          title="Supprimer l'utilisateur"
          message={`Supprimer "${deleteUser.name}" (${deleteUser.email}) ? Cette action est irréversible.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUser(null)}
        />
      )}
    </div>
  );
}
