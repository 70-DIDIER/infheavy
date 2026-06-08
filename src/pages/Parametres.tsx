import React, { useState, useEffect } from 'react';
import { Settings, Save, Users, Bell, Thermometer, Wind, Sun, Loader2 } from 'lucide-react';
import { settingsApi, MOCK_USERS, MOCK_THRESHOLDS } from '../services/api';
import { ToggleSwitch } from '../components/actuators/ToggleSwitch';
import type { User, Threshold } from '../types';

const ROLES = ['ADMIN', 'USER', 'GUEST'] as const;

const sliderColors: Record<string, string> = {
  amber:  '#F59E0B',
  red:    '#EF4444',
  purple: '#8B5CF6',
};

function SliderField({
  label, icon: Icon, value, min, max, step, unit, accent,
  onChange,
}: {
  label: string; icon: typeof Thermometer; value: number;
  min: number; max: number; step: number; unit: string;
  accent: 'amber' | 'red' | 'purple';
  onChange: (v: number) => void;
}) {
  const pct   = ((value - min) / (max - min)) * 100;
  const color = sliderColors[accent];
  const textCls = accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-red-400' : 'text-purple-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={15} className={textCls} />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${textCls}`}>{value} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #334155 ${pct}%, #334155 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

export function Parametres() {
  const [thresholds, setThresholds] = useState<Threshold>(MOCK_THRESHOLDS);
  const [emailNotif, setEmailNotif] = useState(true);
  const [critNotif,  setCritNotif]  = useState(true);
  const [users,      setUsers]      = useState<User[]>(MOCK_USERS);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    settingsApi.getThresholds().then(r => setThresholds(r.data)).catch(() => {});
    settingsApi.getUsers().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const saveThresholds = async () => {
    setSaving(true);
    try { await settingsApi.updateThresholds(thresholds); } catch {}
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const changeRole = async (userId: number, role: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as User['role'] } : u));
    try { await settingsApi.updateUserRole(userId, role); } catch {}
  };

  const roleCls: Record<string, string> = {
    ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
    USER:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
    GUEST: 'bg-slate-700 text-slate-400 border-slate-600',
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-blue-400" />
        <h1 className="text-xl font-bold text-slate-100">Paramètres</h1>
      </div>

      {/* ── Seuils ───────────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card p-6 space-y-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Bell size={15} className="text-amber-400" />
          Seuils d'alerte
        </h2>

        <SliderField
          label="Température maximale" icon={Thermometer} accent="amber"
          value={thresholds.tempMax} min={20} max={60} step={1} unit="°C"
          onChange={v => setThresholds(p => ({ ...p, tempMax: v }))}
        />
        <SliderField
          label="Gaz maximal" icon={Wind} accent="red"
          value={thresholds.gasMax} min={100} max={1000} step={10} unit="ppm"
          onChange={v => setThresholds(p => ({ ...p, gasMax: v }))}
        />
        <SliderField
          label="Luminosité minimale" icon={Sun} accent="purple"
          value={thresholds.lightMin} min={0} max={1000} step={10} unit="lux"
          onChange={v => setThresholds(p => ({ ...p, lightMin: v }))}
        />

        <button onClick={saveThresholds} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60
            text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer les seuils'}
        </button>
      </section>

      {/* ── Notifications ────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Bell size={15} className="text-blue-400" />
          Notifications
        </h2>
        {[
          { label: 'Notifications par e-mail',    desc: 'Recevoir les alertes par e-mail',     val: emailNotif, set: setEmailNotif },
          { label: 'Alertes critiques uniquement', desc: 'N\'envoyer que les alertes CRITICAL',  val: critNotif,  set: setCritNotif  },
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

      {/* ── Utilisateurs ─────────────────────────── */}
      <section className="bg-slate-800 border border-slate-700 rounded-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
          <Users size={15} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Gestion des utilisateurs</h2>
        </div>
        <div className="divide-y divide-slate-700/60">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {u.prenom[0]}{u.nom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium">{u.prenom} {u.nom}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              <select
                value={u.role}
                onChange={e => changeRole(u.id, e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border bg-slate-900 cursor-pointer
                  focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${roleCls[u.role]}`}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
