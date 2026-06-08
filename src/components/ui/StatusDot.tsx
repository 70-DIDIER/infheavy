import React from 'react';

interface Props {
  online: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };

export function StatusDot({ online, size = 'md', showLabel = false }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`${sizes[size]} rounded-full relative flex-shrink-0`}>
        <span className={`absolute inset-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {online && (
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${online ? 'text-emerald-400' : 'text-red-400'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
