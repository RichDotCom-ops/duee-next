'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    // Simulate sending
    setTimeout(() => {
      setSent(true);
      setSending(false);
    }, 1000);
  }

  return (
    <div className="pub-page">
      <nav className="pub-nav">
        <Link href="/" className="pub-nav-logo">duee<span>.</span></Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Home</Link>
          <Link href="/login" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      <div className="pub-content" style={{ maxWidth: 600 }}>
        <div className="pub-hero">
          <h1>Contact Us</h1>
          <p>Have a question, feedback, or bug report? We&apos;d love to hear from you.</p>
        </div>

        {sent ? (
          <div style={{ background: 'var(--green-light)', color: 'var(--green-text)', padding: 32, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Message Sent!</h3>
            <p>Thanks for reaching out. We typically respond within 24 hours.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>Send Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 32 }}>
            <div className="form-row">
              <div className="form-group">
                <label>Your Name</label>
                <input className="form-control" placeholder="Alex Johnson" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" type="email" placeholder="you@school.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select className="form-control" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required>
                <option value="">Select a subject</option>
                <option>General Question</option>
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Billing</option>
                <option>Account Issue</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea className="form-control" rows={5} placeholder="Tell us what's on your mind…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={sending}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Email</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>hello@duee.online</p>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Response Time</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Usually within 24 hours</p>
          </div>
        </div>
      </div>

      <footer style={{ padding: '28px 48px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
        <span>© 2026 duee. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
        </div>
      </footer>
    </div>
  );
}
