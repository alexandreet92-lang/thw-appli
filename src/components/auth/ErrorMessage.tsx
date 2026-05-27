'use client'

interface Props { error: string }

export function ErrorMessage({ error }: Props) {
  if (!error) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 12, marginTop: 4,
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.25)',
      animation: 'em-shake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
    }}>
      <style>{`@keyframes em-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5"/>
        <path d="M8 5v4M8 10.5v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize: 13, color: '#EF4444', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
        {error}
      </p>
    </div>
  )
}
