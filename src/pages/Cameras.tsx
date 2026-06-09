import React, { useState, useEffect, useRef, useCallback } from 'react';
import { camerasApi } from '../services/api';
import type { CameraConfig } from '../services/api';
import { Icon } from '../components/ui/Icon';

// ── Stream type meta ──────────────────────────────────────────
const STREAM_TYPES: { value: CameraConfig['stream_type']; label: string; hint: string }[] = [
  { value: 'mjpeg',    label: 'MJPEG',     hint: 'Ex: http://192.168.1.x/video.mjpeg — flux continu, compatible la plupart des caméras IP' },
  { value: 'snapshot', label: 'Snapshot',  hint: 'Ex: http://192.168.1.x/snapshot.jpg — rafraîchi toutes les N ms' },
  { value: 'hls',      label: 'HLS',       hint: 'Ex: http://serveur/stream.m3u8 — flux HLS natif (navigateur récent requis)' },
  { value: 'iframe',   label: 'iFrame',    hint: 'Ex: http://192.168.1.x/ui — embarque l\'interface web de la caméra' },
];

const TYPE_BADGE: Record<CameraConfig['stream_type'], string> = {
  mjpeg:    'bg-blue-500/15 text-blue-400',
  snapshot: 'bg-emerald-500/15 text-emerald-400',
  hls:      'bg-purple-500/15 text-purple-400',
  iframe:   'bg-amber-500/15 text-amber-400',
};

