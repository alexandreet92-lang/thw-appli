'use client'

const STRENGTH: { label: string; color: string }[] = [
  { label: '',          color: 'transparent' },
  { label: 'Faible',    color: '#EF4444' },
  { label: 'Moyen',     color: '#F59E0B' },
  { label: 'Fort',      color: '#10B981' },
  { label: 'Excellent', color: '#06B6D4' },
]

function score(pwd: string): number {
  let s = 0
  if (pwd.length >= 8)         s++
  if (/[A-Z]/.test(pwd))       s++
  if (/[0-9]/.test(pwd))       s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null
  const s = score(password)
  const cfg = STRENGTH[s]
  return (
    <div style={{ marginTop: 6, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= s ? cfg.color : 'rgba(255,255,255,0.1)',
            transition: 'background 300ms',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: cfg.color, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
        {cfg.label}
      </p>
    </div>
  )
}
