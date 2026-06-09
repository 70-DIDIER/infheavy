import React, { useState, useEffect, useCallback } from 'react';
import { Icon }          from '../components/ui/Icon';
import { settingsApi }   from '../services/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const ZONE_ICONS: Record<string, string> = {
  salon: '🛋️', cuisine: '🍳', chambre: '🛏️', salle: '🚿',
  bureau: '💼', garage: '🚗', extérieur: '🌿', exterior: '🌿',
  entrée: '🚪', grenier: '📦', cave: '🍷', jardin: '🌱',
};

function zoneEmoji(name: string): string {
  const key = name.toLowerCase().split(' ')[0];
  return ZONE_ICONS[key] ?? '📍';
}

export function Zones() {
  const [zones,         setZones]         = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [newZone,       setNewZone]       = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [deleteTarget,  setDeleteTarget]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const z = await settingsApi.getZones();
      setZones(z);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = async (next: string[]) => {
    await settingsApi.updateZones(next);
    setZones(next);
  };

  const addZone = async () => {
    const name = newZone.trim();
    if (!name) { setError('Le nom de la zone est obligatoire'); return; }
    if (zones.map(z => z.toLowerCase()).includes(name.toLowerCase())) {
      setError('Cette zone existe déjà'); return;
    }
    setSaving(true); setError('');
    try { await persist([...zones, name]); setNewZone(''); }
    catch { setError("Impossible d'enregistrer la zone"); }
    setSaving(false);
  };

  const deleteZone = async () => {
    if (!deleteTarget) return;
    try { await persist(zones.filter(z => z !== deleteTarget)); }
    catch {}
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon name="location_on" size={22} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-100">Zones</h1>
          <p className="text-slate-400 text-sm">
            {zones.length} zone{zones.length !== 1 ? 's' : ''} — utilisées pour organiser les appareils
          </p>
        </div>
      </div>

      {/* Add zone */}
      <div className="bg-slate-800 border border-slate-700 rounded-card p-5 space-y-3">
        <p className="text-sm font-medium text-slate-300">Ajouter une zone</p>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            value={newZone}
            onChange={e => { setNewZone(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && addZone()}
            placeholder="ex. Salon, Cuisine, Chambre 1, Garage…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
              text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={addZone}
            disabled={saving || !newZone.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500
              disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Icon name="add" size={15} />}
            Ajouter
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Les zones créées ici seront disponibles lors de la création d'un appareil.
        </p>
      </div>

      {/* Zone list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Icon name="home" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-slate-400">Aucune zone définie</p>
          <p className="text-xs text-slate-600 mt-1">Ajoutez votre première zone ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {zones.map(zone => (
            <div
              key={zone}
              className="group bg-slate-800 border border-slate-700 hover:border-slate-600
                rounded-card px-4 py-3.5 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg leading-none flex-shrink-0">{zoneEmoji(zone)}</span>
                <p className="text-sm font-medium text-slate-200 truncate">{zone}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(zone)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400
                  hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Supprimer"
              >
                <Icon name="delete" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer la zone"
          message={`Supprimer la zone "${deleteTarget}" ? Les appareils qui lui sont assignés ne seront pas supprimés, mais leur zone deviendra orpheline.`}
          onConfirm={deleteZone}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
