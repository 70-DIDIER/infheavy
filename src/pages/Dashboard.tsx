import React from 'react';
import {
  Zap, Bell, Thermometer, Clock, Wind, Activity, Sun,
  AlertTriangle, Sofa, Utensils, Bed, Leaf,
} from 'lucide-react';
import { useSmartHome }  from '../context/SmartHomeContext';
import { StatCard }      from '../components/ui/StatCard';
import { GaugeWidget }   from '../components/sensors/GaugeWidget';
import { SensorCard }    from '../components/sensors/SensorCard';
import { RoomCard }      from '../components/sensors/RoomCard';

export function Dashboard() {
  const { sensorData, actuators, alerts, esp32Online } = useSmartHome();

  const activeDevices = actuators.filter(a => a.state).length;
  const activeAlerts  = alerts.filter(a => !a.resolved).length;
  const lastUpdate    = new Date(sensorData.timestamp)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const rooms = [
    { name: 'Salon',     icon: Sofa,     temperature: sensorData.temperature, devices: actuators.filter(a => a.room === 'Salon')     },
    { name: 'Cuisine',   icon: Utensils,                                       devices: actuators.filter(a => a.room === 'Cuisine')   },
    { name: 'Chambre 1', icon: Bed,                                            devices: actuators.filter(a => a.room === 'Chambre 1') },
    { name: 'Chambre 2', icon: Bed,                                            devices: actuators.filter(a => a.room === 'Chambre 2') },
    { name: 'Extérieur', icon: Leaf,                                           devices: actuators.filter(a => a.room === 'Extérieur') },
  ];

  const airStatus  = sensorData.airQuality === 'BON' ? 'good' : sensorData.airQuality === 'MOYEN' ? 'warning' : 'danger';
  const lightPct   = Math.min(100, (sensorData.light / 1000) * 100);

  return (
    <div className="space-y-6">
      {/* Offline banner */}
      {!esp32Online && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-semibold text-sm">ESP32 Hors Ligne</p>
            <p className="text-red-400/70 text-xs mt-0.5">Les données peuvent être obsolètes. Reconnexion automatique…</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Appareils actifs"    value={`${activeDevices}/${actuators.length}`} icon={Zap}         color="blue"                               />
        <StatCard label="Alertes actives"     value={activeAlerts}                            icon={Bell}        color={activeAlerts > 0 ? 'red' : 'green'} />
        <StatCard label="Température moy."   value={`${sensorData.temperature.toFixed(1)}°C`} icon={Thermometer} color="orange"                             />
        <StatCard label="Dernière MAJ"        value={lastUpdate}                              icon={Clock}       color="blue"                  subtext="Temps réel" />
      </div>

      {/* Sensors */}
      <section>
        <h2 className="text-base font-semibold text-slate-100 mb-4">Capteurs en temps réel</h2>

        {/* Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            { value: sensorData.temperature, max: 50,   min: 0, label: 'Température', unit: '°C',  type: 'temp'     as const, sub: '0 — 50°C'      },
            { value: sensorData.humidity,    max: 100,  min: 0, label: 'Humidité',    unit: '%',   type: 'humidity' as const, sub: '0 — 100%'      },
            { value: sensorData.gas,         max: 1000, min: 0, label: 'Gaz / Fumée', unit: 'ppm', type: 'gas'      as const, sub: 'Seuil : 500 ppm' },
          ].map(g => (
            <div key={g.label} className="bg-slate-800 border border-slate-700 rounded-card p-5 flex flex-col items-center gap-1">
              <GaugeWidget value={g.value} max={g.max} min={g.min} label={g.label} unit={g.unit} type={g.type} thresholdGas={500} />
              <p className="text-xs text-slate-600">{g.sub}</p>
            </div>
          ))}
        </div>

        {/* Extra sensor cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SensorCard
            label="Qualité de l'air" value={sensorData.airQuality} unit=""
            icon={Wind} status={airStatus} statusLabel={sensorData.airQuality}
          />
          <SensorCard
            label="Mouvement PIR"
            value={sensorData.motion ? 'Détecté' : 'Aucun'}
            unit="" icon={Activity}
            status={sensorData.motion ? 'danger' : 'good'}
            statusLabel={sensorData.motion ? 'ACTIF' : 'CALME'}
            animate={sensorData.motion}
          />
          <SensorCard
            label="Luminosité" value={sensorData.light} unit="lux"
            icon={Sun} status={sensorData.light < 100 ? 'warning' : 'good'}
            extra={
              <div className="mt-2.5">
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-amber-400 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${lightPct}%` }}
                  />
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* Rooms */}
      <section>
        <h2 className="text-base font-semibold text-slate-100 mb-4">Pièces</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {rooms.map(r => (
            <RoomCard key={r.name} name={r.name} icon={r.icon} temperature={r.temperature} devices={r.devices} online={esp32Online} />
          ))}
        </div>
      </section>
    </div>
  );
}
