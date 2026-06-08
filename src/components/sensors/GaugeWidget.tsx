import React from 'react';

interface Props {
  value:         number;
  max:           number;
  min?:          number;
  label:         string;
  unit:          string;
  type?:         'temp' | 'humidity' | 'gas' | 'light';
  thresholdGas?: number;
}

function arcColor(value: number, type: string, gasThreshold: number): string {
  if (type === 'temp') {
    if (value < 25) return '#10B981';
    if (value < 35) return '#F59E0B';
    return '#EF4444';
  }
  if (type === 'gas') {
    if (value > gasThreshold)       return '#EF4444';
    if (value > gasThreshold * 0.6) return '#F59E0B';
    return '#10B981';
  }
  if (type === 'humidity') return '#3B82F6';
  return '#8B5CF6';
}

function fmtValue(v: number, type: string): string {
  if (type === 'gas' || type === 'light') return Math.round(v).toString();
  return v.toFixed(1);
}

export function GaugeWidget({
  value, max, min = 0, label, unit, type = 'temp', thresholdGas = 500
}: Props) {
  const R   = 45;
  const CX  = 60;
  const CY  = 60;
  const C   = 2 * Math.PI * R;          // circumference ≈ 282.74
  const ARC = C * 0.75;                  // 270° arc ≈ 212.06
  const GAP = C - ARC;                   // ≈ 70.68

  const progress   = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const dashLen    = progress * ARC;
  const color      = arcColor(value, type, thresholdGas);
  const isDanger   = type === 'gas' && value > thresholdGas;

  return (
    <div className={`flex flex-col items-center gap-1 ${isDanger ? 'animate-pulse' : ''}`}>
      <svg viewBox="0 0 120 120" width="148" height="148">
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none" stroke="#1E3A5F" strokeWidth="9"
          strokeDasharray={`${ARC} ${GAP}`}
          strokeLinecap="round"
          transform={`rotate(135 ${CX} ${CY})`}
        />
        {/* Colored progress */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dashLen} ${C}`}
          strokeLinecap="round"
          transform={`rotate(135 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
        {/* Value */}
        <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="middle"
          fill="#F1F5F9" fontSize="17" fontWeight="700" fontFamily="system-ui">
          {fmtValue(value, type)}
        </text>
        <text x={CX} y={CY + 11} textAnchor="middle"
          fill="#94A3B8" fontSize="9" fontFamily="system-ui">
          {unit}
        </text>
        {/* Min / Max */}
        <text x="15" y="108" fill="#475569" fontSize="8" fontFamily="system-ui">{min}</text>
        <text x="95" y="108" fill="#475569" fontSize="8" fontFamily="system-ui">{max}</text>
      </svg>
      <p className="text-slate-400 text-xs font-medium -mt-1">{label}</p>
    </div>
  );
}
