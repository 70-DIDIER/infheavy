import React, { useState, useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { useSmartHome } from '../context/SmartHomeContext';
import { DeviceCard }   from '../components/actuators/DeviceCard';

export function Actionneurs() {
  const { actuators, esp32Online, sendCommand } = useSmartHome();
  const [filter, setFilter] = useState('Tout');

  const rooms = useMemo(
    () => ['Tout', ...new Set(actuators.map(a => a.room).filter(Boolean))],
    [actuators],
  );

  const filtered = filter === 'Tout' ? actuators : actuators.filter(a => a.room === filter);
  const activeCount = actuators.filter(a => a.state).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Contrôle des appareils</h1>
          <p className="text-slate-400 text-sm mt-0.5">{activeCount} appareil{activeCount > 1 ? 's' : ''} allumé{activeCount > 1 ? 's' : ''} sur {actuators.length}</p>
        </div>
        {!esp32Online && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
            <Icon name="wifi_off" size={15} />
            <span>ESP32 hors ligne</span>
          </div>
        )}
      </div>

      {/* Room filter */}
      <div className="flex flex-wrap gap-2">
        {rooms.map(room => (
          <button key={room} onClick={() => setFilter(room)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${filter === room
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
              }`}
          >
            {room}
          </button>
        ))}
      </div>

      {/* Devices grid */}
      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onToggle={sendCommand}
              disabled={!esp32Online}
            />
          ))}
        </div>

        {/* Offline overlay */}
        {!esp32Online && (
          <div className="absolute inset-0 bg-slate-900/60 rounded-card flex flex-col items-center justify-center backdrop-blur-sm">
            <Icon name="wifi_off" size={40} className="text-red-400 mb-3" />
            <p className="text-red-400 font-bold text-lg">ESP32 Hors Ligne</p>
            <p className="text-slate-400 text-sm mt-1">Les commandes sont désactivées</p>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>Aucun appareil dans cette pièce</p>
        </div>
      )}
    </div>
  );
}
