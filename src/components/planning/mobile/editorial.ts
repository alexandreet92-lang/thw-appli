// ══════════════════════════════════════════════════════════════════
// Thème « Éditorial clair » + helpers du SessionEditor mobile.
// Toutes les couleurs hex sont CENTRALISÉES ici (fichier lib, pas un
// composant) ; les composants ne référencent que var(--se-*) ou les
// constantes exportées. Aucune logique métier — uniquement rendu.
// ══════════════════════════════════════════════════════════════════
import { SPORT_ICON, sportKeyFromType } from '@/components/icons/SportIcon'
import type { SportType } from '@/app/planning/page'

// Feuille de style scoppée à `.se-m` (mobile) et `.se-d` (desktop).
// Masque aussi la MobileTabBar tant que la feuille est montée (§0).
export const EDITORIAL_CSS = `
.se-m, .se-d {
  --se-bg: #faf9f6;
  --se-card: #ffffff;
  --se-card2: #faf9f6;
  --se-text: #1a1a1a;
  --se-dim: #8a8a82;
  --se-rule: #e7e5df;
  --se-rule-soft: #f0eee9;
  --se-r: 14px;
  --se-r-sm: 11px;
  --pat-push: #f97316;
  --pat-pull: #3b82f6;
  --pat-legs: #16a34a;
  --pat-core: #a855f7;
  --pat-full: #64748b;
  --pat-hyrox: #ef4444;
  background: var(--se-bg);
  color: var(--se-text);
  font-family: var(--font-body);
}
.se-m .se-fr, .se-d .se-fr { font-family: var(--font-display); letter-spacing: -0.02em; }
.se-m input, .se-m textarea, .se-m button,
.se-d input, .se-d textarea, .se-d button { font-family: inherit; }
.se-m .se-tnum, .se-d .se-tnum { font-variant-numeric: tabular-nums; }
.se-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (min-width: 1024px) { .se-d .se-fgrid { grid-template-columns: repeat(4, 1fr); } }
body.se-mobile-open .mobile-tab-bar { display: none !important; }
@keyframes seSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes seModalIn { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`

/** Couleur d'accent du sport (map centralisée SportIcon = palette des maquettes). */
export function sportColor(sport: SportType | string): string {
  const k = sportKeyFromType(sport)
  return k ? SPORT_ICON[k].color : '#8a8a82'
}

// Palette 7 zones (intensité) — version douce « éditorial ».
export const ZONE_COL = ['#9ca3af', '#22c55e', '#65c466', '#ffb340', '#ff7a45', '#ff5f5f', '#a855f7']
export const ZONE_NAME = ['Récup', 'Aérobie', 'Tempo', 'Seuil', 'VO2max', 'Anaérobie', 'Sprint']
export const zColor = (z: number) => ZONE_COL[Math.max(0, Math.min(6, (z || 1) - 1))]
export const zName = (z: number) => ZONE_NAME[Math.max(0, Math.min(6, (z || 1) - 1))]

// Couleurs des badges Plan A / Plan B.
export const PLAN_COLOR = { A: '#22b8c4', B: '#a78bfa' } as const

// ── Helpers temps / allure ────────────────────────────────────────
export function paceToSec(s: string): number {
  const m = (s || '').match(/^(\d+):(\d{1,2})$/)
  return m ? (+m[1]) * 60 + (+m[2]) : NaN
}
export function secToPace(n: number): string {
  const x = Math.max(0, Math.round(n))
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
}
/** minutes décimales → "1h05" / "45min". */
export function fmtDur(min: number): string {
  const h = Math.floor((min || 0) / 60), m = Math.round((min || 0) % 60)
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
/** minutes décimales → "m:ss". */
export function fmtMMSS(min: number): string {
  const s = Math.max(0, Math.round((min || 0) * 60))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
export function mmssToMin(v: string): number {
  const m = (v || '').match(/^(\d+):(\d{1,2})$/)
  if (m) return (+m[1]) + (+m[2]) / 60
  const n = parseFloat(v || '0')
  return isNaN(n) ? 0 : n
}
/** Parse une durée saisie ("2h", "2h30", "1:30", "90", "45min") → minutes (null si invalide). */
export function parseDurInput(s: string): number | null {
  const t = (s || '').trim().toLowerCase()
  let m = t.match(/^(\d+)\s*h\s*(\d{1,2})?$/); if (m) return (+m[1]) * 60 + (m[2] ? +m[2] : 0)
  m = t.match(/^(\d+)\s*:\s*(\d{1,2})$/); if (m) return (+m[1]) * 60 + (+m[2])
  m = t.match(/^(\d+)\s*min?$/); if (m) return +m[1]
  m = t.match(/^(\d+)$/); if (m) return +m[1]
  return null
}

/** ±5 s sur une allure mm:ss, sinon ±5 sur un entier (watts). */
export function bumpPaceOrWatts(v: string, steps: number): string {
  const sec = paceToSec(v)
  if (!isNaN(sec)) return secToPace(sec + steps * 5)
  const n = parseInt(v || '0') || 0
  return String(Math.max(0, n + steps * 5))
}

// ── Équivalences (réf athlète manquante ⇒ null = on masque l'équivalent) ──
export interface AthleteRefs {
  ftp: number | null
  runThresholdPaceSec: number | null
  cssSecPer100m: number | null
}
/** Watts → "% FTP" (null si pas de FTP). */
export function pctFtp(watts: number, refs: AthleteRefs): number | null {
  if (!refs.ftp || refs.ftp <= 0 || !watts) return null
  return Math.round((watts / refs.ftp) * 100)
}
/** Allure course (sec/km) → "% VMA seuil" approché (null si pas de réf seuil). */
export function pctOfThreshold(paceSec: number, refs: AthleteRefs): number | null {
  if (!refs.runThresholdPaceSec || refs.runThresholdPaceSec <= 0 || !paceSec) return null
  return Math.round((refs.runThresholdPaceSec / paceSec) * 100)
}
/** Allure natation (sec/100m) → "% CSS" (null si pas de CSS). */
export function pctOfCss(paceSec100: number, refs: AthleteRefs): number | null {
  if (!refs.cssSecPer100m || refs.cssSecPer100m <= 0 || !paceSec100) return null
  return Math.round((refs.cssSecPer100m / paceSec100) * 100)
}
