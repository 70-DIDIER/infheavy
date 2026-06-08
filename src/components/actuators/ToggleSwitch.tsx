import React from 'react';

interface Props {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  disabled?: boolean;
  size?:     'sm' | 'md';
}

export function ToggleSwitch({ checked, onChange, disabled = false, size = 'md' }: Props) {
  const trackW = size === 'sm' ? 'w-9'    : 'w-12';
  const trackH = size === 'sm' ? 'h-5'    : 'h-[26px]';
  const thumbS = size === 'sm' ? 'w-3.5 h-3.5 ml-[3px]' : 'w-[18px] h-[18px] ml-[4px]';
  const shift  = size === 'sm' ? 'translate-x-4' : 'translate-x-[22px]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex items-center rounded-full transition-colors duration-300 focus:outline-none
        ${trackW} ${trackH}
        ${checked ? 'bg-emerald-500' : 'bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block rounded-full bg-white shadow-md transform transition-transform duration-300
        ${thumbS} ${checked ? shift : 'translate-x-0'}`}
      />
    </button>
  );
}
