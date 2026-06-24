import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SensorData, Actuator, Alert, SensorSummaryReading } from '../types';
import { sensorApi, actuatorApi, alertApi } from '../services/api';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

const EMPTY_SENSORS: SensorData = {
  temperature: 0, humidity: 0, gas: 0,
  motion: false, light: 0, airQuality: 'BON',
  timestamp: new Date().toISOString(),
};

interface State {
  sensorData:     SensorData;
  sensorReadings: SensorSummaryReading[];
  sensorLoading:  boolean;
  actuators:      Actuator[];
  alerts:         Alert[];
  esp32Online:    boolean;
  wsConnected:    boolean;
  newAlert:       Alert | null;
}

function airQualityLabel(value: unknown): SensorData['airQuality'] {
  if (typeof value === 'string') {
    const v = value.toUpperCase();
    if (v === 'BON' || v === 'MOYEN' || v === 'MAUVAIS') return v as SensorData['airQuality'];
  }
  if (typeof value === 'number') {
    if (value >= 67) return 'BON';
    if (value >= 34) return 'MOYEN';
    return 'MAUVAIS';
  }
  return 'BON';
}

function inferActuatorType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ventilateur') || n.includes('fan'))   return 'fan';
  if (n.includes('alarme') || n.includes('alarm') || n.includes('sirène')) return 'alarm';
  return 'light';
}

function normalizeSensor(raw: Record<string, unknown>, prev: SensorData): SensorData {
  const r = (raw.reading as Record<string, unknown>) ?? raw;
  return {
    temperature: (r.temperature as number)  ?? prev.temperature,
    humidity:    (r.humidity    as number)  ?? prev.humidity,
    gas:         (r.gas_ppm     as number)  ?? (r.gas as number) ?? prev.gas,
    motion:      (r.motion      as boolean) ?? prev.motion,
    light:       (r.light_lux   as number)  ?? (r.light as number) ?? prev.light,
    airQuality:  airQualityLabel(r.air_quality ?? r.airQuality) ?? prev.airQuality,
    timestamp:   new Date().toISOString(),
  };
}

function normalizeActuator(raw: Record<string, unknown>): Actuator {
  const stateRaw = raw.state ?? raw.status;
  return {
    id:     (raw.id   as number) ?? 0,
    name:   (raw.name as string) ?? '',
    room:  ((raw.zone ?? raw.room) as string) ?? '',
    type:   inferActuatorType((raw.name as string) ?? ''),
    state:  typeof stateRaw === 'boolean' ? stateRaw : stateRaw === 'on' || stateRaw === true,
    status: (raw.status as Actuator['status']) ?? 'OFFLINE',
  };
}

function normalizeAlert(raw: Record<string, unknown>): Alert {
  return {
    id:         (raw.id        as number)  ?? 0,
    type:       (raw.type      as Alert['type'])     ?? 'FIRE',
    severity:   (raw.severity  as Alert['severity']) ?? 'WARNING',
    zone:       (raw.zone      as string)  ?? '',
    message:    (raw.message   as string)  ?? '',
    resolved:   (raw.resolved  as boolean) ?? false,
    createdAt: ((raw.created_at ?? raw.createdAt) as string) ?? new Date().toISOString(),
    deviceName: (raw.device_name as string) ?? undefined,
  };
}

