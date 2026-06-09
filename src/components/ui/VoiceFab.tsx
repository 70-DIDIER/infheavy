import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVoiceControl, WAKE_PHRASES } from '../../hooks/useVoiceControl';
import { Icon } from './Icon';

export function VoiceFab() {
  const {
    listening, wakeActive, wakeHeard,
    interim, supported, lastExchange,
    toggleMic, toggleWakeWord,
  } = useVoiceControl();

  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-open when response arrives
  useEffect(() => {
    if (lastExchange) setOpen(true);
  }, [lastExchange]);

  // Auto-open when wake word fires
  useEffect(() => {
    if (wakeHeard) setOpen(true);
  }, [wakeHeard]);

  const handleMic = () => { toggleMic(); setOpen(true); };

  if (!supported) return null;

  // Button appearance
  const btnClass = listening
    ? 'bg-red-500/15 border-red-500/40 text-red-400 ring-2 ring-red-500/20'
    : wakeActive
      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600';

  return (
    <div className="relative flex-shrink-0" ref={popRef}>

      {/* Trigger button */}
      <button
        onClick={handleMic}
        title="Contrôle vocal"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${btnClass}`}
      >
        {listening ? (
          <WaveIcon />
        ) : wakeActive ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            <Icon name="mic_none" size={16} className="relative" />
          </span>
        ) : (
          <Icon name="mic_none" size={16} />
        )}
        <span className="hidden sm:inline">
          {listening ? 'À l\'écoute…' : wakeActive ? 'Veille' : 'Voix'}
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Icon name="smart_toy" size={15} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Assistant vocal</span>
              {wakeActive && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Veille
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <Icon name="close" size={15} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3 space-y-2.5 min-h-[80px]">

            {/* Wake word heard indicator */}
            {wakeHeard && !listening && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Mot de réveil détecté — à l'écoute…
              </div>
            )}

            {/* Interim while listening */}
            {listening && (
              <div className="flex justify-end">
                <div className="bg-blue-700/50 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-slate-300 italic max-w-[90%]">
                  {interim || (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <WaveIcon small />
                      En attente…
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Last exchange */}
            {lastExchange && (
              <div className="space-y-2">
                {lastExchange.userText && (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-xl rounded-br-sm px-3 py-2 text-sm max-w-[90%]">
                      {lastExchange.userText}
                    </div>
                  </div>
                )}
                <div className="flex justify-start">
                  <div className="bg-slate-700/60 border border-slate-600 text-slate-200 rounded-xl rounded-bl-sm px-3 py-2 text-sm max-w-[90%]">
                    {lastExchange.reply}
                  </div>
                </div>
                {lastExchange.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lastExchange.actions.map((chip, i) => (
                      <span key={i} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                        chip.state
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}>
                        <Icon name={chip.state ? 'check_circle' : 'radio_button_unchecked'} size={9} />
                        {chip.name}{chip.zone ? ` · ${chip.zone}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!listening && !lastExchange && !wakeHeard && (
              <p className="text-xs text-slate-500 text-center py-2">
                {wakeActive
                  ? `Dites « ${WAKE_PHRASES[0]} » pour activer`
                  : 'Cliquez sur Parler ou activez la veille'}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/60">
            <div className="flex items-center gap-2">
              {/* Speak button */}
              <button
                onClick={handleMic}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  listening
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
                }`}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={13} />
                {listening ? 'Arrêter' : 'Parler'}
              </button>

              {/* Wake word toggle */}
              <button
                onClick={toggleWakeWord}
                title={wakeActive ? 'Désactiver la veille' : 'Activer la veille'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  wakeActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-slate-700/60 text-slate-500 border-slate-600 hover:text-slate-300'
                }`}
              >
                <Icon name={wakeActive ? 'hearing' : 'hearing_disabled'} size={13} />
                {wakeActive ? 'Veille ON' : 'Veille'}
              </button>
            </div>

            <Link
              to="/voix"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Voir tout
              <Icon name="chevron_right" size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function WaveIcon({ small }: { small?: boolean }) {
  const size = small ? 8 : 14;
  return (
    <span className="flex items-end gap-px" style={{ height: `${size}px` }}>
      {[3, 5, 7, 5, 3].map((h, i) => (
        <span key={i} className="bg-red-400 rounded-full" style={{
          width: '2px',
          height: `${(h / 7) * size}px`,
          animation: `vc-bounce ${0.35 + i * 0.07}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`@keyframes vc-bounce{from{transform:scaleY(.5)}to{transform:scaleY(1.3)}}`}</style>
    </span>
  );
}
