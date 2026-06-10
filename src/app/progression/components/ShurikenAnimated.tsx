'use client'

// ══════════════════════════════════════════════════════════════════
// ShurikenAnimated — VRAI logo THW 4 bras (/logos/logo_4bras.png).
// Cycle 6,5 s : rotation complète → pause → séparation des 4 bras
// (chacun s'écarte du centre et tourne sur lui-même 360°) →
// reconstitution → pause → boucle. Halo cyan pulsant synchronisé.
//
// Technique : 4 calques du logo complet, chacun découpé en quadrant
// via clip-path (1 bras par quadrant). Assemblés = logo pixel-perfect ;
// séparés = bras détachés qui tournent individuellement. Si un asset
// « 1 bras » détouré est déposé dans /public/logos, on pourra switcher
// dessus directement.
// 60 fps (transform/opacity), prefers-reduced-motion respecté.
// ══════════════════════════════════════════════════════════════════

const LOGO = '/logos/logo_4bras.png'

const BRANCHES = [
  { id: 'top',    clip: 'polygon(50% 50%, 0% 0%, 100% 0%)',     origin: '50% 27%' },
  { id: 'right',  clip: 'polygon(50% 50%, 100% 0%, 100% 100%)', origin: '73% 50%' },
  { id: 'bottom', clip: 'polygon(50% 50%, 100% 100%, 0% 100%)', origin: '50% 73%' },
  { id: 'left',   clip: 'polygon(50% 50%, 0% 100%, 0% 0%)',     origin: '27% 50%' },
] as const

export function ShurikenAnimated() {
  return (
    <div className="shuriken-container" aria-hidden>
      <style>{`
        .shuriken-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 320px; height: 320px; z-index: 2; filter: drop-shadow(0 10px 24px rgba(6,182,212,0.30)); }
        .shuriken-halo { position: absolute; inset: -8%; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0) 70%); animation: thw-halo 6.5s ease-in-out infinite; }
        .shuriken-rotor { position: absolute; inset: 0; animation: thw-rotor 6.5s cubic-bezier(0.45,0,0.2,1) infinite; }
        .shuriken-branch { position: absolute; inset: 0; background-image: url('${LOGO}'); background-size: contain; background-position: center; background-repeat: no-repeat; will-change: transform; }
        .shuriken-branch-top    { clip-path: polygon(50% 50%, 0% 0%, 100% 0%);     transform-origin: 50% 27%; animation: thw-br-top 6.5s ease-in-out infinite; }
        .shuriken-branch-right  { clip-path: polygon(50% 50%, 100% 0%, 100% 100%); transform-origin: 73% 50%; animation: thw-br-right 6.5s ease-in-out infinite; }
        .shuriken-branch-bottom { clip-path: polygon(50% 50%, 100% 100%, 0% 100%); transform-origin: 50% 73%; animation: thw-br-bottom 6.5s ease-in-out infinite; }
        .shuriken-branch-left   { clip-path: polygon(50% 50%, 0% 100%, 0% 0%);     transform-origin: 27% 50%; animation: thw-br-left 6.5s ease-in-out infinite; }

        /* Phase 1 (0-31%) : rotation complète du shuriken assemblé, puis pause */
        @keyframes thw-rotor {
          0%   { transform: rotate(0deg); }
          31%  { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }
        /* Phase 2 (38-62%) : séparation + rotation individuelle (360°)
           Phase 3 (62-85%) : retour + 2e tour (720°) → reconstitution
           Phase 4 (85-100%) : pause, puis boucle */
        @keyframes thw-br-top {
          0%, 38%   { transform: translate(0, 0) rotate(0deg); }
          62%       { transform: translate(0, -34%) rotate(360deg); }
          85%, 100% { transform: translate(0, 0) rotate(720deg); }
        }
        @keyframes thw-br-right {
          0%, 38%   { transform: translate(0, 0) rotate(0deg); }
          62%       { transform: translate(34%, 0) rotate(360deg); }
          85%, 100% { transform: translate(0, 0) rotate(720deg); }
        }
        @keyframes thw-br-bottom {
          0%, 38%   { transform: translate(0, 0) rotate(0deg); }
          62%       { transform: translate(0, 34%) rotate(360deg); }
          85%, 100% { transform: translate(0, 0) rotate(720deg); }
        }
        @keyframes thw-br-left {
          0%, 38%   { transform: translate(0, 0) rotate(0deg); }
          62%       { transform: translate(-34%, 0) rotate(360deg); }
          85%, 100% { transform: translate(0, 0) rotate(720deg); }
        }
        @keyframes thw-halo {
          0%, 100% { transform: scale(0.85); opacity: 0.55; }
          31%      { transform: scale(1);    opacity: 0.9; }
          50%      { transform: scale(1.18); opacity: 1; }
          85%      { transform: scale(0.95); opacity: 0.8; }
        }
        @media (max-width: 768px) { .shuriken-container { width: 200px; height: 200px; } }
        @media (prefers-reduced-motion: reduce) { .shuriken-rotor, .shuriken-branch, .shuriken-halo { animation: none; } }
      `}</style>
      <div className="shuriken-halo" />
      <div className="shuriken-rotor">
        {BRANCHES.map(b => (
          <div key={b.id} className={`shuriken-branch shuriken-branch-${b.id}`} />
        ))}
      </div>
    </div>
  )
}
