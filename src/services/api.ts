import axios from 'axios';
import type { SensorData, Actuator, Alert, HistoryEntry, Threshold, User } from '../types';

const API_BASE = 'https://smarth-rlir.onrender.com';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const token = localStorage.getItem('jwt_token');
    // Only auto-logout for real JWTs (not demo tokens) — demo tokens always get 401 from real API
    if (error.response?.status === 401 && token && !token.startsWith('demo_')) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Mock data (used as initial state and API fallback) ────────────────

export const MOCK_SENSORS: SensorData = {
  temperature: 26.5,
  humidity:    62,
  gas:         180,
  motion:      false,
  light:       420,
  airQuality:  'BON',
  timestamp:   new Date().toISOString(),
};

export const MOCK_ACTUATORS: Actuator[] = [
  { id: 'light_salon',   name: 'Lumière Salon',     room: 'Salon',     type: 'light', state: false },
  { id: 'light_ch1',     name: 'Lumière Ch. 1',     room: 'Chambre 1', type: 'light', state: true  },
  { id: 'light_ch2',     name: 'Lumière Ch. 2',     room: 'Chambre 2', type: 'light', state: false },
  { id: 'light_cuisine', name: 'Lumière Cuisine',   room: 'Cuisine',   type: 'light', state: false },
  { id: 'light_ext',     name: 'Lumière Extérieur', room: 'Extérieur', type: 'light', state: true  },
  { id: 'ventilateur',   name: 'Ventilateur',       room: 'Salon',     type: 'fan',   state: false },
  { id: 'alarme',        name: 'Alarme',            room: 'Général',   type: 'alarm', state: false },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 1, type: 'GAS_LEAK',  severity: 'CRITICAL', zone: 'Cuisine',   message: 'Fuite de gaz détectée',     resolved: false, createdAt: new Date(Date.now() - 600_000).toISOString()   },
  { id: 2, type: 'TEMP_HIGH', severity: 'WARNING',  zone: 'Salon',     message: 'Température élevée : 38°C',resolved: false, createdAt: new Date(Date.now() - 1_800_000).toISOString() },
  { id: 3, type: 'INTRUSION', severity: 'CRITICAL', zone: 'Extérieur', message: 'Mouvement suspect détecté', resolved: true,  createdAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 4, type: 'AIR_BAD',   severity: 'INFO',     zone: 'Salon',     message: "Qualité de l'air dégradée", resolved: true,  createdAt: new Date(Date.now() - 7_200_000).toISOString() },
];

export const MOCK_USERS: User[] = [
  { id: 1, email: 'admin@smarthome.io', prenom: 'Admin', nom: 'SmartHome', role: 'ADMIN' },
  { id: 2, email: 'user@smarthome.io',  prenom: 'Marie', nom: 'Dupont',    role: 'USER'  },
  { id: 3, email: 'guest@smarthome.io', prenom: 'Jean',  nom: 'Martin',    role: 'GUEST' },
];

function genHistory(): HistoryEntry[] {
  const now = Date.now();
  return Array.from({ length: 48 }, (_, i) => ({
    timestamp:   new Date(now - (47 - i) * 1_800_000).toISOString(),
    temperature: 18 + Math.random() * 18,
    humidity:    40 + Math.random() * 40,
    gas:         100 + Math.random() * 400,
    motion:      Math.random() > 0.85,
    light:       50  + Math.random() * 900,
  }));
}
export const MOCK_HISTORY: HistoryEntry[] = genHistory();
export const MOCK_THRESHOLDS: Threshold = { tempMax: 35, gasMax: 500, lightMin: 100 };

// ── Auth ──────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
};

// ── Sensors ───────────────────────────────────────────────────────────

export const sensorApi = {
  getLatest: () =>
    api.get<SensorData>('/api/sensors/latest'),
  getHistory: (period: string, sensor?: string) =>
    api.get<HistoryEntry[]>('/api/sensors/history', { params: { period, sensor } }),
};

// ── Actuators / Devices ───────────────────────────────────────────────

export const actuatorApi = {
  // Real API: GET /api/devices (returns list of devices incl. actuators)
  getAll: () =>
    api.get<Actuator[]>('/api/devices'),
  // Real API: POST /api/actuators/command  { actuator, state }
  control: (actuator: string, state: boolean) =>
    api.post('/api/actuators/command', { actuator, state }),
};

// ── Alerts ────────────────────────────────────────────────────────────

export const alertApi = {
  getAll: () =>
    api.get<Alert[]>('/api/alerts'),
  resolve: (id: number) =>
    api.patch(`/api/alerts/${id}/resolve`),
};

// ── Settings / Config ─────────────────────────────────────────────────

export const settingsApi = {
  // Real API: GET /api/config
  getThresholds: () =>
    api.get<Threshold>('/api/config'),
  // Real API: PUT /api/config/{key}  (one call per key)
  updateThresholds: async (data: Threshold) => {
    await Promise.all([
      api.put('/api/config/tempMax',  { value: data.tempMax  }),
      api.put('/api/config/gasMax',   { value: data.gasMax   }),
      api.put('/api/config/lightMin', { value: data.lightMin }),
    ]);
  },
  getUsers: () =>
    api.get<User[]>('/api/users'),
  updateUserRole: (userId: number, role: string) =>
    api.patch(`/api/users/${userId}/role`, { role }),
};

export default api;
