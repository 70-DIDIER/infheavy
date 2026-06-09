import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SensorData, Actuator, Alert } from '../types';
import { sensorApi, actuatorApi, alertApi } from '../services/api';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

const EMPTY_SENSORS: SensorData = {
  temperature: 0, humidity: 0, gas: 0,
  motion: false, light: 0, airQuality: 'BON',
  timestamp: new Date().toISOString(),
};

interface State {
  sensorData:  SensorData;
  actuators:   Actuator[];
  alerts:      Alert[];
  esp32Online: boolean;
  wsConnected: boolean;
  newAlert:    Alert | null;
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
    sensorData: EMPTY_SENSORS, actuators: [], alerts: [],
    esp32Online: false, wsConnected: false, newAlert: null,
  });

  const socketRef  = useRef<Socket | null>(null);
  const knownIds   = useRef(new Set<number>());

  // ── Initial data load via HTTP (one shot, populates state before first WS event)
  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      sensorApi.getLatest(),
      actuatorApi.getAll(),
      alertApi.getAll(),
    ]).then(([sensors, actuators, alerts]) => {
      setState(p => {
        let next = { ...p };
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
        return next;
      });
    });
  }, [token]);

  // ── WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay:    1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(p => ({ ...p, wsConnected: true }));
    });

    socket.on('disconnect', () => {
      setState(p => ({ ...p, wsConnected: false }));
    });

    // ── Sensor pushed by ESP32
    socket.on('sensor:update', (data: Record<string, unknown>) => {
      setState(p => ({
        ...p,
        esp32Online: true,
        sensorData: normalizeSensor(data, p.sensorData),
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

    // ── ESP32 heartbeat — mark as online
    socket.on('device:online', () => {
      setState(p => ({ ...p, esp32Online: true }));
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
    } catch {
      // Rollback on failure
      setState(p => ({
        ...p,
        actuators: p.actuators.map(a => a.id === actuatorId ? { ...a, state: !newState } : a),
      }));
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
