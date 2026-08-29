'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const STOP_WORDS = ['stop', 'stop it', 'shut up', 'quiet', 'enough', 'silence', 'stop talking', 'be quiet'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning Boss. All systems online, ready when you are.';
  if (h < 18) return 'Good afternoon Boss. At your service.';
  return 'Good evening Boss. Ready when you are.';
}

function unlockAudio() {
  if (typeof window === 'undefined') return;
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch {}
  try {
    window.speechSynthesis.cancel();
    const p = new SpeechSynthesisUtterance('.');
    p.volume = 0; p.rate = 16;
    window.speechSynthesis.speak(p);
  } catch {}
}

function cleanText(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,3}\s/g, '').replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, '. ').replace(/[^\w\s,.'!?$%()-]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 400);
}

function speak(text, _, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { if (onEnd) onEnd(); return; }
  const synth = window.speechSynthesis;
  const clean = cleanText(text);
  if (!clean) { if (onEnd) onEnd(); return; }

  let attempts = 0, done = false;

  function trySpeak() {
    if (done) return;
    attempts++;
    synth.cancel();
    setTimeout(() => {
      if (done) return;
      synth.resume();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.pitch = 0.85; utter.rate = 0.95; utter.volume = 1;
      let started = false;
      const alive = setInterval(() => { if (!synth.speaking) { clearInterval(alive); return; } synth.pause(); synth.resume(); }, 10000);
      utter.onstart = () => { started = true; };
      utter.onend = () => { if (done) return; done = true; clearInterval(alive); if (onEnd) onEnd(); };
      utter.onerror = () => { clearInterval(alive); if (!done && attempts < 3) { setTimeout(trySpeak, 300); } else if (!done) { done = true; if (onEnd) onEnd(); } };
      synth.speak(utter);
      setTimeout(() => { if (!started && !done && attempts < 3) { clearInterval(alive); trySpeak(); } }, 2000);
    }, attempts === 1 ? 200 : 100);
  }
  trySpeak();
}

// ── 3D Holographic Orb ────────────────────────────────────────────────────────
function HoloOrb({ state }) {
  const cfg = {
    idle:      { color: '#22d3ee', dim: true },
    listening: { color: '#22d3ee', dim: false },
    thinking:  { color: '#a78bfa', dim: false },
    speaking:  { color: '#4ade80', dim: false },
  };
  const { color, dim } = cfg[state] || cfg.idle;

  return (
    <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Expanding pulse rings */}
      {!dim && [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          border: `1px solid ${color}`,
          width: 240 + i * 60, height: 240 + i * 60,
          opacity: 0.4 / (i + 1),
          animation: `ring-expand 2.5s ease-out ${i * 0.5}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* 3D orbit ring 1 — rotates around X */}
      <div style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        border: `1.5px solid ${color}${dim ? '18' : '55'}`,
        animation: dim ? 'none' : 'orbit-x 5s linear infinite',
        boxShadow: dim ? 'none' : `0 0 12px ${color}33`,
      }} />
      {/* 3D orbit ring 2 — rotates around Y */}
      <div style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        border: `1px solid ${color}${dim ? '10' : '40'}`,
        animation: dim ? 'none' : 'orbit-y 7s linear infinite',
      }} />
      {/* 3D orbit ring 3 — diagonal tilt */}
      <div style={{
        position: 'absolute', width: 220, height: 220, borderRadius: '50%',
        border: `1px solid ${color}${dim ? '0a' : '28'}`,
        animation: dim ? 'none' : 'orbit-d 9s linear infinite',
      }} />

      {/* Main sphere */}
      <div style={{
        width: 170, height: 170, borderRadius: '50%',
        background: `radial-gradient(circle at 32% 30%, ${color}${dim ? '18' : '30'} 0%, ${color}${dim ? '06' : '12'} 45%, transparent 100%)`,
        border: `1.5px solid ${color}${dim ? '20' : '60'}`,
        boxShadow: dim ? 'none' : `0 0 50px ${color}30, 0 0 100px ${color}12, inset 0 0 50px ${color}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.5s ease',
        animation: state === 'speaking' ? 'sphere-breathe 1s ease-in-out infinite alternate' : state === 'thinking' ? 'sphere-think 1.5s ease-in-out infinite' : state === 'listening' ? 'sphere-idle 3s ease-in-out infinite' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glass highlight */}
        <div style={{
          position: 'absolute', top: '12%', left: '18%', width: '32%', height: '22%',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Scanline inside orb */}
        {!dim && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)`, animation: 'orb-scan 2s linear infinite', opacity: 0.6 }} />
          </div>
        )}
        {/* Core icon */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          {state === 'thinking' ? (
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 14px ${color}`, animation: `pulse-dot 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          ) : state === 'speaking' ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          ) : state === 'listening' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          )}
          <div style={{ fontSize: 8, color, marginTop: 10, letterSpacing: '0.22em', opacity: dim ? 0.3 : 0.85, textTransform: 'uppercase' }}>
            {state === 'idle' ? 'STANDBY' : state === 'listening' ? 'ACTIVE' : state === 'thinking' ? 'PROCESSING' : 'SPEAKING'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Waveform bars ─────────────────────────────────────────────────────────────
function Waveform({ active, color, bars = 30 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 60 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 99, background: color || '#22d3ee',
          height: active ? undefined : 3, minHeight: 3,
          opacity: active ? 0.85 : 0.15,
          animation: active ? `wave-${i % 5} ${0.7 + (i % 5) * 0.18}s ease-in-out ${(i * 0.045) % 0.7}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

// ── State HUD Popup ───────────────────────────────────────────────────────────
function StatePopup({ state }) {
  const [show, setShow] = useState(false);
  const [cur, setCur] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => {
    if (state === 'idle') { setShow(false); return; }
    setCur(state);
    setShow(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(timerRef.current);
  }, [state]);

  const info = {
    listening: { label: 'LISTENING', sub: 'Speak now — I\'m ready', color: '#22d3ee', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      </svg>
    )},
    thinking: { label: 'PROCESSING', sub: 'Thinking...', color: '#a78bfa', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    )},
    speaking: { label: 'SPEAKING', sub: 'Jarvis is responding', color: '#4ade80', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>
    )},
  };

  const d = info[cur] || info.listening;

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: `translate(-50%, -50%) scale(${show ? 1 : 0.85})`,
      opacity: show ? 1 : 0,
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      pointerEvents: 'none', zIndex: 200,
    }}>
      <div style={{
        background: 'rgba(2,8,23,0.92)',
        border: `1px solid ${d.color}50`,
        borderRadius: 16,
        padding: '20px 32px',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 0 60px ${d.color}20, 0 24px 80px rgba(0,0,0,0.6)`,
        minWidth: 240,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
          <div key={v+h} style={{ position: 'absolute', [v]: 8, [h]: 8, width: 14, height: 14, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', [v === 'top' ? 'top' : 'bottom']: 0, [h]: 0, width: 14, height: 2, background: d.color, opacity: 0.8 }} />
            <div style={{ position: 'absolute', [v === 'top' ? 'top' : 'bottom']: 0, [h]: 0, width: 2, height: 14, background: d.color, opacity: 0.8 }} />
          </div>
        ))}
        {/* Scan line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${d.color}80, transparent)`, animation: 'scan-line 1.5s linear infinite' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${d.color}15`, border: `1px solid ${d.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {d.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.25em', color: d.color }}>{d.label}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{d.sub}</div>
          </div>
          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: d.color, animation: `pulse-dot 1s ${i*0.2}s ease-in-out infinite`, opacity: 0.8 }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JarvisPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState('');
  const [voiceState, setVoiceState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [lastWords, setLastWords] = useState('');

  const bottomRef = useRef(null);
  const secretRef = useRef('');
  const messagesRef = useRef([]);
  const recogRef = useRef(null);
  const stateRef = useRef('idle');
  const loadingRef = useRef(false);
  const finalBufRef = useRef('');
  const sendTimerRef = useRef(null);

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
      const reply = data.error ? 'I encountered a slight hiccup. Try again.' : data.content;
      const aiMsg = { role: 'assistant', content: reply, id: Date.now() + 1 };
      const next = [...history, aiMsg];
      setMessages(next); messagesRef.current = next;
      setVoiceState('speaking');
      speak(reply, null, () => { setVoiceState('listening'); });
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

    // Greet on first activation
    const greetMsg = { role: 'assistant', content: getGreeting(), id: Date.now() };
    const next = [...messagesRef.current, greetMsg];
    setMessages(next); messagesRef.current = next;
    setVoiceState('speaking');
    speak(getGreeting(), null, () => setVoiceState('listening'));

    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const lower = (final || interim).trim().toLowerCase();
      setTranscript(final || interim);

      // Stop command — works anytime
      if (STOP_WORDS.some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w))) {
        window.speechSynthesis.cancel();
        clearTimeout(sendTimerRef.current);
        finalBufRef.current = '';
        setTranscript('');
        stateRef.current = 'listening'; setVoiceState('listening');
        return;
      }

      // Don't send if already processing
      if (stateRef.current === 'thinking' || stateRef.current === 'speaking') return;

      if (final) {
        finalBufRef.current += ' ' + final.trim();
        clearTimeout(sendTimerRef.current);
        sendTimerRef.current = setTimeout(() => {
          const msg = finalBufRef.current.trim();
          finalBufRef.current = '';
          setTranscript('');
          if (msg.length > 2) sendMsg(msg);
        }, 700);
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
    clearTimeout(sendTimerRef.current);
    finalBufRef.current = '';
    setVoiceState('idle'); setTranscript('');
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#020817', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
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

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#020817', display: 'flex', fontFamily: "'Space Grotesk','Inter',sans-serif", color: 'white', overflow: 'hidden', position: 'relative' }}>

      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.022) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '20%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* State HUD popup */}
      <StatePopup state={voiceState} />

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 270, flexShrink: 0, borderRight: '1px solid rgba(6,182,212,0.1)', background: 'rgba(2,8,23,0.75)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(6,182,212,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)', animation: 'scan-line 4s linear infinite' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.55, marginBottom: 4 }}>Conversation Log</div>
          <div style={{ fontSize: 11, color: '#1e3a4a' }}>{messages.length} entries</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(m => (
            <div key={m.id} style={{ fontSize: 12, lineHeight: 1.5, padding: '8px 10px', background: m.role === 'user' ? 'rgba(34,211,238,0.04)' : 'rgba(74,222,128,0.03)', border: `1px solid ${m.role === 'user' ? 'rgba(34,211,238,0.1)' : 'rgba(74,222,128,0.08)'}`, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: m.role === 'user' ? '#22d3ee' : '#4ade80', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>{m.role === 'user' ? '▶ Boss' : '◆ Jarvis'}</div>
              <div style={{ color: '#475569', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {m.content.replace(/\*\*/g, '').slice(0, 120)}{m.content.length > 120 ? '…' : ''}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{ color: '#1e3a4a', fontSize: 12, textAlign: 'center', marginTop: 60, lineHeight: 2 }}>No conversation yet.<br/>Click the mic to begin.</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── CENTER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px', position: 'relative', zIndex: 2 }}>

        {/* Top bar */}
        <div style={{ width: '100%', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#22d3ee' : '#1e3a4a', boxShadow: isActive ? '0 0 12px #22d3ee' : 'none', transition: 'all .5s', animation: isActive ? 'status-blink 2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', color: '#22d3ee' }}>J.A.R.V.I.S</span>
          </div>
          <div style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: '#0e4a5a', fontWeight: 700, letterSpacing: '0.05em' }}>{time}</div>
          <button onClick={() => { sessionStorage.removeItem('jarvis_secret'); stopListening(); setAuthed(false); setMessages([]); }}
            style={{ fontSize: 11, color: '#1e3a4a', background: 'none', border: '1px solid #0e1a2a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .2s, border-color .2s' }}
            onMouseEnter={e => { e.target.style.color = '#22d3ee'; e.target.style.borderColor = '#22d3ee40'; }}
            onMouseLeave={e => { e.target.style.color = '#1e3a4a'; e.target.style.borderColor = '#0e1a2a'; }}>
            Disconnect
          </button>
        </div>

        {/* Waveform — listening */}
        <div style={{ width: '55%', opacity: voiceState === 'listening' ? 1 : 0, transition: 'opacity .4s' }}>
          <Waveform active={voiceState === 'listening'} color="#22d3ee" bars={26} />
        </div>

        {/* Holographic Orb */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <HoloOrb state={voiceState} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: voiceState === 'idle' ? '#1e3a4a' : '#94a3b8', letterSpacing: '0.04em', transition: 'color .5s', minHeight: 20 }}>
              {voiceState === 'idle' && 'Click the mic to activate'}
              {voiceState === 'listening' && 'Listening — just speak'}
              {voiceState === 'thinking' && 'Processing your request...'}
              {voiceState === 'speaking' && 'Jarvis is responding...'}
            </div>
            {transcript && voiceState === 'listening' && (
              <div style={{ fontSize: 12, color: '#0e4a5a', marginTop: 8, fontStyle: 'italic', maxWidth: 360, textAlign: 'center' }}>"{transcript}"</div>
            )}
            {lastWords && !transcript && voiceState !== 'idle' && (
              <div style={{ fontSize: 12, color: '#1e3a4a', marginTop: 8, maxWidth: 360, textAlign: 'center' }}>"{lastWords}"</div>
            )}
          </div>
        </div>

        {/* Waveform — speaking */}
        <div style={{ width: '55%', opacity: voiceState === 'speaking' ? 1 : 0, transition: 'opacity .4s' }}>
          <Waveform active={voiceState === 'speaking'} color="#4ade80" bars={26} />
        </div>

        {/* Mic button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { if (isActive) { stopListening(); } else { unlockAudio(); startListening(); } }}
            style={{
              width: 76, height: 76, borderRadius: '50%',
              background: isActive ? 'rgba(34,211,238,0.12)' : 'rgba(6,182,212,0.04)',
              border: `2px solid ${isActive ? '#22d3ee' : '#0e2a3a'}`,
              color: isActive ? '#22d3ee' : '#1e3a4a',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isActive ? '0 0 40px rgba(34,211,238,0.22), 0 0 80px rgba(34,211,238,0.1)' : 'none',
              transition: 'all .3s', animation: isActive ? 'mic-glow 2.5s ease-in-out infinite' : 'none',
            }}
          >
            {isActive ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            )}
          </button>
          <div style={{ fontSize: 10, color: isActive ? '#22d3ee80' : '#1e3a4a', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'color .3s' }}>
            {isActive ? 'Tap to stop' : 'Tap to speak'}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width: 270, flexShrink: 0, borderLeft: '1px solid rgba(6,182,212,0.1)', background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', zIndex: 2, overflow: 'hidden', position: 'relative' }}>

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 40, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(6,182,212,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)', animation: 'scan-line 3s linear infinite' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#0a0f1e,#0d1f10)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(74,222,128,0.15)' }}>
              <svg viewBox="0 0 64 64" width="22" height="22" fill="none">
                <path d="M 38 10 L 38 54 M 38 26 A 14 14 0 1 0 38 54" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                <circle cx="52" cy="52" r="6" fill="url(#gp2)"/>
                <defs><linearGradient id="gp2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: 'white', lineHeight: 1 }}>duee<span style={{ color: '#4ade80' }}>.</span></div>
              <div style={{ fontSize: 9, color: '#1e3a4a', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Intelligence Core</div>
            </div>
          </div>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* System status */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>System Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'Neural Core', active: voiceState !== 'idle', color: '#22d3ee' },
                { label: 'Microphone', active: voiceState === 'listening', color: '#22d3ee' },
                { label: 'Processing', active: voiceState === 'thinking', color: '#a78bfa' },
                { label: 'Voice Output', active: voiceState === 'speaking', color: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: s.active ? `${s.color}0c` : 'rgba(255,255,255,0.015)', border: `1px solid ${s.active ? s.color + '28' : 'rgba(255,255,255,0.04)'}`, borderRadius: 8, transition: 'all .4s' }}>
                  <div style={{ fontSize: 11, color: s.active ? '#94a3b8' : '#1e3a4a', transition: 'color .4s' }}>{s.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ fontSize: 9, color: s.active ? s.color : '#1e293b', letterSpacing: '0.1em', transition: 'color .4s' }}>{s.active ? 'ON' : 'OFF'}</div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.active ? s.color : '#0f1f2e', boxShadow: s.active ? `0 0 8px ${s.color}` : 'none', transition: 'all .4s', animation: s.active ? 'status-blink 2s ease-in-out infinite' : 'none' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live metrics */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Live Metrics</div>
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
                      <div style={{ fontSize: 15, fontWeight: 800, color: s.color, textShadow: `0 0 10px ${s.color}55` }}>{s.value}</div>
                    </div>
                    <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${Math.max((s.bar || 0.02) * 100, 2)}%`, background: `linear-gradient(90deg, ${s.color}70, ${s.color})`, borderRadius: 99, transition: 'width 1.2s cubic-bezier(.22,1,.36,1)', boxShadow: `0 0 8px ${s.color}55` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#1e3a4a', lineHeight: 1.8, padding: '10px 12px', background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)', borderRadius: 8 }}>
                Activate Jarvis to load live site data.
              </div>
            )}
          </div>

          {/* Recent signups */}
          {stats?.recentSignups?.length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Recent Signups</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {stats.recentSignups.slice(0, 5).map((email, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)', borderRadius: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', opacity: Math.max(0.3, 1 - i * 0.18), flexShrink: 0 }} />
                    <div style={{ fontSize: 10, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active subs if available */}
          {stats?.activeSubs !== undefined && (
            <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />
              <div style={{ fontSize: 9, color: '#f59e0b', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.4)', letterSpacing: '-0.5px' }}>${stats.mrr}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.5, letterSpacing: 0 }}>/mo</span></div>
              <div style={{ fontSize: 10, color: '#78350f', marginTop: 3 }}>{stats.activeSubs} active subscribers</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(6,182,212,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)', animation: 'scan-line 4s linear infinite 2s' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: '#0e4a5a', letterSpacing: '0.15em' }}>JARVIS v2.1</div>
            <div style={{ fontSize: 9, color: '#0e4a5a', letterSpacing: '0.1em' }}>duee.online</div>
          </div>
          {/* Corner accents */}
          {[['bottom','left'],['bottom','right']].map(([v,h]) => (
            <div key={v+h} style={{ position: 'absolute', [v]: 8, [h]: 18 }}>
              <div style={{ position: 'absolute', [v === 'bottom' ? 'bottom' : 'top']: 0, [h]: 0, width: 16, height: 1, background: '#22d3ee', opacity: 0.25 }} />
              <div style={{ position: 'absolute', [v === 'bottom' ? 'bottom' : 'top']: 0, [h]: 0, width: 1, height: 16, background: '#22d3ee', opacity: 0.25 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes wave-0 { from { height: 4px; } to { height: 20px; } }
        @keyframes wave-1 { from { height: 4px; } to { height: 36px; } }
        @keyframes wave-2 { from { height: 4px; } to { height: 52px; } }
        @keyframes wave-3 { from { height: 4px; } to { height: 30px; } }
        @keyframes wave-4 { from { height: 4px; } to { height: 44px; } }
        @keyframes ring-expand {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes orbit-x {
          0% { transform: rotateX(0deg) rotateY(20deg); }
          100% { transform: rotateX(360deg) rotateY(20deg); }
        }
        @keyframes orbit-y {
          0% { transform: rotateY(0deg) rotateX(15deg); }
          100% { transform: rotateY(360deg) rotateX(15deg); }
        }
        @keyframes orbit-d {
          0% { transform: rotateX(55deg) rotateZ(0deg); }
          100% { transform: rotateX(55deg) rotateZ(360deg); }
        }
        @keyframes sphere-breathe {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        @keyframes sphere-think {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.96); opacity: 0.75; }
        }
        @keyframes sphere-idle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes orb-scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes mic-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.2), 0 0 60px rgba(34,211,238,0.08); }
          50% { box-shadow: 0 0 40px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.15); }
        }
        @keyframes scan-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes status-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
