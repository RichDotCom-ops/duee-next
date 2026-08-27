'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Auth } from '../lib/auth';
import { DB } from '../lib/data';
import { showToast } from '../lib/utils';

// ── Storage keys ─────────────────────────────────────────────────────────────
const MEM_KEY   = uid => `duee_ai_mem_${uid}`;
const CHATS_KEY = uid => `duee_ai_chats_${uid}`;

// ── Memory helpers ────────────────────────────────────────────────────────────
function loadMemory(uid) {
  try { return JSON.parse(localStorage.getItem(MEM_KEY(uid))) || []; }
  catch { return []; }
}
function saveMemory(uid, facts) {
  localStorage.setItem(MEM_KEY(uid), JSON.stringify(facts.slice(-60)));
}
function addFact(uid, fact) {
  if (!fact || !uid) return;
  const facts = loadMemory(uid);
  if (!facts.includes(fact)) { facts.push(fact); saveMemory(uid, facts); }
}
function deleteFact(uid, idx) {
  const facts = loadMemory(uid); facts.splice(idx, 1); saveMemory(uid, facts);
}
function formatMemory(uid) {
  const facts = loadMemory(uid);
  return facts.length ? facts.map((f, i) => `${i + 1}. ${f}`).join('\n') : null;
}

// ── Chat history helpers ──────────────────────────────────────────────────────
function loadChats(uid) {
  try { return JSON.parse(localStorage.getItem(CHATS_KEY(uid))) || []; }
  catch { return []; }
}
function saveChats(uid, chats) {
  localStorage.setItem(CHATS_KEY(uid), JSON.stringify(chats.slice(-40)));
}
function persistChat(uid, chat) {
  if (!uid || !chat.id) return;
  const chats = loadChats(uid);
  const idx = chats.findIndex(c => c.id === chat.id);
  if (idx >= 0) chats[idx] = chat; else chats.unshift(chat);
  saveChats(uid, chats);
}
function deleteChat(uid, chatId) {
  saveChats(uid, loadChats(uid).filter(c => c.id !== chatId));
}
function chatTitle(messages) {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New conversation';
  const t = typeof first.content === 'string' ? first.content : first.content?.[0]?.text || 'Image message';
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
}
function fmtDate(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={i}>{seg.slice(2, -2)}</strong>;
    if (seg.startsWith('*') && seg.endsWith('*')) return <em key={i}>{seg.slice(1, -1)}</em>;
    if (seg.startsWith('`') && seg.endsWith('`')) return <code key={i} className="ai-code">{seg.slice(1, -1)}</code>;
    return seg;
  });
}

function renderContent(content) {
  if (!content) return null;
  const lines = content.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === '') { out.push(<div key={i} className="ai-spacer" />); i++; continue; }
    if (line.startsWith('### ')) { out.push(<div key={i} className="ai-h3">{renderInline(line.slice(4))}</div>); i++; continue; }
    if (line.startsWith('## ')) { out.push(<div key={i} className="ai-h2">{renderInline(line.slice(3))}</div>); i++; continue; }
    if (line.startsWith('# ')) { out.push(<div key={i} className="ai-h1">{renderInline(line.slice(2))}</div>); i++; continue; }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
        items.push(<div key={i} className="ai-bullet"><span className="ai-bullet-dot">•</span><span>{renderInline(lines[i].slice(2))}</span></div>);
        i++;
      }
      out.push(<div key={`ul${i}`} className="ai-list">{items}</div>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const m = lines[i].match(/^(\d+)\.\s(.*)/);
        items.push(<div key={i} className="ai-bullet"><span className="ai-bullet-num">{m[1]}.</span><span>{renderInline(m[2])}</span></div>);
        i++;
      }
      out.push(<div key={`ol${i}`} className="ai-list">{items}</div>);
      continue;
    }
    out.push(<div key={i}>{renderInline(line)}</div>);
    i++;
  }
  return out;
}

