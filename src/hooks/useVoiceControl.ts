import { useState, useRef, useCallback, useEffect } from 'react';
import { useSmartHome } from '../context/SmartHomeContext';
import type { Actuator } from '../types';

// ── NLP helpers ──────────────────────────────────────────────────────────────

export function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ACTION_ON = new Set([
  'allume','allumer','ouvre','ouvrir','active','activer','demarre','demarrer',
  'mets','mettre','enclenche','enclencher','branche','brancher','monte','monter',
  'lance','lancer','pousse','pousser','start','on',
]);
const ACTION_OFF = new Set([
  'eteins','eteindre','ferme','fermer','desactive','desactiver','arrete','arreter',
  'coupe','couper','stop','stoppe','stopper','baisse','baisser','debranche',
  'debrancher','off','down',
]);
const GREET_WORDS = new Set([
  'bonjour','bonsoir','salut','hello','hey','home','smarthome','maison',
]);

// Wake-word phrases — any spoken transcript containing one of these triggers command mode
export const WAKE_PHRASES = [
  'bonjour home', 'hey home', 'salut home', 'bonsoir home',
  'ok home', 'ok maison', 'maison', 'smarthome',
];

export function containsWakeWord(transcript: string): boolean {
  const n = norm(transcript);
  return WAKE_PHRASES.some(p => n.includes(norm(p)));
}

const DEVICE_GROUPS: [string, string[]][] = [
  ['lumiere',     ['lumiere','lampe','lamp','light','led','eclairage','spot','lustres','lumieres','lampes','spots']],
  ['ventilateur', ['ventilateur','ventilo','fan','brasseur','ventilateurs']],
  ['climatiseur', ['climatiseur','clim','climatisation','ac','froid']],
  ['chauffage',   ['chauffage','radiateur','chauffe','chaleur','chauffer']],
  ['alarme',      ['alarme','alerte','sirene','securite','sonnerie']],
  ['prise',       ['prise','multiprise','socket','plug','prises']],
];

function detectAction(words: string[]): 'on' | 'off' | null {
  for (const w of words) {
    if (ACTION_ON.has(w))  return 'on';
    if (ACTION_OFF.has(w)) return 'off';
  }
  return null;
}

function matchedDeviceGroups(words: string[]): string[] {
  return DEVICE_GROUPS
    .filter(([, syns]) => syns.some(s => words.includes(s)))
    .map(([g]) => g);
}

function deviceGroupSynonyms(group: string): string[] {
  return DEVICE_GROUPS.find(([g]) => g === group)?.[1] ?? [];
}

export function parseCommand(transcript: string, actuators: Actuator[]) {
  const words        = norm(transcript).split(' ');
  const action       = detectAction(words);
  const isGreeting   = words.some(w => GREET_WORDS.has(w));
  const isAll        = words.some(w => ['tout','tous','toutes','all'].includes(w));
  const groups       = matchedDeviceGroups(words);
  const allZones     = [...new Set(actuators.map(a => norm(a.room || '')).filter(Boolean))];
  const matchedZones = allZones.filter(z =>
    z.split(' ').some(zw => zw.length > 2 && words.some(w => w.includes(zw) || zw.includes(w))),
  );

  let targets: Actuator[];
  if (isAll) {
    targets = actuators;
  } else {
    targets = actuators.filter(a => {
      const aName = norm(a.name);
      const aZone = norm(a.room || '');
      const nameMatchGroup = groups.some(g => deviceGroupSynonyms(g).some(s => aName.includes(s)));
      const nameMatchWord  = words.some(w => w.length > 3 && aName.includes(w));
      const nameMatch      = nameMatchGroup || nameMatchWord;
      const zoneMatch      = matchedZones.some(z => aZone.includes(z) || z.includes(aZone));
      if (groups.length > 0 && matchedZones.length > 0) return nameMatch && zoneMatch;
      if (groups.length > 0)       return nameMatch;
      if (matchedZones.length > 0) return zoneMatch;
      return false;
    });
  }

  return { action, targets, isGreeting, isAll, matchedZones, matchedGroups: groups };
}

// ── TTS ───────────────────────────────────────────────────────────────────────

