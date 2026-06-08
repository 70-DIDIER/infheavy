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
  id: string;
  name: string;
  room: string;
  type: 'light' | 'fan' | 'alarm';
  state: boolean;
}

export interface Alert {
  id: number;
  type: 'FIRE' | 'GAS_LEAK' | 'INTRUSION' | 'TEMP_HIGH' | 'TEMP_LOW' | 'AIR_BAD';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  zone: string;
  message: string;
  resolved: boolean;
  createdAt: string;
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
  tempMax: number;
  gasMax: number;
  lightMin: number;
}