export function useWebSocket(token: string | null) {
  const [state, setState] = useState<State>({
    sensorData: EMPTY_SENSORS, sensorReadings: [], sensorLoading: true,
    actuators: [], alerts: [],
    esp32Online: false, wsConnected: false, newAlert: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const knownIds  = useRef(new Set<number>());

  // ── Initial data load via HTTP (one shot, populates state before first WS event)
  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      sensorApi.getLatest(),
      actuatorApi.getAll(),
      alertApi.getAll(),
      sensorApi.getSummary(),
    ]).then(([sensors, actuators, alerts, summary]) => {
      setState(p => {
        const next = { ...p, sensorLoading: false };
        if (sensors.status === 'fulfilled') {
          next.sensorData  = normalizeSensor(sensors.value.data as Record<string, unknown>, p.sensorData);
          next.esp32Online = true;
        }
        if (actuators.status === 'fulfilled') {
          const raw  = actuators.value.data as Record<string, unknown>;
          const list = (raw.actuators ?? raw) as Record<string, unknown>[];
          if (Array.isArray(list)) next.actuators = list.map(d => normalizeActuator(d));
        }
        if (alerts.status === 'fulfilled') {
          const raw  = alerts.value.data as Record<string, unknown>;
          const list = (raw.alerts ?? raw) as Record<string, unknown>[];
          if (Array.isArray(list)) {
            const normalized = list.map(a => normalizeAlert(a));
            normalized.forEach(a => knownIds.current.add(a.id));
            next.alerts = normalized;
          }
        }
        if (summary.status === 'fulfilled') {
          next.sensorReadings = summary.value.data.readings ?? [];
          if (!next.esp32Online) {
            next.esp32Online = next.sensorReadings.some(r => r.status === 'ONLINE');
          }
        }
        return next;
      });
    });
  }, [token]);

  // ── WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['polling', 'websocket'], // polling first — more reliable through cloud proxies
      upgrade: true,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(p => ({ ...p, wsConnected: true }));
    });

    socket.on('disconnect', () => {
      setState(p => ({ ...p, wsConnected: false }));
    });

    // ── Sensor pushed by ESP32 — updates reading row and marks device ONLINE instantly
    socket.on('sensor:update', (data: Record<string, unknown>) => {
      const deviceId = data.deviceId as number;
      setState(p => ({
        ...p,
        esp32Online: true,
        sensorData: normalizeSensor(data, p.sensorData),
        sensorReadings: p.sensorReadings.map(r =>
          r.device_id === deviceId
            ? {
                ...r,
                status:      'ONLINE' as const,
                recorded_at: (data.timestamp as string) ?? r.recorded_at,
                temperature:  data.temperature  != null ? data.temperature  as number  : r.temperature,
                humidity:     data.humidity     != null ? data.humidity     as number  : r.humidity,
                gas_ppm:      data.gas_ppm      != null ? data.gas_ppm      as number  : r.gas_ppm,
                air_quality:  data.air_quality  != null ? data.air_quality  as number  : r.air_quality,
                motion:       data.motion       != null ? data.motion       as boolean : r.motion,
                light_lux:    data.light_lux    != null ? data.light_lux    as number  : r.light_lux,
                water_leak:   data.water_leak   != null ? data.water_leak   as boolean : r.water_leak,
              }
            : r
        ),
      }));
    });

    // ── Per-device ONLINE / OFFLINE (readings emit ONLINE, scheduler emits OFFLINE)
    socket.on('device:status', ({ deviceId, status }: { deviceId: number; status: 'ONLINE' | 'OFFLINE' }) => {
      setState(p => ({
        ...p,
        esp32Online: status === 'ONLINE' ? true : p.esp32Online,
        sensorReadings: p.sensorReadings.map(r =>
          r.device_id === deviceId ? { ...r, status } : r
        ),
        actuators: p.actuators.map(a =>
          a.id === deviceId ? { ...a, status } : a
        ),
      }));
    });

    // ── Relay state changed (from dashboard command OR physical switch)
    socket.on('actuator:update', (data: Record<string, unknown>) => {
      setState(p => ({
        ...p,
        actuators: p.actuators.map(a =>
          a.id === (data.id as number) ? { ...a, state: data.state as boolean } : a
        ),
      }));
    });

    // ── New alert from ESP32
    socket.on('alert:new', (data: Record<string, unknown>) => {
      const alert = normalizeAlert(data);
      if (!knownIds.current.has(alert.id)) {
        knownIds.current.add(alert.id);
        setState(p => ({
          ...p,
          alerts:   [alert, ...p.alerts],
          newAlert: alert,
        }));
      }
    });

    // ── Alert resolved
    socket.on('alert:resolved', ({ id }: { id: number }) => {
      setState(p => ({
        ...p,
        alerts: p.alerts.map(a => a.id === id ? { ...a, resolved: true } : a),
      }));
    });

    // ── Heartbeat — bulk-mark ESP32 devices ONLINE by their numeric IDs
    socket.on('device:online', ({ deviceIds }: { deviceIds?: number[] }) => {
      setState(p => ({
        ...p,
        esp32Online: true,
        sensorReadings: deviceIds
          ? p.sensorReadings.map(r => deviceIds.includes(r.device_id) ? { ...r, status: 'ONLINE' as const } : r)
          : p.sensorReadings.map(r => ({ ...r, status: 'ONLINE' as const })),
        actuators: deviceIds
          ? p.actuators.map(a => deviceIds.includes(a.id) ? { ...a, status: 'ONLINE' as const } : a)
          : p.actuators.map(a => ({ ...a, status: 'ONLINE' as const })),
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // ── Commands (HTTP for reliable delivery + optimistic UI update)
  const sendCommand = useCallback(async (actuatorId: number, newState: boolean) => {
    setState(p => ({
      ...p,
      actuators: p.actuators.map(a => a.id === actuatorId ? { ...a, state: newState } : a),
    }));
    try {
      await actuatorApi.control(actuatorId, newState);
    } catch (err: unknown) {
      // Only roll back on explicit 4xx rejection (bad request, not found, etc.).
      // On timeout or 5xx the server may have already saved the command —
      // rolling back would invert the display vs the actual relay state.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500) {
        setState(p => ({
          ...p,
          actuators: p.actuators.map(a => a.id === actuatorId ? { ...a, state: !newState } : a),
        }));
      }
    }
  }, []);

  const resolveAlert = useCallback((id: number) => {
    setState(p => ({
      ...p,
      alerts: p.alerts.map(a => a.id === id ? { ...a, resolved: true } : a),
    }));
  }, []);

  const clearNewAlert = useCallback(() => setState(p => ({ ...p, newAlert: null })), []);

  return { ...state, sendCommand, resolveAlert, clearNewAlert };
}
