'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — feuille de style (≤ 767 px uniquement).
// Tout passe par des tokens (globals.css) : page grise --surface-page,
// cartes --surface-card, boutons flottants --float-bg, bulles --surface-chip.
// Les teintes des tuiles d'icônes réutilisent des tokens existants
// (fond teinté très faible opacité, cf. DESIGN_SYSTEM §2.1).
// Le desktop n'est PAS affecté (media query).
// ══════════════════════════════════════════════════════════════

const CSS = `
@media (max-width: 767px) {
  html .aip-root { background: var(--surface-page); }
  html .aip-root .aip-chat-col { background: var(--surface-page) !important; }

  /* Teintes des tuiles d'icônes (fond 15 % + pictogramme plein). */
  .aim-tint-plan      { --aim-tint: var(--primary); }
  .aim-tint-activity  { --aim-tint: var(--zone-4); }
  .aim-tint-recovery  { --aim-tint: var(--danger); }
  .aim-tint-nutrition { --aim-tint: var(--success); }
  .aim-tint-quick     { --aim-tint: var(--charge-mid); }
  .aim-tint-route     { --aim-tint: var(--success); }
  .aim-tint-connect   { --aim-tint: var(--year-2025); }
  .aim-tint-skills    { --aim-tint: var(--cat-perso); }
  .aim-tint-web       { --aim-tint: var(--primary); }
  .aim-tile {
    width: 30px; height: 30px; border-radius: var(--r-sm); flex-shrink: 0;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--aim-tint) 15%, transparent);
    color: var(--aim-tint);
  }

  /* Groupes de lignes des feuilles (fond gris doux, sans bordure). */
  .aim-group { background: var(--surface-page); border-radius: var(--r-lg); overflow: hidden; }
  html.dark .aim-group { background: var(--surface-chip); }
  .aim-tilebtn { background: var(--surface-page); }
  html.dark .aim-tilebtn { background: var(--surface-chip); }
  .aim-row { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
    border: none; background: transparent; text-align: left; color: var(--text); font-family: var(--font-body); cursor: pointer; }
  .aim-row:active { background: var(--bg-hover); }
  .aim-sep { height: 1px; background: var(--border); margin-left: 56px; }
  .aim-sep.flush { margin-left: 14px; }

  /* Cartes spéciales du fil (graphes, séances, parcours…) sur carte blanche r=20. */
  .aim-card {
    background: var(--surface-card); border-radius: var(--r-lg);
    padding: 14px 16px; overflow: hidden;
  }
  .aim-card > * { margin-left: 0 !important; }
  .aim-cardframe > :first-child {
    background: var(--surface-card) !important;
    border-color: transparent !important;
    border-radius: var(--r-lg) !important;
    margin-left: 0 !important;
  }
  .aim-card:empty, .aim-cardframe:empty { display: none; }
  /* Apparition douce (montée + fondu, ressort iOS) des cartes du fil. */
  @keyframes aim_rise { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
  .aim-card, .aim-cardframe > :first-child:not(.aimc) { animation: aim_rise 0.5s cubic-bezier(0.32, 0.72, 0, 1) both; }

  /* Barre d'actions des messages : toujours visible au tactile, cibles 44 px. */
  .aim-msg-acts { gap: 0 !important; margin-left: -13px; }
  .aim-msg-acts button { width: 44px; height: 44px; justify-content: center; }
  .aim-msg-acts button svg { width: 18px; height: 18px; }

  /* Composeur : carte flottante blanche, r=26, ombre douce, au-dessus du safe-area. */
  html .aip-root .aip-input-footer {
    padding: 4px 12px var(--aim-pb, calc(10px + env(safe-area-inset-bottom, 0px))) !important;
    background: transparent !important; border-top: none !important;
    transition: padding-bottom 250ms cubic-bezier(0.17, 0.59, 0.4, 0.77);
  }
  /* Clavier ouvert (classe posée par AIPanel, cf. src/lib/native/keyboard.ts) :
     le panneau s'arrête au ras du clavier → la carte repose dessus (6 px),
     sans la marge safe-area du home indicator (caché sous le clavier). */
  html .aip-root.aip-kb-open .aip-input-footer { --aim-pb: 6px; }
  html .aip-input-wrap.aim-composer, html.dark .aip-input-wrap.aim-composer {
    border-radius: calc(var(--r-lg) + 6px) !important;
    background: var(--float-bg) !important;
    border: none !important;
    box-shadow: var(--shadow-capsule) !important;
  }
  html.dark .aip-input-wrap.aim-composer {
    box-shadow: 0 0 0 1px var(--border), var(--shadow-capsule) !important;
  }
  /* Jamais d'anneau / de bordure de focus sur le composeur mobile (façon Claude). */
  html .aip-input-wrap.aim-composer:focus-within {
    border: none !important; outline: none !important;
    box-shadow: var(--shadow-capsule) !important;
  }
  html.dark .aip-input-wrap.aim-composer:focus-within {
    border: none !important; outline: none !important;
    box-shadow: 0 0 0 1px var(--border), var(--shadow-capsule) !important;
  }
  .aip-input-wrap.aim-composer .aip-textarea { color: var(--text) !important; caret-color: var(--primary); }
  .aip-input-wrap.aim-composer .aip-textarea:read-only { cursor: default; }
  .aip-input-wrap.aim-composer .aip-textarea {
    font-size: 16px !important; padding: 14px 16px 4px !important; min-height: 48px !important;
  }
  .aip-input-wrap.aim-composer [data-guide="ai-plus"] {
    width: 44px !important; height: 44px !important;
    background: var(--float-bg) !important; color: var(--text) !important;
    box-shadow: inset 0 0 0 1px var(--border-mid) !important;
  }
  .aip-input-wrap.aim-composer [data-guide="ai-plus"] svg { width: 20px; height: 20px; }

  /* Retour tactile des boutons ronds (désactivé si mouvement réduit). */
  .aim-press { transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .aim-press:active { transform: scale(0.94); }
  .aim-scroll-x { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .aim-scroll-x::-webkit-scrollbar { display: none; }

  @keyframes aim_fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .aim-gauge-fill { transform-origin: left center; animation: aim_fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1); }
  @keyframes aim_fade_up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .aim-fade-up { animation: aim_fade_up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@media (max-width: 767px) and (prefers-reduced-motion: reduce) {
  .aim-press, .aim-press:active { transition: none; transform: none; }
  .aim-fade-up, .aim-gauge-fill, .aim-card, .aim-cardframe > :first-child:not(.aimc) { animation: none; transition: none; }
}
`

export function AimStyles() {
  return <style>{CSS}</style>
}
