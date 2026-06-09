import React, { useEffect, useRef } from 'react';
import { useVoiceControl, WAKE_PHRASES } from '../hooks/useVoiceControl';
import { Icon } from '../components/ui/Icon';
import type { ActionChip, Exchange } from '../hooks/useVoiceControl';

export function Voix() {
  const {
    listening, wakeActive, wakeHeard,
    interim, supported, history,
    toggleMic, toggleWakeWord,
  } = useVoiceControl();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, interim, wakeHeard]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleMic]);

  const welcome: Exchange = {
    id:       'welcome',
    userText: '',
    reply:    `Bonjour ! Je suis votre assistant vocal SmartHome. Dites « ${WAKE_PHRASES[0]} » pour m'activer, ou appuyez sur le micro.`,
    actions:  [],
    ts:       new Date(0),
  };

  const allMessages = history.length === 0 ? [welcome] : history;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.6)*2-theme(spacing.14))] max-h-[820px]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Contrôle vocal</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {!supported
              ? 'Votre navigateur ne supporte pas la reconnaissance vocale'
              : wakeActive
                ? `Écoute permanente active — dites « ${WAKE_PHRASES[0]} »`
                : 'Appuyez sur le micro ou la barre espace pour parler'}
          </p>
        </div>

        {/* Wake word toggle */}
        {supported && (
          <button
            onClick={toggleWakeWord}
            title={wakeActive ? 'Désactiver l\'écoute permanente' : 'Activer l\'écoute permanente'}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all
              ${wakeActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${wakeActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {wakeActive ? 'Écoute active' : 'Mot de réveil'}
          </button>
        )}
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {allMessages.map(msg => (
          <ExchangeBubble key={msg.id} exchange={msg} />
        ))}

        {/* "Oui ?" awaiting state */}
        {wakeHeard && !listening && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mot de réveil détecté — j'écoute votre commande…
            </div>
          </div>
        )}

        {/* Interim transcript */}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-blue-700/60 border border-blue-500/30 italic text-slate-300 text-sm">
              {interim}
              <span className="inline-block w-1 h-3.5 bg-blue-400 ml-1 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 pt-4 border-t border-slate-700/60 mt-2">

        {/* Waveform while listening */}
        {listening && (
          <div className="flex justify-center mb-3">
            <div className="flex items-end gap-1 h-6">
              {[3, 6, 9, 6, 4, 8, 5, 7, 3].map((h, i) => (
                <span key={i} className="w-1 bg-blue-400 rounded-full"
                  style={{ height: `${h * 2}px`, animation: `vc-bounce ${0.4 + i * 0.08}s ease-in-out infinite alternate` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Wake-word pulsing ring when background-listening */}
        {wakeActive && !listening && (
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2 text-xs text-emerald-500/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              En veille — dites « {WAKE_PHRASES[0]} »
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          {/* Wake word toggle (compact) */}
          <button
            onClick={toggleWakeWord}
            disabled={!supported}
            title={wakeActive ? 'Désactiver l\'écoute permanente' : 'Activer l\'écoute permanente'}
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${wakeActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
          >
            <Icon name={wakeActive ? 'hearing' : 'hearing_disabled'} size={18} />
          </button>

          {/* Main mic button */}
          <button
            onClick={toggleMic}
            disabled={!supported}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg
              focus:outline-none focus:ring-4 focus:ring-blue-500/30
              disabled:opacity-40 disabled:cursor-not-allowed
              ${listening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40 scale-110 ring-4 ring-red-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 hover:scale-105'
              }`}
          >
            <Icon name={listening ? 'mic' : 'mic_none'} size={28} />
          </button>

          {/* Spacer to balance layout */}
          <div className="w-10" />
        </div>

        <p className="text-xs text-slate-600 text-center mt-3">
          {listening
            ? 'À l\'écoute… parlez maintenant'
            : wakeActive
              ? 'Micro prêt en arrière-plan'
              : 'Cliquez ou appuyez sur Espace'}
        </p>
      </div>

      <style>{`
        @keyframes vc-bounce {
          from { transform: scaleY(0.6); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

// ── Bubble components ─────────────────────────────────────────────────────────

function ExchangeBubble({ exchange }: { exchange: Exchange }) {
  const ts = exchange.ts.getTime() === 0
    ? null
    : exchange.ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-2">
      {exchange.userText && (
        <div className="flex flex-row-reverse gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name={exchange.fromWake ? 'hearing' : 'person'} size={15} className="text-slate-400" />
          </div>
          <div className="flex flex-col items-end gap-1 max-w-[75%]">
            <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-blue-600 text-white text-sm">
              {exchange.userText}
            </div>
            {ts && <span className="text-[10px] text-slate-600">{ts}</span>}
          </div>
        </div>
      )}

      <div className="flex flex-row gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon name="smart_toy" size={15} className="text-blue-400" />
        </div>
        <div className="flex flex-col items-start gap-1 max-w-[75%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-slate-800 border border-slate-700 text-slate-200 text-sm">
            {exchange.reply}
          </div>
          {exchange.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {exchange.actions.map((chip, i) => (
                <ActionBadge key={i} chip={chip} />
              ))}
            </div>
          )}
          {ts && <span className="text-[10px] text-slate-600">{ts}</span>}
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ chip }: { chip: ActionChip }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
      chip.state
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
        : 'bg-slate-700 text-slate-400 border border-slate-600'
    }`}>
      <Icon name={chip.state ? 'check_circle' : 'radio_button_unchecked'} size={9} />
      {chip.name}{chip.zone ? ` · ${chip.zone}` : ''}
    </span>
  );
}
