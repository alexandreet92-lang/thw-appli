'use client'
// Rangée compacte de 3 boutons d'ajout : Photo IA / Recherche / Manuel.
// Sobres, fond --bg-card2, icône + label. Cyan = action (texte au survol/focus discret).
// Pas de gros pavés. Tokens uniquement.

const FB = 'var(--font-body)'

const btn: React.CSSProperties = {
  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, height: 36, padding: '0 var(--space-2)', borderRadius: 'var(--r-sm)',
  border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)',
  fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxSizing: 'border-box',
}

export function MealActions({ onPhoto, onSearch, onManual }: {
  onPhoto: () => void
  onSearch: () => void
  onManual: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
      <button style={btn} onClick={onPhoto}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Photo IA</span>
      </button>
      <button style={btn} onClick={onSearch}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M12 2l1.7 5.8L19.5 9.5l-5.8 1.7L12 17l-1.7-5.8L4.5 9.5l5.8-1.7z"/></svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>IA</span>
      </button>
      <button style={btn} onClick={onManual}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14"/></svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Manuel</span>
      </button>
    </div>
  )
}