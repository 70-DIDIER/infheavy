// REST polling — interface identical to former WebSocket hook so all consumers unchanged.
import { useState, useEffect, useCallback, useRef } from 'react';
import type { SensorData, Actuator, Alert } from '../types';
import {
  sensorApi, actuatorApi, alertApi,
  MOCK_SENSORS, MOCK_ACTUATORS, MOCK_ALERTS,
} from '../services/api';

const SENSOR_MS = 5_000;
const DEVICE_MS = 8_000;
const ALERT_MS  = 12_000;

interface State {
  sensorData:  SensorData;
  actuators:   Actuator[];
  alerts:      Alert[];
  esp32Online: boolean;
  wsConnected: boolean; // true = REST API reachable
  newAlert:    Alert | null;
}

function normalizeSensor(raw: Record<string, unknown>, prev: SensorData): SensorData {
  return {
    temperature: (raw.temperature as number)  ?? prev.temperature,
    humidity:    (raw.humidity    as number)  ?? prev.humidity,
    gas:         (raw.gas         as number)  ?? prev.gas,
    motion:      (raw.motion      as boolean) ?? prev.motion,
    light:       (raw.light       as number)  ?? prev.light,
    airQuality: ((raw.airQuality ?? raw.air_quality) as SensorData['airQuality']) ?? prev.airQuality,
    timestamp:   new Date().toISOString(),
  };
}

function normalizeActuator(raw: Record<string, unknown>): Actuator {
  const stateRaw = raw.state ?? raw.status;
  return {
    id:    (raw.id   as string) ?? '',
    name:  (raw.name as string) ?? '',
    room: ((raw.room ?? raw.zone) as string) ?? '',
    type:  (raw.type as Actuator['type'])  ?? 'light',
    state: typeof stateRaw === 'boolean' ? stateRaw : stateRaw === 'on' || stateRaw === true,
  };
}

function isAuthError(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 401;
}

export function useWebSocket(token: string | null) {
  const [state, setState] = useState<State>({
    sensorData:  MOCK_SENSORS,
    actuators:   MOCK_ACTUATORS,
    alerts:      MOCK_ALERTS,
    esp32Online: true,
    wsConnected: false,
    newAlert:    null,
  });

  const knownIds   = useRef(new Set(MOCK_ALERTS.map(a => a.id)));
  const sensorFail = useRef(0);   // counts non-auth failures only

  // ── Sensor polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const { data } = await sensorApi.getLatest();
        sensorFail.current = 0;
        setState(p => ({
          ...p, wsConnected: true, esp32Online: true,
          sensorData: normalizeSensor(data as Record<string, unknown>, p.sensorData),
        }));
      } catch (err) {
        if (isAuthError(err)) {
          // 401 = demo token, not a real outage — keep mock data, mark API unreachable
          setState(p => ({ ...p, wsConnected: false }));
        } else {
          // Real connectivity/server error
          sensorFail.current++;
          if (sensorFail.current >= 3)
            setState(p => ({ ...p, wsConnected: false, esp32Online: false }));
        }
      }
    };
    run();
    const id = setInterval(run, SENSOR_MS);
    return () => clearInterval(id);
  }, [token]);

  // ── Device polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const { data } = await actuatorApi.getAll();
        if (Array.isArray(data) && data.length)
          setState(p => ({
            ...p,
            actuators: data.map(d => normalizeActuator(d as Record<string, unknown>)),
          }));
      } catch {}
    };
    run();
    const id = setInterval(run, DEVICE_MS);
    return () => clearInterval(id);
  }, [token]);

  // ── Alert polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const { data } = await alertApi.getAll();
        if (Array.isArray(data)) {
          (data as Alert[]).forEach(a => {
            if (!knownIds.current.has(a.id) && !a.resolved)
              setState(p => ({ ...p, newAlert: a }));
            knownIds.current.add(a.id);
          });
          setState(p => ({ ...p, alerts: data as Alert[] }));
        }
      } catch {}
    };
    run();
    const id = setInterval(run, ALERT_MS);
    return () => clearInterval(id);
  }, [token]);

  // ── Commands ────────────────────────────────────────────────────────
  const sendCommand = useCallback(async (actuatorId: string, newState: boolean) => {
    setState(p => ({
      ...p,
      actuators: p.actuators.map(a => a.id === actuatorId ? { ...a, state: newState } : a),
    }));
    try {
      await actuatorApi.control(actuatorId, newState);
    } catch {
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
