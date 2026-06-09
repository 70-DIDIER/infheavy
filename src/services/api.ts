import axios from 'axios';
import type { Device, Invitation, Threshold, Automation, SensorSummaryReading, AdminUser } from '../types';

// Empty string in dev → Vite proxy handles /api/* → localhost:3000
// Full URL in production → direct to Render
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

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
    if (error.response?.status === 401 && token && !token.startsWith('demo_')) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/api/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  verifyEmail: (token: string) =>
    api.get(`/api/auth/verify-email/${token}`),
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
  acceptInvite: (token: string, name: string, password: string) =>
    api.post('/api/auth/accept-invite', { token, name, password }),
  getMe: () =>
    api.get('/api/auth/me'),
  regenerateApiKey: () =>
    api.post('/api/auth/regenerate-api-key'),
  invite: (email: string, role: 'USER' | 'GUEST') =>
    api.post('/api/auth/invite', { email, role }),
  getInvitations: () =>
    api.get<{ invitations: Invitation[] }>('/api/auth/invitations'),
  cancelInvitation: (id: number) =>
    api.delete(`/api/auth/invitations/${id}`),
};

// ── Sensors ───────────────────────────────────────────────────────────

export const sensorApi = {
  getLatest: () =>
    api.get('/api/sensors/latest'),
  getSummary: () =>
    api.get<{ readings: SensorSummaryReading[] }>('/api/sensors/summary'),
  getHistory: (from: string, to: string, limit = 100) =>
    api.get('/api/sensors/history', { params: { from, to, limit } }),
  getByDevice: (deviceId: number, page = 1, limit = 20) =>
    api.get(`/api/sensors/device/${deviceId}`, { params: { page, limit } }),
  getStats: (period: 'day' | 'week' | 'month' | 'year' = 'day', deviceId?: number) =>
    api.get('/api/sensors/stats', {
      params: { period, ...(deviceId ? { device_id: deviceId } : {}) },
    }),
};

// ── Actuators ─────────────────────────────────────────────────────────

export const actuatorApi = {
  getAll: () =>
    api.get('/api/actuators'),
  control: (device_id: number, state: boolean) =>
    api.post('/api/actuators/command', { device_id, state }),
  getStats: (period: 'day' | 'week' | 'month' | 'year' = 'day', deviceId?: number) =>
    api.get('/api/actuators/stats', {
      params: { period, ...(deviceId ? { device_id: deviceId } : {}) },
    }),
};

// ── Alerts ────────────────────────────────────────────────────────────

export const alertApi = {
  getAll: (params?: { resolved?: boolean; severity?: string; type?: string }) =>
    api.get('/api/alerts', { params }),
  getById: (id: number) =>
    api.get(`/api/alerts/${id}`),
  resolve: (id: number) =>
    api.patch(`/api/alerts/${id}/resolve`),
};

// ── Devices (CRUD) ────────────────────────────────────────────────────

export const devicesApi = {
  getAll: (params?: { type?: string; status?: string; zone?: string }) =>
    api.get<{ devices: Device[] }>('/api/devices', { params }),
  getById: (id: number) =>
    api.get<{ device: Device }>(`/api/devices/${id}`),
  create: (data: {
    name: string; type: 'INPUT' | 'OUTPUT'; zone?: string; description?: string;
    signal_type?: string; data_type?: string; unit?: string; gpio_pin?: number;
  }) =>
    api.post('/api/devices', data),
  update: (id: number, data: Partial<{
    name: string; zone: string; description: string;
    signal_type: string; data_type: string; unit: string; gpio_pin: number;
  }>) =>
    api.put(`/api/devices/${id}`, data),
  remove: (id: number) =>
    api.delete(`/api/devices/${id}`),
  updateStatus: (id: number, status: 'ONLINE' | 'OFFLINE') =>
    api.patch(`/api/devices/${id}/status`, { status }),
  getSignalTypes: () =>
    api.get('/api/devices/signal-types'),
  getUptime: (from: string, to: string, deviceId?: number) =>
    api.get('/api/devices/uptime', {
      params: { from, to, ...(deviceId ? { device_id: deviceId } : {}) },
    }),
};

// ── Automations (CRUD) ────────────────────────────────────────────────

