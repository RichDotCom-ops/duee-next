'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const WAKE_WORDS = ['wake up jarvis', 'wake up, jarvis', 'hey jarvis', 'jarvis wake up'];
const STOP_WORDS = ['stop', 'stop it', 'shut up', 'quiet', 'enough', 'silence', 'stop talking', 'be quiet'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Boss. Systems online. What can I do for you?';
  if (h < 18) return 'Good afternoon, Boss. At your service. What do you need?';
  return 'Good evening, Boss. Ready when you are. What can I do for you?';
}

let audioUnlocked = false;

function unlockAudio() {
  if (typeof window === 'undefined' || audioUnlocked) return;
  // Play a real silent sound via AudioContext to unlock audio on ChromeOS
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.resume();
  } catch {}
  // Also prime speechSynthesis
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.rate = 10;
    window.speechSynthesis.speak(u);
    setTimeout(() => window.speechSynthesis.cancel(), 100);
  } catch {}
  audioUnlocked = true;
}

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find(v => v.name === 'Google UK English Male') ||
    voices.find(v => v.name.includes('Microsoft David')) ||
    voices.find(v => v.name.includes('Microsoft Mark')) ||
    voices.find(v => v.name.includes('Google US English') && v.name.toLowerCase().includes('male')) ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

function speak(text, onStart, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { if (onEnd) onEnd(); return; }

  const synth = window.speechSynthesis;
  synth.cancel();

  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/[^\w\s,.'!?$%()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 450);

  if (!clean) { if (onEnd) onEnd(); return; }

  function doSpeak() {
    // Force synth out of any bad state
    synth.resume();

    const utter = new SpeechSynthesisUtterance(clean);
    const voice = getBestVoice();
    if (voice) utter.voice = voice;
    utter.pitch = 0.85;
    utter.rate = 1.0;
    utter.volume = 1.0;

    const keepAlive = setInterval(() => {
      if (!synth.speaking) { clearInterval(keepAlive); return; }
      synth.pause(); synth.resume();
    }, 8000);

    utter.onend = () => { clearInterval(keepAlive); if (onEnd) onEnd(); };
    utter.onerror = () => { clearInterval(keepAlive); if (onEnd) onEnd(); };

    synth.speak(utter);

    // Chromebook: if still not speaking after 1.5s, cancel and retry with no voice preference
    setTimeout(() => {
      if (!synth.speaking) {
        clearInterval(keepAlive);
        synth.cancel();
        setTimeout(() => {
          synth.resume();
          const u2 = new SpeechSynthesisUtterance(clean);
          u2.volume = 1; u2.rate = 1; u2.pitch = 0.85;
          u2.onend = () => { if (onEnd) onEnd(); };
          u2.onerror = () => { if (onEnd) onEnd(); };
          synth.speak(u2);
        }, 300);
      }
    }, 1500);
  }

  const voices = synth.getVoices();
  if (!voices.length) {
    synth.onvoiceschanged = () => { synth.onvoiceschanged = null; setTimeout(doSpeak, 100); };
    setTimeout(doSpeak, 800); // hard fallback
  } else {
    setTimeout(doSpeak, 100);
  }
}

// Waveform bars component
function Waveform({ active, color, bars = 32 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 80 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 99,
          background: color || '#22d3ee',
          height: active ? undefined : 4,
          minHeight: 4,
          opacity: active ? 0.9 : 0.2,
          animation: active ? `wave ${0.8 + (i % 5) * 0.15}s ease-in-out ${(i * 0.04) % 0.6}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

// Circular pulse ring
function PulseRing({ state }) {
  // state: 'idle' | 'listening' | 'awake' | 'thinking' | 'speaking'
  const colors = {
    idle: '#1e3a4a',
    listening: '#0e7490',
    awake: '#22d3ee',
    thinking: '#a78bfa',
    speaking: '#4ade80',
  };
  const color = colors[state] || colors.idle;
  const glow = state !== 'idle';

  return (
    <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer rings */}
      {glow && [1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          border: `1px solid ${color}`,
          width: 180 + i * 40, height: 180 + i * 40,
          opacity: 1 / (i * 1.8),
          animation: `ring-expand 2s ease-out ${i * 0.3}s infinite`,
        }} />
      ))}
      {/* Main circle */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, ${color}08 60%, transparent 100%)`,
        border: `2px solid ${color}`,
        boxShadow: glow ? `0 0 40px ${color}44, inset 0 0 30px ${color}11` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.5s ease',
        animation: state === 'speaking' ? 'circle-breathe 1s ease-in-out infinite alternate' : state === 'thinking' ? 'circle-think 1.5s ease-in-out infinite' : 'none',
      }}>
        {/* Inner icon */}
        <div style={{ textAlign: 'center' }}>
          {state === 'thinking' ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: `pulse-dot 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width={state === 'idle' ? 28 : 32} height={state === 'idle' ? 28 : 32} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
              {state === 'speaking'
                ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>
              }
            </svg>
          )}
          <div style={{ fontSize: 10, color, marginTop: 6, letterSpacing: '0.15em', opacity: 0.8 }}>
            {state === 'idle' ? 'STANDBY' : state === 'listening' ? 'PASSIVE' : state === 'awake' ? 'ACTIVE' : state === 'thinking' ? 'PROCESSING' : 'SPEAKING'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JarvisPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState('');
  const [voiceState, setVoiceState] = useState('idle'); // idle|listening|awake|thinking|speaking
  const [transcript, setTranscript] = useState('');
  const [lastWords, setLastWords] = useState('');

  const bottomRef = useRef(null);
  const secretRef = useRef('');
  const messagesRef = useRef([]);
  const recogRef = useRef(null);
  const stateRef = useRef('idle');
  const loadingRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { stateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    const saved = sessionStorage.getItem('jarvis_secret');
    if (saved) { secretRef.current = saved; setSecret(saved); setAuthed(true); }
  }, []);

  useEffect(() => {
    function tick() { setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })); }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Preload voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const sendMsg = useCallback(async (text) => {
    const msg = text.trim();
    if (!msg || loadingRef.current) return;
    setTranscript(''); setLastWords(msg);

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    const history = [...messagesRef.current, userMsg];
    setMessages(history); messagesRef.current = history;
    setVoiceState('thinking'); setLoading(true); loadingRef.current = true;

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secretRef.current },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthed(false); sessionStorage.removeItem('jarvis_secret'); return; }
      if (data.stats) setStats(data.stats);
      const reply = data.error ? 'I encountered an error. Please try again.' : data.content;
      const aiMsg = { role: 'assistant', content: reply, id: Date.now() + 1 };
      const next = [...history, aiMsg];
      setMessages(next); messagesRef.current = next;
      setVoiceState('speaking'); // set immediately — don't wait for onstart
      speak(reply, null,
        () => { setVoiceState('listening'); }
      );
    } catch {
      setVoiceState('listening');
    } finally { setLoading(false); loadingRef.current = false; }
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Use Chrome or Edge for voice support.'); return; }
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} recogRef.current = null; }

    const recog = new SR();
    recog.lang = 'en-US';
    recog.continuous = true;
    recog.interimResults = true;
    recogRef.current = recog;

    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const all = (final || interim).trim();
      const lower = all.toLowerCase().trim();
      setTranscript(all);

      // Stop command — works anytime
      if (STOP_WORDS.some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w))) {
        window.speechSynthesis.cancel();
        setVoiceState('listening'); stateRef.current = 'listening';
        setTranscript('');
        return;
      }

      // Wake word
      if (stateRef.current === 'listening' && WAKE_WORDS.some(w => lower.includes(w))) {
        setVoiceState('awake'); stateRef.current = 'awake';
        setTranscript('');
        window.speechSynthesis.cancel();
        const greeting = getGreeting();
        const greetMsg = { role: 'assistant', content: greeting, id: Date.now() };
        const next = [...messagesRef.current, greetMsg];
        setMessages(next); messagesRef.current = next;
        setVoiceState('speaking');
        speak(greeting, null, () => setVoiceState('awake'));
        return;
      }

      // Command after wake
      if (stateRef.current === 'awake' && final && final.trim().length > 3) {
        const clean = WAKE_WORDS.reduce((t, w) => t.replace(new RegExp(w, 'gi'), ''), final).trim();
        if (clean.length > 2) {
          stateRef.current = 'thinking';
          sendMsg(clean);
        }
      }
    };

    recog.onend = () => { if (recogRef.current) { try { recog.start(); } catch {} } };
    recog.onerror = (e) => { if (e.error === 'not-allowed') { setVoiceState('idle'); recogRef.current = null; } };
    recog.start();
    setVoiceState('listening');
  }, [sendMsg]);

  const stopListening = useCallback(() => {
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} recogRef.current = null; }
    window.speechSynthesis?.cancel();
    setVoiceState('idle'); setTranscript('');
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#020817', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#22d3ee', textTransform: 'uppercase', marginBottom: 24, opacity: 0.7 }}>Restricted Access</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 6 }}>J.A.R.V.I.S</div>
          <div style={{ fontSize: 13, color: '#334155', marginBottom: 40, letterSpacing: '0.1em' }}>duee. founder intelligence system</div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
            <input type="password" placeholder="Admin passphrase" value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && secret) { secretRef.current = secret; sessionStorage.setItem('jarvis_secret', secret); setAuthed(true); } }}
              autoFocus
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={() => { if (secret) { secretRef.current = secret; sessionStorage.setItem('jarvis_secret', secret); setAuthed(true); } }}
              style={{ padding: '12px 20px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10, color: '#22d3ee', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Authorize
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = voiceState !== 'idle';

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#020817', display: 'flex', fontFamily: "'Space Grotesk','Inter',sans-serif", color: 'white', overflow: 'hidden', position: 'relative' }}>

      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* ── LEFT PANEL: conversation log ── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid rgba(6,182,212,0.1)', background: 'rgba(2,8,23,0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 }}>Conversation Log</div>
          <div style={{ fontSize: 11, color: '#1e3a4a' }}>{messages.length} messages</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(m => (
            <div key={m.id} style={{ fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ fontSize: 10, color: m.role === 'user' ? '#22d3ee' : '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{m.role === 'user' ? 'Boss' : 'Jarvis'}</div>
              <div style={{ color: '#475569', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {m.content.replace(/\*\*/g, '').replace(/#{1,3}/g, '').slice(0, 120)}{m.content.length > 120 ? '...' : ''}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{ color: '#1e3a4a', fontSize: 12, textAlign: 'center', marginTop: 40 }}>No conversation yet.<br/>Say "Wake up Jarvis"</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── CENTER: main voice UI ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 28px', position: 'relative', zIndex: 2 }}>

        {/* Top bar */}
        <div style={{ width: '100%', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#22d3ee' : '#1e3a4a', boxShadow: isActive ? '0 0 10px #22d3ee' : 'none', transition: 'all .5s' }} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.05em', color: '#22d3ee' }}>J.A.R.V.I.S</span>
          </div>
          <div style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: '#0e4a5a', fontWeight: 700, letterSpacing: '0.05em' }}>{time}</div>
          <button onClick={() => { sessionStorage.removeItem('jarvis_secret'); stopListening(); setAuthed(false); setMessages([]); }}
            style={{ fontSize: 11, color: '#1e3a4a', background: 'none', border: '1px solid #0e1a2a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Disconnect
          </button>
        </div>

        {/* Top waveform (listening indicator) */}
        <div style={{ width: '60%', opacity: voiceState === 'listening' || voiceState === 'awake' ? 1 : 0, transition: 'opacity .5s' }}>
          <Waveform active={voiceState === 'listening' || voiceState === 'awake'} color="#22d3ee" bars={28} />
        </div>

        {/* Center pulse ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <PulseRing state={voiceState} />

          {/* Status text */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: voiceState === 'idle' ? '#1e3a4a' : '#22d3ee', letterSpacing: '0.05em', transition: 'color .5s', minHeight: 20 }}>
              {voiceState === 'idle' && 'Click mic to activate Jarvis'}
              {voiceState === 'listening' && 'Passive mode — say "Wake up Jarvis"'}
              {voiceState === 'awake' && 'Listening for your command...'}
              {voiceState === 'thinking' && 'Processing...'}
              {voiceState === 'speaking' && 'Jarvis is responding...'}
            </div>
            {transcript && voiceState !== 'idle' && (
              <div style={{ fontSize: 12, color: '#0e4a5a', marginTop: 6, fontStyle: 'italic', maxWidth: 340, textAlign: 'center' }}>"{transcript}"</div>
            )}
            {lastWords && !transcript && (
              <div style={{ fontSize: 12, color: '#0e4a5a', marginTop: 6, maxWidth: 340, textAlign: 'center' }}>"{lastWords}"</div>
            )}
          </div>
        </div>

        {/* Bottom waveform (speaking indicator) */}
        <div style={{ width: '60%', opacity: voiceState === 'speaking' ? 1 : 0, transition: 'opacity .5s' }}>
          <Waveform active={voiceState === 'speaking'} color="#4ade80" bars={28} />
        </div>

        {/* Mic button */}
        <button
          onClick={() => { if (isActive) { stopListening(); } else { unlockAudio(); startListening(); } }}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isActive ? 'rgba(34,211,238,0.15)' : 'rgba(6,182,212,0.05)',
            border: `2px solid ${isActive ? '#22d3ee' : '#0e2a3a'}`,
            color: isActive ? '#22d3ee' : '#1e3a4a',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? '0 0 30px rgba(34,211,238,0.25)' : 'none',
            transition: 'all .3s',
            animation: isActive ? 'mic-glow 2.5s ease-in-out infinite' : 'none',
          }}
        >
          {isActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          )}
        </button>
      </div>

      {/* ── RIGHT PANEL: holographic ── */}
      <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid rgba(6,182,212,0.12)', background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', zIndex: 2, overflow: 'hidden', position: 'relative' }}>

        {/* Holographic glow top-right */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 60, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* duee. logo + branding */}
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid rgba(6,182,212,0.08)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {/* Logo mark */}
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#0a0f1e,#0d1f10)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(74,222,128,0.15)' }}>
              <svg viewBox="0 0 64 64" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 38 10 L 38 54 M 38 26 A 14 14 0 1 0 38 54" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                <circle cx="52" cy="52" r="6" fill="url(#gp)"/>
                <defs><linearGradient id="gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: 'white', lineHeight: 1 }}>duee<span style={{ color: '#4ade80' }}>.</span></div>
              <div style={{ fontSize: 9, color: '#1e3a4a', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Intelligence Core</div>
            </div>
          </div>
          {/* Scan line */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)', marginTop: 4 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* System status — holographic cards */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>System Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Wake Word Engine', active: voiceState !== 'idle', color: '#22d3ee' },
                { label: 'Microphone', active: voiceState === 'listening' || voiceState === 'awake', color: '#22d3ee' },
                { label: 'Neural Processing', active: voiceState === 'thinking', color: '#a78bfa' },
                { label: 'Voice Output', active: voiceState === 'speaking', color: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: s.active ? `${s.color}0d` : 'rgba(255,255,255,0.02)', border: `1px solid ${s.active ? s.color + '30' : 'rgba(255,255,255,0.04)'}`, borderRadius: 8, transition: 'all .4s' }}>
                  <div style={{ fontSize: 11, color: s.active ? '#94a3b8' : '#1e3a4a', transition: 'color .4s' }}>{s.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ fontSize: 9, color: s.active ? s.color : '#1e293b', letterSpacing: '0.1em', transition: 'color .4s' }}>{s.active ? 'ON' : 'OFF'}</div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.active ? s.color : '#0f1f2e', boxShadow: s.active ? `0 0 8px ${s.color}` : 'none', transition: 'all .4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live metrics */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>Live Metrics</div>
            {stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total Users', value: stats.totalUsers, color: '#22d3ee', bar: Math.min(stats.totalUsers / 500, 1) },
                  { label: 'New Today', value: `+${stats.newToday}`, color: '#4ade80', bar: Math.min(stats.newToday / 10, 1) },
                  { label: 'This Week', value: `+${stats.newLast7}`, color: '#a78bfa', bar: Math.min(stats.newLast7 / 50, 1) },
                  { label: 'Active 7d', value: stats.activeUsers, color: '#fb923c', bar: Math.min(stats.activeUsers / 200, 1) },
                  ...(stats.mrr !== undefined ? [{ label: 'Est. MRR', value: `$${stats.mrr}`, color: '#f59e0b', bar: Math.min(stats.mrr / 500, 1) }] : []),
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <div style={{ fontSize: 10, color: '#334155', letterSpacing: '0.04em' }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: s.color, textShadow: `0 0 10px ${s.color}66` }}>{s.value}</div>
                    </div>
                    <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max((s.bar || 0.03) * 100, 3)}%`, background: `linear-gradient(90deg, ${s.color}88, ${s.color})`, borderRadius: 99, transition: 'width 1.2s cubic-bezier(.22,1,.36,1)', boxShadow: `0 0 8px ${s.color}66` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#1e3a4a', lineHeight: 1.7, padding: '10px', background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)', borderRadius: 8 }}>
                Activate Jarvis to load live site data.
              </div>
            )}
          </div>

          {/* Recent signups */}
          {stats?.recentSignups?.length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>Recent Signups</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {stats.recentSignups.slice(0, 5).map((email, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)', borderRadius: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', opacity: 1 - i * 0.15, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom — holographic footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(6,182,212,0.08)', position: 'relative' }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)', marginBottom: 12 }} />
          {/* Animated scan line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, #22d3ee 50%, transparent 100%)', animation: 'scan-line 3s linear infinite', opacity: 0.4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: '#0e4a5a', letterSpacing: '0.15em' }}>JARVIS v2.0</div>
            <div style={{ fontSize: 9, color: '#0e4a5a', letterSpacing: '0.1em' }}>duee.online</div>
          </div>
          {/* Corner accent lines */}
          <div style={{ position: 'absolute', bottom: 8, left: 20, width: 20, height: 1, background: '#22d3ee', opacity: 0.3 }} />
          <div style={{ position: 'absolute', bottom: 8, left: 20, width: 1, height: 20, background: '#22d3ee', opacity: 0.3 }} />
          <div style={{ position: 'absolute', bottom: 8, right: 20, width: 20, height: 1, background: '#22d3ee', opacity: 0.3 }} />
          <div style={{ position: 'absolute', bottom: 8, right: 20, width: 1, height: 20, background: '#22d3ee', opacity: 0.3 }} />
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { height: 4px; }
          to { height: ${Math.floor(Math.random() * 40 + 20)}px; }
        }
        @keyframes ring-expand {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes circle-breathe {
          from { transform: scale(1); }
          to { transform: scale(1.06); }
        }
        @keyframes circle-think {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.96); opacity: 0.7; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes mic-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.2); }
          50% { box-shadow: 0 0 40px rgba(34,211,238,0.4); }
        }
        @keyframes scan-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
