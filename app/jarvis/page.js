'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const WAKE_WORDS = ['wake up jarvis', 'wake up, jarvis', 'hey jarvis', 'jarvis wake up'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Boss. Systems online. What can I do for you?';
  if (h < 18) return 'Good afternoon, Boss. At your service. What do you need?';
  return 'Good evening, Boss. Ready when you are. What can I do for you?';
}

function speak(text, onStart, onEnd) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();

  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, '. ')
    .slice(0, 600);

  const utter = new SpeechSynthesisUtterance(clean);

  // Pick best male voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    voices.find(v => v.name === 'Google UK English Male'),
    voices.find(v => v.name.includes('Microsoft David')),
    voices.find(v => v.name.includes('Microsoft Mark')),
    voices.find(v => v.lang === 'en-GB'),
    voices.find(v => v.lang.startsWith('en')),
  ].find(Boolean);

  if (preferred) utter.voice = preferred;
  utter.pitch = 0.8;
  utter.rate = 1.0;
  utter.volume = 1;
  utter.onstart = onStart || null;
  utter.onend = onEnd || null;
  utter.onerror = onEnd || null;

  // Small delay fixes Chrome bug where speech doesn't start after cancel
  setTimeout(() => window.speechSynthesis.speak(utter), 100);
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
      speak(reply,
        () => { setVoiceState('speaking'); },
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
      const lower = all.toLowerCase();
      setTranscript(all);

      // Wake word
      if (stateRef.current === 'listening' && WAKE_WORDS.some(w => lower.includes(w))) {
        setVoiceState('awake'); stateRef.current = 'awake';
        setTranscript('');
        window.speechSynthesis.cancel();
        const greeting = getGreeting();
        const greetMsg = { role: 'assistant', content: greeting, id: Date.now() };
        const next = [...messagesRef.current, greetMsg];
        setMessages(next); messagesRef.current = next;
        speak(greeting, () => setVoiceState('speaking'), () => setVoiceState('awake'));
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
          onClick={isActive ? stopListening : startListening}
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

      {/* ── RIGHT PANEL: live stats ── */}
      <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid rgba(6,182,212,0.1)', background: 'rgba(2,8,23,0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', zIndex: 2, padding: '18px 16px', gap: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#22d3ee', textTransform: 'uppercase', opacity: 0.6 }}>Live Stats</div>

        {stats ? (
          <>
            {[
              { label: 'Total Users', value: stats.totalUsers, color: '#22d3ee', bar: Math.min(stats.totalUsers / 1000, 1) },
              { label: 'New Today', value: `+${stats.newToday}`, color: '#4ade80', bar: Math.min(stats.newToday / 20, 1) },
              { label: 'This Week', value: `+${stats.newLast7}`, color: '#a78bfa', bar: Math.min(stats.newLast7 / 100, 1) },
              { label: 'Active (7d)', value: stats.activeUsers, color: '#fb923c', bar: Math.min(stats.activeUsers / 500, 1) },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#334155' }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
                <div style={{ height: 3, background: '#0e1a2a', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${(s.bar || 0.02) * 100}%`, background: s.color, borderRadius: 99, transition: 'width 1s ease', boxShadow: `0 0 6px ${s.color}88` }} />
                </div>
              </div>
            ))}

            {/* Mini bar chart — signups */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#1e3a4a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Signups</div>
              <div style={{ fontSize: 11, color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(stats.recentSignups || []).slice(0, 4).map((e, i) => (
                  <div key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0e4a5a' }}>
                    <span style={{ color: '#22d3ee', marginRight: 6 }}>›</span>{e}
                  </div>
                ))}
                {!stats.recentSignups?.length && <div style={{ color: '#0e2a3a' }}>No recent signups</div>}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#1e3a4a', lineHeight: 1.6 }}>
            Stats will appear after first Jarvis response.
          </div>
        )}

        {/* Voice state indicator */}
        <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)', borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: '#22d3ee', opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>System Status</div>
          {[
            { label: 'Wake Word', active: voiceState !== 'idle' },
            { label: 'Mic', active: voiceState === 'listening' || voiceState === 'awake' },
            { label: 'Processing', active: voiceState === 'thinking' },
            { label: 'Speech Out', active: voiceState === 'speaking' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#334155' }}>{s.label}</div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.active ? '#4ade80' : '#1e293b', boxShadow: s.active ? '0 0 6px #4ade80' : 'none', transition: 'all .3s' }} />
            </div>
          ))}
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
      `}</style>
    </div>
  );
}
