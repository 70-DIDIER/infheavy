export interface User {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
}

export interface SensorData {
  temperature: number;
  humidity: number;
  gas: number;
  motion: boolean;
  light: number;
  airQuality: 'BON' | 'MAUVAIS' | 'MOYEN';
  timestamp: string;
}

export interface Actuator {
  id: number;
  name: string;
  room: string;
  type: string;
  state: boolean;
  status?: 'ONLINE' | 'OFFLINE';
}

export interface Alert {
  id: number;
  type: 'FIRE' | 'GAS_LEAK' | 'INTRUSION' | 'WATER_LEAK' | 'HIGH_TEMP' | 'POWER_CUT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  zone: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  deviceName?: string;
}

export interface HistoryEntry {
  timestamp: string;
  temperature: number;
  humidity: number;
  gas: number;
  motion: boolean;
  light: number;
}

export interface Threshold {
  tempMax:  number;
  tempCrit: number;
  gasMax:   number;
  gasCrit:  number;
  lightMin: number;
}

export interface Device {
  id: number;
  name: string;
  type: 'INPUT' | 'OUTPUT';
  status: 'ONLINE' | 'OFFLINE';
  zone: string;
  description?: string;
  signal_type?: string;
  data_type?: string;
  unit?: string;
  min_value?: number;
  max_value?: number;
  gpio_pin?: number;
  device_key?: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: 'USER' | 'GUEST';
  accepted: boolean;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
}

export interface SensorSummaryReading {
  device_id: number;
  device_name: string;
  zone: string;
  signal_type: string;
  data_type: string;
  unit: string;
  min_value: number;
  max_value: number;
  status: 'ONLINE' | 'OFFLINE';
  temperature?: number;
  humidity?: number;
  gas_ppm?: number;
  air_quality?: number;
  motion?: boolean;
  light_lux?: number;
  water_leak?: boolean;
  recorded_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  email_verified: boolean;
  created_at: string;
  restricted_zones: string[];
}

export interface Automation {
  id: number;
  name: string;
  description?: string;
  trigger_type: 'SENSOR_THRESHOLD' | 'TIME_BASED' | 'DEVICE_STATUS';
  trigger_device_id?: number;
  trigger_device_name?: string;
  trigger_condition?: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  trigger_value?: number;
  trigger_time?: string;
  action_device_id: number;
  action_device_name?: string;
  action_state: boolean;
  enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
}
