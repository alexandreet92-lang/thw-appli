// Skeleton instantané pendant le chargement du planning d'un athlète —
// évite l'impression de « page qui rame » : la structure apparaît tout de suite.
export default function Loading() {
  const bar: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 8 }
  return (
    <div>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '11px clamp(16px,4vw,40px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ ...bar, width: 42, height: 42, borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...bar, width: 150, height: 14 }} />
            <div style={{ ...bar, width: 190, height: 11 }} />
          </div>
          <div style={{ ...bar, width: 200, height: 44, marginLeft: 'auto', borderRadius: 12 }} />
        </div>
      </div>
      <div style={{ padding: '20px clamp(16px,4vw,40px)', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ ...bar, width: 220, height: 26 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => <div key={i} style={{ ...bar, height: 150 }} />)}
        </div>
      </div>
      <style>{`@keyframes cpp{0%,100%{opacity:.55}50%{opacity:1}} div[style*="bg-card2"]{animation:cpp 1.3s ease infinite}`}</style>
    </div>
  )
}
