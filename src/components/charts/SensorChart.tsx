import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { HistoryEntry } from '../../types';

type Sensor = 'temperature' | 'humidity' | 'gas' | 'light';

interface Props {
  data:          HistoryEntry[];
  sensors:       Sensor[];
  tempThreshold?: number;
  gasThreshold?:  number;
}

const meta: Record<Sensor, { color: string; label: string }> = {
  temperature: { color: '#F59E0B', label: 'Température (°C)' },
  humidity:    { color: '#3B82F6', label: 'Humidité (%)'      },
  gas:         { color: '#EF4444', label: 'Gaz (ppm)'         },
  light:       { color: '#8B5CF6', label: 'Lumière (lux)'     },
};

export function SensorChart({ data, sensors, tempThreshold = 35, gasThreshold = 500 }: Props) {
  const chartData = data.map(e => ({
    time:        new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    temperature: +e.temperature.toFixed(1),
    humidity:    +e.humidity.toFixed(1),
    gas:         Math.round(e.gas),
    light:       Math.round(e.light),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#334155' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
          labelStyle={{ color: '#94A3B8' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '12px' }}
          formatter={v => <span style={{ color: '#94A3B8', fontSize: '11px' }}>{meta[v as Sensor]?.label ?? v}</span>}
        />
        {sensors.includes('temperature') && (
          <ReferenceLine y={tempThreshold} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
        )}
        {sensors.includes('gas') && (
          <ReferenceLine y={gasThreshold}  stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
        )}
        {sensors.map(s => (
          <Line
            key={s} type="monotone" dataKey={s}
            stroke={meta[s].color} strokeWidth={2}
            dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