export const automationApi = {
  getAll: () =>
    api.get<{ automations: Automation[] }>('/api/automations'),
  getById: (id: number) =>
    api.get<{ automation: Automation }>(`/api/automations/${id}`),
  create: (data: Partial<Automation>) =>
    api.post<{ automation: Automation }>('/api/automations', data),
  update: (id: number, data: Partial<Automation>) =>
    api.put<{ automation: Automation }>(`/api/automations/${id}`, data),
  remove: (id: number) =>
    api.delete(`/api/automations/${id}`),
  toggle: (id: number) =>
    api.patch<{ automation: Automation }>(`/api/automations/${id}/toggle`),
};

// ── Energy ────────────────────────────────────────────────────────────

export const energyApi = {
  getStats: (from: string, to: string, deviceId?: number) =>
    api.get('/api/energy', {
      params: { from, to, ...(deviceId ? { device_id: deviceId } : {}) },
    }),
};

// ── Cameras ───────────────────────────────────────────────────────────

export interface CameraConfig {
  id:          number;
  name:        string;
  url:         string;
  stream_type: 'mjpeg' | 'snapshot' | 'hls' | 'iframe';
  zone:        string;
  refresh_ms:  number;
  enabled:     boolean;
  created_at:  string;
}

export const camerasApi = {
  getAll:  () =>
    api.get<{ cameras: CameraConfig[] }>('/api/cameras'),
  create:  (data: Omit<CameraConfig, 'id' | 'created_at'>) =>
    api.post<{ camera: CameraConfig }>('/api/cameras', data),
  update:  (id: number, data: Partial<Omit<CameraConfig, 'id' | 'created_at'>>) =>
    api.put<{ camera: CameraConfig }>(`/api/cameras/${id}`, data),
  remove:  (id: number) =>
    api.delete(`/api/cameras/${id}`),
};

// ── Admin ─────────────────────────────────────────────────────

export const adminApi = {
  listUsers: () =>
    api.get<{ users: AdminUser[] }>('/api/admin/users'),
  updateRole: (id: number, role: 'ADMIN' | 'USER' | 'GUEST') =>
    api.put<{ user: AdminUser }>(`/api/admin/users/${id}/role`, { role }),
  setRestrictions: (id: number, restricted_zones: string[]) =>
    api.put(`/api/admin/users/${id}/restrictions`, { restricted_zones }),
  deleteUser: (id: number) =>
    api.delete(`/api/admin/users/${id}`),
};

// ── Settings / Config ─────────────────────────────────────────────────

export const settingsApi = {
  getThresholds: async (): Promise<Threshold> => {
    const { data } = await api.get<{ config: { key: string; value: string }[] }>('/api/config');
    const map: Record<string, string> = {};
    (data.config ?? []).forEach((c) => { map[c.key] = c.value; });
    return {
      tempMax:  parseFloat(map['temp_max']        ?? '35'),
      tempCrit: parseFloat(map['temp_crit']       ?? '45'),
      gasMax:   parseFloat(map['gas_ppm_max']     ?? '800'),
      gasCrit:  parseFloat(map['gas_crit']        ?? '1500'),
      lightMin: parseFloat(map['light_threshold'] ?? '100'),
    };
  },
  updateThresholds: async (data: Threshold) => {
    await Promise.all([
      api.put('/api/config/temp_max',        { value: data.tempMax  }),
      api.put('/api/config/temp_crit',       { value: data.tempCrit }),
      api.put('/api/config/gas_ppm_max',     { value: data.gasMax   }),
      api.put('/api/config/gas_crit',        { value: data.gasCrit  }),
      api.put('/api/config/light_threshold', { value: data.lightMin }),
    ]);
  },
  getZones: async (): Promise<string[]> => {
    const { data } = await api.get<{ config: { key: string; value: string }[] }>('/api/config');
    const map: Record<string, string> = {};
    (data.config ?? []).forEach(c => { map[c.key] = c.value; });
    try { return JSON.parse(map['zones'] ?? '[]'); } catch { return []; }
  },
  updateZones: (zones: string[]) =>
    api.put('/api/config/zones', { value: JSON.stringify(zones) }),
};

export default api;
