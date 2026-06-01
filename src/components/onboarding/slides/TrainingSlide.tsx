'use client'

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const SESSIONS = [
  { day: 0, color: '#3b82f6' },
  { day: 1, color: '#8b5cf6' },
  { day: 3, color: '#f97316' },
  { day: 4, color: '#06b6d4' },
  { day: 6, color: '#10b981' },
]

function CalendarMockup() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 18, width: '100%', maxWidth: 300, margin: '0 auto', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Week header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{d}</p>
          </div>
        ))}
      </div>
      {/* Day columns */}
      <div style={{ display: 'flex', gap: 5 }}>
        {DAYS.map((_, i) => {
          const s = SESSIONS.find(s => s.day === i)
          return (
            <div key={i} style={{ flex: 1, height: 48, borderRadius: 8, background: s ? `${s.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${s ? s.color + '55' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: s ? `fade-in 0.35s ${i * 80}ms both` : 'none' }}>
              {s && <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />}
            </div>
          )
        })}
      </div>
      {/* Load bar */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', margin: 0, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>Charge</p>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ width: '68%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#06B6D4,#2563EB)', animation: 'fade-in 0.6s 0.4s both' }} />
        </div>
        <p style={{ fontSize: 9, color: '#06B6D4', margin: 0, fontFamily: 'DM Mono, monospace' }}>68%</p>
      </div>
    </div>
  )
}

export default function TrainingSlide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 24px', gap: 28 }}>
      <CalendarMockup />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', fontFamily: 'Syne, sans-serif' }}>Planifie et suis tes progrès</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Programme tes séances, suis ton planning<br />hebdomadaire, analyse ta progression.</p>
      </div>
    </div>
  )
}