// ── Proactive greeting ────────────────────────────────────────────────────────
function getGreeting(assignments, classes) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];
  const overdue  = assignments.filter(a => !a.completed && new Date(a.dueDate+'T00:00:00') < today);
  const dueToday = assignments.filter(a => !a.completed && a.dueDate === todayStr);
  const dueSoon  = assignments.filter(a => { if (a.completed) return false; const d = Math.round((new Date(a.dueDate+'T00:00:00') - today) / 86400000); return d > 0 && d <= 3; });
  const pending  = assignments.filter(a => !a.completed);
  if (overdue.length && dueToday.length) return `You have ${overdue.length} overdue and ${dueToday.length} due today. Want help prioritizing?`;
  if (overdue.length) return `${overdue.length} overdue assignment${overdue.length > 1 ? 's' : ''}. Want to tackle them now?`;
  if (dueToday.length) return `${dueToday.length} due today. Need help with any of them?`;
  if (dueSoon.length) return `${dueSoon.length} assignment${dueSoon.length > 1 ? 's' : ''} coming up soon. Want to plan ahead?`;
  if (!classes.length) return 'Add your classes first — just say "add Chemistry" and I\'ll set it up.';
  if (!pending.length) return 'You\'re all caught up! Ask me anything or plan ahead.';
  return 'Hey! Ask me anything — I can explain concepts, help plan your week, or add assignments.';
}

const QUICK_PROMPTS = [
  'I have 30 minutes — what should I work on?',
  'I have 1 hour — what fits?',
  'What should I focus on today?',
  'Help me make a study plan',
];

