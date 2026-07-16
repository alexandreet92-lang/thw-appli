'use client'
// Surcouche pause : gèle chronos + enregistrement. Reprendre / Terminer.
export default function RidePause({ onResume, onFinish }: { onResume: () => void; onFinish: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20, background: 'var(--ride-scrim)',
      backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 14, padding: 30,
    }}>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>En pause</div>
      <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700, marginBottom: 10 }}>Enregistrement suspendu</div>
      <button onClick={onResume} style={{ width: '100%', maxWidth: 240, height: 48, borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 800, cursor: 'pointer', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)' }}>Reprendre</button>
      <button onClick={onFinish} style={{ width: '100%', maxWidth: 240, height: 48, borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 800, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-mid)', color: 'var(--charge-hard)' }}>Terminer la séance</button>
    </div>
  )
}
