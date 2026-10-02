// ══════════════════════════════════════════════════════════════════
// Espace COACH — mise en page commune. Sur mobile (≤ 767 px), toute la
// surface de l'espace coach passe au « nouveau style » : page gris chaud
// (--surface-page) + cartes blanches (--surface-card), exactement comme les
// pages cartes de l'athlète (Accueil, Plan…). On redéfinit les tokens de
// fond sur le panneau du MobileShell qui contient la page (sélecteur :has),
// ce qui recolore aussi les bandes de fondu haut/bas du shell.
// Desktop : aucun changement (règle limitée au media query mobile).
// ══════════════════════════════════════════════════════════════════
const COACH_SURFACES = `@media (max-width: 767px){
  div:has(> main [data-coach-root]){
    --bg: var(--surface-page);
    --dash-card: var(--surface-card);
    --dash-chip: var(--surface-chip);
    --dash-bar: var(--surface-bar);
    --dash-line: var(--border);
    --dash-soft: var(--surface-soft);
  }
}`

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{COACH_SURFACES}</style>
      <div data-coach-root style={{ display: 'contents' }}>{children}</div>
    </>
  )
}
