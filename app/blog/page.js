'use client';
import Link from 'next/link';

const POSTS = [
  {
    slug: 'ai-study-assistant-tips',
    title: '10 Ways to Use an AI Study Assistant (That Actually Work)',
    excerpt: 'AI study assistants are changing how students approach learning. Here are the most effective ways to leverage AI tools for better grades.',
    date: 'January 15, 2026',
    readTime: '6 min read',
    tag: 'Study Tips',
  },
  {
    slug: 'best-student-planner-app',
    title: 'The Best Student Planner App in 2025',
    excerpt: 'We compared dozens of student planner apps. Here\'s what actually works for tracking assignments, managing deadlines, and staying organized in college.',
    date: 'December 8, 2025',
    readTime: '8 min read',
    tag: 'Productivity',
  },
  {
    slug: 'how-to-track-college-assignments',
    title: 'How to Track College Assignments Without Losing Your Mind',
    excerpt: 'Between multiple classes, group projects, and exams, keeping track of everything can feel impossible. Here\'s a system that actually works.',
    date: 'November 20, 2025',
    readTime: '5 min read',
    tag: 'Organization',
  },
];

export default function BlogPage() {
  return (
    <div className="pub-page">
      <nav className="pub-nav">
        <Link href="/" className="pub-nav-logo">duee<span>.</span></Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Home</Link>
          <Link href="/login" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      <div className="pub-content">
        <div className="pub-hero">
          <h1>duee. Blog</h1>
          <p>Study tips, productivity guides, and everything you need to ace college.</p>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          {POSTS.map(post => (
            <div key={post.slug} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 28, transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ background: 'var(--green-light)', color: 'var(--green-text)', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{post.tag}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.date}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.readTime}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 10 }}>{post.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                Read more →
              </Link>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, padding: '40px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Ready to stop missing deadlines?</p>
          <Link href="/login?mode=signup" className="btn btn-primary">Start for Free →</Link>
        </div>
      </div>

      <footer style={{ padding: '28px 48px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
        <span>© 2026 duee. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
