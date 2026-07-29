'use client'

// Page coach « en construction » — garde la navigation cohérente tant que la
// page dédiée n'est pas construite (phases suivantes).

export function CoachStub({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', textAlign: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <span style={{ width: 56, height: 56, borderRadius: 16, background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
      </span>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', fontFamily: 'Syne,DM Sans,sans-serif' }}>{title}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
      <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} /> En construction
      </div>
    </div>
  )
}