// ── Live stream component ─────────────────────────────────────
function CameraStream({ camera, fullscreen }: { camera: CameraConfig; fullscreen: boolean }) {
  const [status, setStatus]   = useState<'loading' | 'live' | 'error'>('loading');
  const [src,    setSrc]      = useState(camera.url);
  const timerRef              = useRef<ReturnType<typeof setInterval>>();
  const h = fullscreen ? 'h-full' : 'h-48';

  useEffect(() => {
    setStatus('loading');
    setSrc(camera.url);

    if (camera.stream_type === 'snapshot' && camera.enabled) {
      timerRef.current = setInterval(() => {
        setSrc(`${camera.url}${camera.url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
        setStatus('live');
      }, camera.refresh_ms ?? 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [camera.url, camera.stream_type, camera.refresh_ms, camera.enabled]);

  if (!camera.enabled) {
    return (
      <div className={`${h} w-full flex flex-col items-center justify-center gap-2 bg-slate-900`}>
        <Icon name="videocam_off" size={32} className="text-slate-700" />
        <p className="text-xs text-slate-600">Caméra désactivée</p>
      </div>
    );
  }

  if (camera.stream_type === 'iframe') {
    return (
      <div className={`${h} w-full relative bg-slate-900`}>
        {status === 'loading' && <StreamLoading />}
        <iframe
          src={camera.url}
          title={camera.name}
          className="w-full h-full border-0"
          onLoad={() => setStatus('live')}
          onError={() => setStatus('error')}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  }

  if (camera.stream_type === 'hls') {
    return (
      <div className={`${h} w-full relative bg-black`}>
        {status === 'loading' && <StreamLoading />}
        {status === 'error'   && <StreamError />}
        <video
          src={camera.url}
          autoPlay muted playsInline
          className="w-full h-full object-cover"
          onCanPlay={() => setStatus('live')}
          onError={() => setStatus('error')}
        />
      </div>
    );
  }

  // mjpeg + snapshot
  return (
    <div className={`${h} w-full relative bg-black`}>
      {status === 'loading' && <StreamLoading />}
      {status === 'error'   && <StreamError />}
      <img
        src={src}
        alt={camera.name}
        className="w-full h-full object-cover"
        onLoad={() => setStatus('live')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

function StreamLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 z-10">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-500">Connexion…</p>
    </div>
  );
}

function StreamError() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 z-10">
      <Icon name="signal_disconnected" size={32} className="text-slate-700" />
      <p className="text-xs text-slate-500">Flux inaccessible</p>
      <p className="text-[10px] text-slate-700 px-4 text-center">
        Vérifiez l'URL et que la caméra est sur le même réseau
      </p>
    </div>
  );
}

// ── Camera card ───────────────────────────────────────────────
function CameraCard({
  camera, onEdit, onDelete, onToggle,
}: {
  camera:   CameraConfig;
  onEdit:   (c: CameraConfig) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div className={`bg-slate-800 border rounded-card overflow-hidden transition-all ${
        camera.enabled ? 'border-slate-700' : 'border-slate-700/40 opacity-60'
      }`}>
        {/* Stream */}
        <div className="relative group">
          <CameraStream camera={camera} fullscreen={false} />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setFullscreen(true)}
              className="p-2 bg-slate-900/80 rounded-xl hover:bg-blue-600 transition-colors"
              title="Plein écran"
            >
              <Icon name="fullscreen" size={16} className="text-white" />
            </button>
            <button
              onClick={() => onEdit(camera)}
              className="p-2 bg-slate-900/80 rounded-xl hover:bg-slate-700 transition-colors"
              title="Modifier"
            >
              <Icon name="edit" size={16} className="text-white" />
            </button>
            <button
              onClick={() => onDelete(camera.id)}
              className="p-2 bg-slate-900/80 rounded-xl hover:bg-red-600 transition-colors"
              title="Supprimer"
            >
              <Icon name="delete" size={16} className="text-white" />
            </button>
          </div>

          {/* Live badge */}
          {camera.enabled && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-medium">LIVE</span>
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur ${TYPE_BADGE[camera.stream_type]}`}>
              {camera.stream_type.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{camera.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{camera.zone}</p>
          </div>
          <button
            onClick={() => onToggle(camera.id, !camera.enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              camera.enabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              camera.enabled ? 'translate-x-4' : ''
            }`} />
          </button>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 absolute top-0 left-0 right-0 z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white font-medium">LIVE</span>
              </span>
              <span className="text-sm font-semibold text-white">{camera.name}</span>
              <span className="text-xs text-slate-400">{camera.zone}</span>
            </div>
            <button onClick={() => setFullscreen(false)} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
              <Icon name="fullscreen_exit" size={18} className="text-white" />
            </button>
          </div>
          <CameraStream camera={camera} fullscreen />
        </div>
      )}
    </>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────
const EMPTY: Omit<CameraConfig, 'id' | 'created_at'> = {
  name: '', url: '', stream_type: 'mjpeg', zone: '', refresh_ms: 1000, enabled: true,
};

function CameraModal({
  initial, onSave, onClose, saving,
}: {
  initial?: CameraConfig;
  onSave:   (data: Omit<CameraConfig, 'id' | 'created_at'>) => void;
  onClose:  () => void;
  saving:   boolean;
}) {
  const [form, setForm] = useState<Omit<CameraConfig, 'id' | 'created_at'>>(
    initial ? {
      name: initial.name, url: initial.url, stream_type: initial.stream_type,
      zone: initial.zone, refresh_ms: initial.refresh_ms, enabled: initial.enabled,
    } : EMPTY,
  );

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const hint = STREAM_TYPES.find(t => t.value === form.stream_type)?.hint ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-card w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-slate-100">{initial ? 'Modifier la caméra' : 'Ajouter une caméra'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <Icon name="close" size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Name */}
          <Field label="Nom">
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Caméra entrée, Salon…"
              className={INPUT_CLS}
            />
          </Field>

          {/* Zone */}
          <Field label="Zone">
            <input
              value={form.zone}
              onChange={e => set('zone', e.target.value)}
              placeholder="Salon, Entrée…"
              className={INPUT_CLS}
            />
          </Field>

          {/* Type */}
          <Field label="Type de flux">
            <select
              value={form.stream_type}
              onChange={e => set('stream_type', e.target.value as CameraConfig['stream_type'])}
              className={INPUT_CLS}
            >
              {STREAM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">{hint}</p>
          </Field>

          {/* URL */}
          <Field label="URL du flux">
            <input
              value={form.url}
              onChange={e => set('url', e.target.value)}
              placeholder="http://192.168.1.x/…"
              className={INPUT_CLS}
            />
          </Field>

          {/* Snapshot refresh */}
          {form.stream_type === 'snapshot' && (
            <Field label={`Rafraîchissement (ms) — actuel : ${form.refresh_ms} ms`}>
              <input
                type="range" min={200} max={10000} step={100}
                value={form.refresh_ms}
                onChange={e => set('refresh_ms', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>200 ms</span><span>10 s</span>
              </div>
            </Field>
          )}

          {/* Mixed-content warning */}
          <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Icon name="warning" size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300">
              Si le tableau de bord est en HTTPS et la caméra en HTTP (réseau local), le navigateur bloquera
              le flux. Ouvrez l'application en HTTP ou installez un proxy HTTPS devant la caméra.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim() || !form.url.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm
              font-medium rounded-xl transition-colors"
          >
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT_CLS = `w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm
  text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function Cameras() {
  const [cameras,  setCameras]  = useState<CameraConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<CameraConfig | null | 'new'>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [layout,   setLayout]   = useState<'grid' | 'list'>('grid');

  const load = useCallback(async () => {
    try {
      const res = await camerasApi.getAll();
      setCameras(res.data.cameras);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<CameraConfig, 'id' | 'created_at'>) => {
    setSaving(true);
    try {
      if (editing === 'new') {
        const res = await camerasApi.create(data);
        setCameras(prev => [...prev, res.data.camera]);
      } else if (editing) {
        const res = await camerasApi.update(editing.id, data);
        setCameras(prev => prev.map(c => c.id === editing.id ? res.data.camera : c));
      }
      setEditing(null);
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette caméra ?')) return;
    setDeleting(id);
    try {
      await camerasApi.remove(id);
      setCameras(prev => prev.filter(c => c.id !== id));
    } catch {}
    finally { setDeleting(null); }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const res = await camerasApi.update(id, { enabled });
      setCameras(prev => prev.map(c => c.id === id ? res.data.camera : c));
    } catch {}
  };

  const colsCls = layout === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'
    : 'grid grid-cols-1 gap-4';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Caméras</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {cameras.length} caméra{cameras.length !== 1 ? 's' : ''} configurée{cameras.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            <button
              onClick={() => setLayout('grid')}
              className={`p-2 transition-colors ${layout === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <Icon name="grid_view" size={15} />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-2 transition-colors ${layout === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              <Icon name="view_list" size={15} />
            </button>
          </div>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
              text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Icon name="add" size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && cameras.length === 0 && (
        <div className="text-center py-24 space-y-3">
          <Icon name="videocam" size={52} className="mx-auto text-slate-700" />
          <p className="text-slate-400 font-medium">Aucune caméra configurée</p>
          <p className="text-slate-600 text-sm">Ajoutez une caméra IP, MJPEG, HLS ou snapshot.</p>
          <button
            onClick={() => setEditing('new')}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500
              text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Icon name="add" size={14} />
            Ajouter une caméra
          </button>
        </div>
      )}

      {/* Camera grid */}
      {!loading && cameras.length > 0 && (
        <div className={colsCls}>
          {cameras.map(cam => (
            <div key={cam.id} className={deleting === cam.id ? 'opacity-40 pointer-events-none' : ''}>
              <CameraCard
                camera={cam}
                onEdit={setEditing}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editing !== null && (
        <CameraModal
          initial={editing === 'new' ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