export function speak(text: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) { onEnd?.(); return; }

  // Chrome bug: synthesis gets stuck paused after tab loses focus
  if (synth.paused) synth.resume();
  synth.cancel();

  const utt    = new SpeechSynthesisUtterance(text);
  utt.lang     = 'fr-FR';
  utt.rate     = 1.0;
  utt.pitch    = 1;
  utt.volume   = 1;
  if (onEnd) utt.onend = onEnd;

  const doSpeak = () => {
    const voices  = synth.getVoices();
    const frVoice = voices.find(v => v.lang === 'fr-FR') ?? voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utt.voice = frVoice;
    // Small delay lets cancel() flush before new utterance queues
    setTimeout(() => synth.speak(utt), 80);
  };

  if (synth.getVoices().length > 0) {
    doSpeak();
  } else {
    synth.addEventListener('voiceschanged', doSpeak, { once: true });
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActionChip { name: string; zone: string; state: boolean }

export interface Exchange {
  id:        string;
  userText:  string;
  reply:     string;
  actions:   ActionChip[];
  ts:        Date;
  fromWake?: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const SR: any =
  (window as any).SpeechRecognition ??
  (window as any).webkitSpeechRecognition ??
  null;

export function useVoiceControl() {
  const { actuators, sendCommand } = useSmartHome();

  const [listening,    setListening]    = useState(false);
  const [wakeActive,   setWakeActive]   = useState(false);
  const [wakeHeard,    setWakeHeard]    = useState(false); // true while awaiting command after wake
  const [interim,      setInterim]      = useState('');
  const [history,      setHistory]      = useState<Exchange[]>([]);
  const [lastExchange, setLastExchange] = useState<Exchange | null>(null);

  const supported      = Boolean(SR);
  const cmdRecogRef    = useRef<any>(null);
  const wakeRecogRef   = useRef<any>(null);
  const wakeActiveRef  = useRef(false);   // ref mirror so callbacks see latest value
  const wakeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-load voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const onChanged = () => window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', onChanged);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', onChanged);
  }, []);

  const pushExchange = useCallback((ex: Exchange) => {
    setHistory(prev => [...prev, ex]);
    setLastExchange(ex);
  }, []);

  // ── Process a recognised command transcript ────────────────────────────────
  const handleTranscript = useCallback(async (
    transcript: string,
    fromWake = false,
    onDone?: () => void,
  ) => {
    if (!transcript.trim()) { onDone?.(); return; }

    const parsed = parseCommand(transcript, actuators);
    let reply: string;
    const chips: ActionChip[] = [];

    if (parsed.isGreeting && parsed.action === null && parsed.targets.length === 0) {
      reply = 'Bonjour ! Comment puis-je vous aider ?';
    } else if (parsed.action === null) {
      reply = 'Je n\'ai pas compris l\'action. Dites « allume » ou « éteins ».';
    } else if (parsed.targets.length === 0) {
      reply = 'Aucun appareil trouvé. Précisez la pièce ou le type d\'appareil.';
    } else {
      const newState = parsed.action === 'on';
      for (const a of parsed.targets) {
        await sendCommand(a.id, newState);
        chips.push({ name: a.name, zone: a.room, state: newState });
      }
      const verb = newState ? 'allumé' : 'éteint';
      reply = chips.length === 1
        ? `J'ai ${verb} ${chips[0].name}${chips[0].zone ? ' (' + chips[0].zone + ')' : ''}.`
        : `J'ai ${verb} ${chips.length} appareils : ${chips.map(c => c.name).join(', ')}.`;
    }

    speak(reply, onDone);
    pushExchange({
      id: Math.random().toString(36).slice(2),
      userText: transcript,
      reply,
      actions: chips,
      ts: new Date(),
      fromWake,
    });
  }, [actuators, sendCommand, pushExchange]);

  // ── Command recognition (single utterance) ────────────────────────────────
  const startListening = useCallback((fromWake = false) => {
    if (!SR) return;
    const recog           = new SR();
    recog.lang            = 'fr-FR';
    recog.interimResults  = true;
    recog.maxAlternatives = 1;
    recog.continuous      = false;
    cmdRecogRef.current   = recog;

    recog.onstart = () => { setListening(true); setWakeHeard(false); };
    recog.onerror = (e: any) => {
      setListening(false); setInterim('');
      if (e.error !== 'aborted') {
        pushExchange({
          id: Math.random().toString(36).slice(2),
          userText: '', reply: `Erreur micro : ${e.error}`,
          actions: [], ts: new Date(),
        });
      }
      // Return to wake-word mode after error
      if (wakeActiveRef.current) scheduleWakeRestart(1500);
    };

    recog.onresult = (e: any) => {
      let final = '', inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (inter += t);
      }
      setInterim(inter);
      if (final) {
        recog._finalSeen = true;
        handleTranscript(final, fromWake, () => {
          // After TTS finishes, resume wake-word listening
          if (wakeActiveRef.current) scheduleWakeRestart(400);
        });
      }
    };

    recog.onend = () => {
      setListening(false);
      setInterim('');
      // If recognition ended without a final result (silence timeout), restart wake word
      if (!recog._finalSeen && wakeActiveRef.current) scheduleWakeRestart(300);
    };

    recog.start();
  }, [handleTranscript, pushExchange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wake-word recognition loop ────────────────────────────────────────────

  // Forward declaration so startWakeRecog can reference itself via ref
  const startWakeRecogRef = useRef<() => void>(() => {});

  const scheduleWakeRestart = useCallback((delayMs = 300) => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    wakeTimerRef.current = setTimeout(() => startWakeRecogRef.current(), delayMs);
  }, []);

  const startWakeRecog = useCallback(() => {
    if (!SR || !wakeActiveRef.current) return;

    const recog           = new SR();
    recog.lang            = 'fr-FR';
    recog.interimResults  = false;
    recog.maxAlternatives = 3;
    recog.continuous      = false;
    wakeRecogRef.current  = recog;

    recog.onresult = (e: any) => {
      // Check all alternatives for the wake phrase
      let triggered = false;
      for (let ri = 0; ri < e.results.length && !triggered; ri++) {
        for (let ai = 0; ai < e.results[ri].length && !triggered; ai++) {
          if (containsWakeWord(e.results[ri][ai].transcript)) {
            triggered = true;
          }
        }
      }
      if (!triggered) return;

      recog._wakeTriggered = true;
      setWakeHeard(true);

      // Speak acknowledgment, then start command recognition
      speak('Oui ?', () => {
        if (wakeActiveRef.current) startListening(true);
      });
    };

    recog.onend = () => {
      // Restart unless we intentionally triggered command mode
      if (wakeActiveRef.current && !recog._wakeTriggered) {
        scheduleWakeRestart(200);
      }
    };

    recog.onerror = (e: any) => {
      const retryDelay = e.error === 'network' ? 2000 : 500;
      if (wakeActiveRef.current) scheduleWakeRestart(retryDelay);
    };

    try { recog.start(); } catch { scheduleWakeRestart(1000); }
  }, [startListening, scheduleWakeRestart]);

  // Keep the ref up to date so scheduleWakeRestart always calls latest version
  useEffect(() => { startWakeRecogRef.current = startWakeRecog; }, [startWakeRecog]);

  // ── Toggle wake-word mode ─────────────────────────────────────────────────
  const toggleWakeWord = useCallback(() => {
    const next = !wakeActiveRef.current;
    wakeActiveRef.current = next;
    setWakeActive(next);
    setWakeHeard(false);

    if (next) {
      // Stop any active command session first
      cmdRecogRef.current?.stop();
      startWakeRecog();
    } else {
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
      wakeRecogRef.current?.stop();
      wakeRecogRef.current = null;
    }
  }, [startWakeRecog]);

  // ── Manual mic toggle ────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    cmdRecogRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      // Pause wake-word loop while manually commanding
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
      wakeRecogRef.current?.stop();
      startListening(false);
    }
  }, [listening, stopListening, startListening]);

  // Cleanup on unmount
  useEffect(() => () => {
    wakeActiveRef.current = false;
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    wakeRecogRef.current?.stop();
    cmdRecogRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  return {
    listening,
    wakeActive,
    wakeHeard,
    interim,
    supported,
    history,
    lastExchange,
    toggleMic,
    stopListening,
    toggleWakeWord,
  };
}