// ── Image helpers ─────────────────────────────────────────────────────────────
// Compress + resize image to max 800px, JPEG 0.75, before sending to API
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AiChat() {
  const [open,        setOpen]        = useState(false);
  const [view,        setView]        = useState('chat');
  const [user,        setUser]        = useState(null);
  const [classes,     setClasses]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [dataReady,   setDataReady]   = useState(false);
  const [chatId,      setChatId]      = useState(null);
  const [chats,       setChats]       = useState([]);
  const [memories,    setMemoriesState] = useState([]);
  const [image,       setImage]       = useState(null); // base64 dataURL

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const userRef     = useRef(null);
  const chatIdRef   = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const session = await Auth.getSession();
        if (!session?.user) return;
        const u = session.user;
        setUser(u); userRef.current = u;
        const [cls, asgn] = await Promise.all([DB.getClasses(u.id), DB.getAssignments(u.id)]);
        setClasses(cls); setAssignments(asgn); setDataReady(true);
        setMemoriesState(loadMemory(u.id));
        const saved = loadChats(u.id);
        setChats(saved);
        const today = new Date().toISOString().split('T')[0];
        const todayChat = saved.find(c => c.updatedAt?.startsWith(today) && c.messages?.some(m => m.role === 'user'));
        if (todayChat) { setChatId(todayChat.id); chatIdRef.current = todayChat.id; setMessages(todayChat.messages); messagesRef.current = todayChat.messages; }
        else startNewChat(asgn, cls, false);
      } catch (e) { console.error('AiChat init:', e); }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Paste image ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function onPaste(e) {
      if (!open) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          const b64 = await fileToBase64(file);
          setImage(b64);
          e.preventDefault();
          break;
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  // ── New chat ──────────────────────────────────────────────────────────────
  function startNewChat(asgn, cls, save = true) {
    const uid = userRef.current?.id;
    if (save && uid && chatIdRef.current) {
      const cur = messagesRef.current;
      if (cur.some(m => m.role === 'user')) {
        persistChat(uid, { id: chatIdRef.current, title: chatTitle(cur), messages: cur, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        setChats(loadChats(uid));
      }
    }
    const id = `chat_${Date.now()}`;
    setChatId(id); chatIdRef.current = id;
    const init = [{ role: 'assistant', content: getGreeting(asgn || assignments, cls || classes), id: 'init' }];
    setMessages(init); messagesRef.current = init;
    setInput(''); setImage(null); setView('chat');
  }

  function autosave(msgs) {
    const uid = userRef.current?.id, id = chatIdRef.current;
    if (!uid || !id || !msgs.some(m => m.role === 'user')) return;
    persistChat(uid, { id, title: chatTitle(msgs), messages: msgs, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setChats(loadChats(uid));
  }

  // ── Pick image ────────────────────────────────────────────────────────────
  async function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setImage(b64);
    e.target.value = '';
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && !image) || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      image: image || null,
      id: Date.now(),
    };
    const history = [...messages, userMsg];
    setMessages(history); messagesRef.current = history;
    setInput(''); setImage(null); setLoading(true);

    try {
      // Build API messages — convert image attachments to multimodal format
      const apiMessages = history
        .slice(history[0]?.id === 'init' ? 1 : 0)
        .map(m => {
          if (m.image) {
            return {
              role: m.role,
              content: [
                ...(m.content ? [{ type: 'text', text: m.content }] : []),
                { type: 'image_url', image_url: { url: m.image } },
              ],
            };
          }
          return { role: m.role, content: m.content };
        });

      const hasImage = apiMessages.some(m => Array.isArray(m.content));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          hasImage,
          context: {
            userName: Auth.getUserName(user),
            classes,
            assignments,
            date: new Date().toISOString().split('T')[0],
          },
          memory: user ? formatMemory(user.id) : null,
        }),
      });

      const data = await res.json();
      if (data.error) {
        const next = [...history, { role: 'assistant', content: `Something went wrong: ${data.error}`, id: Date.now() }];
        setMessages(next); messagesRef.current = next; return;
      }

      const actionNotes = [];
      if (data.actions?.length && user) {
        for (const action of data.actions) {
          try {
            if (action.type === 'ADD_ASSIGNMENT') {
              const d = action.data;
              const newA = await DB.addAssignment(user.id, { name: d.name || 'New Assignment', dueDate: d.dueDate || new Date().toISOString().split('T')[0], priority: d.priority || 'medium', classId: d.classId || '', dueTime: '23:59', estimatedTime: '1.5', notes: '' });
              setAssignments(prev => [...prev, newA]);
              showToast(`Added: ${d.name}`, 'success');
              actionNotes.push(`Added assignment: ${d.name} (due ${d.dueDate})`);
            }
            if (action.type === 'ADD_CLASS') {
              const d = action.data;
              const newCls = await DB.addClass(user.id, { name: d.name || 'New Class', color: d.color || '#16a34a', professor: d.professor || '', icon: d.icon || 'book' });
              setClasses(prev => [...prev, newCls]);
              showToast(`Added class: ${d.name}`, 'success');
              actionNotes.push(`Added class: ${d.name}`);
            }
            if (action.type === 'REMOVE_ASSIGNMENT') {
              const found = assignments.find(a => a.id === action.data.id);
              await DB.deleteAssignment(action.data.id);
              setAssignments(prev => prev.filter(a => a.id !== action.data.id));
              showToast(`Removed: ${found?.name || 'assignment'}`, 'success');
            }
          } catch { actionNotes.push('Could not complete one action — try again.'); }
        }
      }

      if (data.memories?.length && user) {
        for (const fact of data.memories) addFact(user.id, fact);
        setMemoriesState(loadMemory(user.id));
      }

      const aiMsg = { role: 'assistant', content: data.content + (actionNotes.length ? '\n\n' + actionNotes.join('\n') : ''), id: Date.now() };
      const next = [...history, aiMsg];
      setMessages(next); messagesRef.current = next; autosave(next);
    } catch {
      const next = [...history, { role: 'assistant', content: 'Connection error. Please try again.', id: Date.now() }];
      setMessages(next); messagesRef.current = next;
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, image, loading, messages, user, classes, assignments]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function loadChat(chat) {
    setChatId(chat.id); chatIdRef.current = chat.id;
    setMessages(chat.messages); messagesRef.current = chat.messages;
    setView('chat');
  }

  function removeChat(e, id) {
    e.stopPropagation();
    deleteChat(user?.id, id);
    setChats(loadChats(user?.id));
  }

  function removeMemory(idx) {
    deleteFact(user?.id, idx);
    setMemoriesState(loadMemory(user?.id));
  }

  const showQuick = messages.length === 1 && !loading && view === 'chat';

  return (
    <>
      {open && (
        <div className="ai-panel">

          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <div className="ai-status-dot" />
              <span>Duee AI</span>
              {dataReady && <span className="ai-live-badge">LIVE</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className={`ai-header-btn${view === 'memory' ? ' active' : ''}`} onClick={() => setView(v => v === 'memory' ? 'chat' : 'memory')} title="Memory">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04"/></svg>
                {memories.length > 0 && <span className="ai-badge-count">{memories.length}</span>}
              </button>
              <button className={`ai-header-btn${view === 'history' ? ' active' : ''}`} onClick={() => setView(v => v === 'history' ? 'chat' : 'history')} title="History">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {chats.filter(c => c.messages?.some(m => m.role === 'user')).length > 0 && <span className="ai-badge-count">{chats.filter(c => c.messages?.some(m => m.role === 'user')).length}</span>}
              </button>
              <button className="ai-header-btn" onClick={() => startNewChat()} title="New chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button className="ai-close-btn" onClick={() => setOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Memory view */}
          {view === 'memory' && (
            <div className="ai-side-panel">
              <div className="ai-side-title">What I remember about you</div>
              {memories.length === 0 ? (
                <div className="ai-side-empty">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
                  <div style={{ fontWeight: 600 }}>No memories yet</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>I'll remember your study habits, goals, schedule and more as we talk.</div>
                </div>
              ) : memories.map((fact, i) => (
                <div key={i} className="ai-mem-row">
                  <div className="ai-mem-dot" />
                  <div className="ai-mem-text">{fact}</div>
                  <button className="ai-mem-del" onClick={() => removeMemory(i)} title="Forget this">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* History view */}
          {view === 'history' && (
            <div className="ai-side-panel">
              <div className="ai-side-title">Chat history</div>
              {chats.filter(c => c.messages?.some(m => m.role === 'user')).length === 0 ? (
                <div className="ai-side-empty">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600 }}>No past chats</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Conversations are saved automatically.</div>
                </div>
              ) : chats.filter(c => c.messages?.some(m => m.role === 'user')).map(chat => (
                <div key={chat.id} className={`ai-hist-row${chat.id === chatId ? ' active' : ''}`} onClick={() => loadChat(chat)}>
                  <div className="ai-hist-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="ai-hist-info">
                    <div className="ai-hist-title">{chat.title}</div>
                    <div className="ai-hist-meta">{chat.messages.filter(m => m.role === 'user').length} messages · {fmtDate(chat.updatedAt || chat.createdAt)}</div>
                  </div>
                  <button className="ai-hist-del" onClick={e => removeChat(e, chat.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat view */}
          {view === 'chat' && (
            <>
              <div className="ai-messages">
                {messages.map(m => (
                  <div key={m.id} className={`ai-msg ${m.role}`}>
                    {m.role === 'assistant' && (
                      <div className="ai-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
                      </div>
                    )}
                    <div className="ai-bubble">
                      {m.image && (
                        <img src={m.image} alt="attached" className="ai-img-preview" style={{ marginBottom: m.content ? 8 : 0 }} />
                      )}
                      {m.content && (
                        <div className="ai-md">{renderContent(m.content)}</div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-msg assistant">
                    <div className="ai-avatar">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
                    </div>
                    <div className="ai-bubble ai-typing"><span /><span /><span /></div>
                  </div>
                )}

                {showQuick && (
                  <div className="ai-quick-prompts">
                    {QUICK_PROMPTS.map(q => (
                      <button key={q} className="ai-quick-btn" onClick={() => {
                        setInput(q);
                        // Small delay so state updates before send fires
                        setTimeout(() => {
                          setInput('');
                          const userMsg = { role: 'user', content: q, id: Date.now() };
                          const history = [...messagesRef.current, userMsg];
                          setMessages(history);
                          messagesRef.current = history;
                          setLoading(true);
                          fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              messages: history.slice(history[0]?.id === 'init' ? 1 : 0).map(m => ({ role: m.role, content: m.content })),
                              context: { userName: Auth.getUserName(user), classes, assignments, date: new Date().toISOString().split('T')[0] },
                              memory: user ? formatMemory(user.id) : null,
                            }),
                          }).then(r => r.json()).then(data => {
                            if (data.memories?.length && user) { for (const f of data.memories) addFact(user.id, f); setMemoriesState(loadMemory(user.id)); }
                            const aiMsg = { role: 'assistant', content: data.error ? `Error: ${data.error}` : data.content, id: Date.now() };
                            const next = [...history, aiMsg];
                            setMessages(next); messagesRef.current = next; autosave(next);
                          }).catch(() => {
                            const next = [...history, { role: 'assistant', content: 'Connection error. Try again.', id: Date.now() }];
                            setMessages(next); messagesRef.current = next;
                          }).finally(() => setLoading(false));
                        }, 30);
                      }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Image preview */}
              {image && (
                <div className="ai-img-attach">
                  <img src={image} alt="attachment" className="ai-img-thumb" />
                  <button className="ai-img-remove" onClick={() => setImage(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="ai-input-row">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickImage} />
                <button className="ai-img-btn" onClick={() => fileRef.current?.click()} title="Attach image or paste a screenshot">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <textarea
                  ref={inputRef}
                  className="ai-input"
                  placeholder={image ? 'Ask about this image…' : 'Ask anything, or paste a screenshot'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button className="ai-send-btn" onClick={send} disabled={(!input.trim() && !image) || loading}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button className={`ai-fab${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="AI Study Assistant">
        {open
          ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg>
        }
        {!open && <span className="ai-fab-label">AI Tutor</span>}
      </button>
    </>
  );
}
