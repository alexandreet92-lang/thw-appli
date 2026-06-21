'use client'
// Loader de marque : logo shuriken THW (4 bras) qui tourne + message + 3 points
// animés. Remplace les skeletons génériques au chargement des pages.
export function BrandLoader({ label = 'Vos données sont en train de se charger' }: { label?: string }) {
  return (
    <div style={{ minHeight: '62vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, boxSizing: 'border-box' }}>
      <style>{`
        @keyframes thwbl-spin { to { transform: rotate(360deg) } }
        @keyframes thwbl-halo { 0%,100%{ transform: scale(0.9); opacity:.45 } 50%{ transform: scale(1.12); opacity:.85 } }
        @keyframes thwbl-dot  { 0%,80%,100%{ opacity:.25; transform: translateY(0) } 40%{ opacity:1; transform: translateY(-4px) } }
        .thwbl-wrap { position: relative; width: 92px; height: 92px; display: flex; align-items: center; justify-content: center; }
        .thwbl-halo { position: absolute; inset: -16%; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0) 70%); animation: thwbl-halo 1.8s ease-in-out infinite; }
        .thwbl-logo { width: 84px; height: 84px; object-fit: contain; animation: thwbl-spin 2.2s cubic-bezier(0.5,0.1,0.5,0.9) infinite; filter: drop-shadow(0 8px 22px rgba(6,182,212,0.28)); }
        .thwbl-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); display: inline-block; animation: thwbl-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .thwbl-logo, .thwbl-halo, .thwbl-dot { animation: none } }
      `}</style>
      <div className="thwbl-wrap">
        <div className="thwbl-halo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/logo_4bras.png" alt="" className="thwbl-logo" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <span className="thwbl-dot" style={{ animationDelay: '0s' }} />
          <span className="thwbl-dot" style={{ animationDelay: '0.15s' }} />
          <span className="thwbl-dot" style={{ animationDelay: '0.3s' }} />
        </span>
      </div>
    </div>
  )
}
