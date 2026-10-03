'use client'
// ════════════════════════════════════════════════════════════════════
// GuidePanel — panneau de guidage déplié (spec §4, maquette L6) : grande
// feuille glissable (~85 % de l'écran) sous le bandeau de virage, par-dessus
// la carte (la feuille de données est masquée pendant ce temps), bouton ✕ ; en-tête icône 44 + « Suivez l'itinéraire », liste des
// manœuvres À VENIR (icône 40, distance 27/800, libellé 15/600, badge route,
// chip de sortie ORS), opacité dégressive 1/1/1/.72/.5/.34, chevron de repli.
// SANS manœuvres ORS : jamais vide — DÉTAIL DU PARCOURS (nom, distance,
// D+ si connu, mini profil altimétrique SVG maison avec progression).
// Exporte aussi les briques réutilisées par le bandeau compact de MapPage :
// ManeuverIcon (SVG inline stroke currentColor 2.6-2.8, paths de la maquette),
// maneuverKind, detectRoadBadge, RoadBadge, exitChipLabel.
// Aucune donnée inventée : badge / chip absents si ORS ne les fournit pas.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { NavStep } from '@/lib/openrouteservice'
import { useI18n } from '@/lib/i18n'
import SnapSheet from '../kit/SnapSheet'
import { RkFab, RkIco, RK_ICON } from '../kit/RecordKit'

interface LL { lat: number; lng: number }

// ── Détection de virages depuis la GÉOMÉTRIE (repli sans manœuvres ORS) ──
// Pour les parcours sans étapes ORS (GPX importé, clé ORS absente…) on ne peut
// pas donner les noms de rue, mais on affiche quand même la LISTE des virages
// (distance + sens) plutôt qu'un profil altimétrique — c'est « où aller ».
function bearingDeg(a: LL, b: LL): number {
  const toRad = (d: number) => d * Math.PI / 180
  const toDeg = (r: number) => r * 180 / Math.PI
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat))
    - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export interface GeoTurn { cumM: number; kind: 'left' | 'right' }

/** Virages significatifs (≥ 35°) le long du tracé, fenêtre ~18 m de part et d'autre. */
export function deriveTurns(line: LL[], cum: number[]): GeoTurn[] {
  if (line.length < 3) return []
  const out: GeoTurn[] = []
  const total = cum[cum.length - 1] ?? 0
  const idxAt = (target: number) => {
    let lo = 0, hi = cum.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid }
    return lo
  }
  for (let i = 1; i < line.length - 1; i++) {
    const c = cum[i]
    if (c < 25 || total - c < 25) continue // pas de virage collé au départ/arrivée
    const before = line[idxAt(Math.max(0, c - 18))]
    const after = line[idxAt(Math.min(total, c + 18))]
    if (!before || !after) continue
    let delta = bearingDeg(line[i], after) - bearingDeg(before, line[i])
    while (delta > 180) delta -= 360
    while (delta < -180) delta += 360
    if (Math.abs(delta) < 35) continue
    // Fusion des virages trop rapprochés (< 22 m).
    if (out.length > 0 && c - out[out.length - 1].cumM < 22) continue
    out.push({ cumM: c, kind: delta > 0 ? 'right' : 'left' })
  }
  return out
}

// ── Icônes de manœuvre (maquette const IC — pas de librairie d'icônes) ──
export type ManeuverKind = 'right' | 'left' | 'rondR' | 'rondL' | 'straight' | 'join'

/** Type de manœuvre ORS → icône. Rond-point ORS (7/8) sans latéralité → rondR. */
export function maneuverKind(type: number): ManeuverKind {
  if (type === 1 || type === 3 || type === 5 || type === 13) return 'right'
  if (type === 0 || type === 2 || type === 4 || type === 9 || type === 12) return 'left'
  if (type === 7 || type === 8) return 'rondR'
  if (type === 11) return 'join'
  return 'straight'
}

export function ManeuverIcon({ kind, size = 30 }: { kind: ManeuverKind; size?: number }) {
  const common = {
    stroke: 'currentColor', fill: 'none',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'right':
      return (
        <svg width={size} height={size} viewBox="0 0 30 30">
          <path d="M8 26 V13 a5 5 0 0 1 5 -5 h8 M16 3.5 L22.5 8 L16 12.5" {...common} strokeWidth="2.8" />
        </svg>
      )
    case 'left':
      return (
        <svg width={size} height={size} viewBox="0 0 30 30">
          <path d="M22 26 V13 a5 5 0 0 0 -5 -5 h-8 M14 3.5 L7.5 8 L14 12.5" {...common} strokeWidth="2.8" />
        </svg>
      )
    case 'rondR':
      return (
        <svg width={Math.round(size * 32 / 30)} height={size} viewBox="0 0 32 30">
          <circle cx="13" cy="16" r="6.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
          <path d="M13 26 V23 M19.5 15 h8 M23 10.5 L28.5 15 L23 19.5" {...common} strokeWidth="2.6" />
        </svg>
      )
    case 'rondL':
      return (
        <svg width={Math.round(size * 32 / 30)} height={size} viewBox="0 0 32 30">
          <circle cx="19" cy="16" r="6.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
          <path d="M19 26 V23 M12.5 15 h-8 M9 10.5 L3.5 15 L9 19.5" {...common} strokeWidth="2.6" />
        </svg>
      )
    case 'join':
      return (
        <svg width={size} height={size} viewBox="0 0 30 30">
          <circle cx="9" cy="15" r="3.2" fill="currentColor" />
          <path d="M12 15 h13 M20 9.5 L26.5 15 L20 20.5" {...common} strokeWidth="2.8" />
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 30 30">
          <path d="M15 27 V6 M8.5 12 L15 4.5 L21.5 12" {...common} strokeWidth="2.8" />
        </svg>
      )
  }
}

// ── Badge route (départementale / autoroute) depuis le nom de voie ORS ──
export interface RoadBadgeInfo { kind: 'dep' | 'hwy'; ref: string }

/** Détecte « D 103 » / « A 6 » dans le nom de rue ORS (ou l'instruction). */
export function detectRoadBadge(name?: string, instruction?: string): RoadBadgeInfo | null {
  for (const src of [name, instruction]) {
    if (!src) continue
    const m = /(?:^|[\s,;(])([DA])[ -]?(\d{1,4}[a-zA-Z]?)(?=$|[\s,;).])/.exec(src)
    if (m) return { kind: m[1] === 'D' ? 'dep' : 'hwy', ref: `${m[1]} ${m[2]}` }
  }
  return null
}

/** Badge route h 19 r 5, 11.5/800 — départementale jaune / autoroute rouge. */
export function RoadBadge({ info }: { info: RoadBadgeInfo }) {
  return (
    <span className="lv2-num" style={{
      display: 'inline-flex', alignItems: 'center', height: 19, padding: '0 7px',
      borderRadius: 'var(--r-sm)', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.02em',
      background: info.kind === 'dep' ? 'var(--live-badge-dep-bg)' : 'var(--live-badge-hwy-bg)',
      color: info.kind === 'dep' ? 'var(--live-badge-dep-text)' : 'var(--live-badge-hwy-text)',
    }}>
      {info.ref}
    </span>
  )
}

/** Chip de sortie de rond-point depuis exit_number ORS : « 1re sortie » / « 3e sortie ». */
export function exitChipLabel(n: number): string {
  return n === 1 ? '1re sortie' : `${n}e sortie`
}

// ── Panneau de guidage : GRANDE FEUILLE (SnapSheet du kit, ~85 % de haut) ─
// S'ouvre PAR-DESSUS la carte, juste sous le bandeau de virage (qui reste
// visible) et jusqu'en bas de l'écran : l'appelant MASQUE sa feuille de
// données tant que la liste est ouverte (jamais trois panneaux empilés).
// La feuille occupe toute la hauteur disponible (fill) ; tirer vers le bas
// ou le bouton ✕ la ferment (sortie animée), la feuille de données revient.
interface Props {
  /** Toutes les manœuvres ORS du parcours (vide si guidage détaillé indisponible). */
  steps: NavStep[]
  /** Distance restante (m, le long du parcours) jusqu'à chaque manœuvre. */
  stepDistM: number[]
  /** Index de la prochaine manœuvre à venir (-1 si aucune). */
  nextIdx: number
  /** Format de distance selon les réglages d'unités. */
  fmtDist: (m: number) => string
  /** Nom du parcours chargé — repli « Détail du parcours » si absent. */
  routeName?: string | null
  /** Distance totale déjà formatée (« 20,3 km »). */
  distLabel: string
  /** D+ total déjà formaté (« 480 m D+ ») — null si aucune altitude connue. */
  gainLabel: string | null
  /** Tracé du parcours (repli virages géométriques sans manœuvres ORS). */
  line: LL[]
  /** Distances cumulées le long du tracé (m). */
  cum: number[]
  /** Progression le long du parcours (m). */
  traveledM: number
  onClose: () => void
  /** Espace réservé en haut (bandeau de virage), px sous la safe-area. */
  topGap?: number
  /** Bas de la feuille au-dessus du bas de l'écran, px (0 = bord bas). */
  bottomOffset?: number
}

const ROW_OPACITY = [1, 1, 1, 0.72, 0.5, 0.34]

export default function GuidePanel({
  steps, stepDistM, nextIdx, fmtDist,
  routeName, distLabel, gainLabel, line, cum, traveledM, onClose,
  topGap = 120, bottomOffset = 0,
}: Props) {
  const { t } = useI18n()
  const hasSteps = steps.length > 0
  const upcoming = nextIdx >= 0 ? steps.slice(nextIdx) : []
  const upcomingDist = nextIdx >= 0 ? stepDistM.slice(nextIdx) : []
  const [snap, setSnap] = useState(0)
  // ✕ : sortie animée (la feuille glisse vers le bas) puis fermeture.
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  const requestClose = () => {
    if (closing) return
    setClosing(true)
    closeTimer.current = setTimeout(onClose, 220)
  }

  // ── Virages géométriques (repli sans ORS) : liste des tournants à venir ──
  const geoTurns = useMemo(() => (hasSteps ? [] : deriveTurns(line, cum)), [hasSteps, line, cum])
  const geoUpcoming = geoTurns.filter(g => g.cumM > traveledM + 8)
  const geoLabel = (kind: 'left' | 'right') => kind === 'left' ? t('w3a.turn_left') : t('w3a.turn_right')

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 14px 14px 18px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--r-md)', flexShrink: 0,
        background: 'var(--primary-dim)', color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ManeuverIcon kind="straight" size={24} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hasSteps ? t('w3a.follow_route') : (routeName || t('w3a.route_detail'))}
        </div>
        <div className="rk-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginTop: 2, letterSpacing: 0 }}>
          {distLabel}
          {gainLabel != null && ` · ${gainLabel}`}
        </div>
      </div>
      <RkFab label={t('w2c.close')} onClick={requestClose} size={40} variant="ghost"><RkIco d={RK_ICON.close} size={17} sw={2.4} /></RkFab>
    </div>
  )

  const row = (key: string, i: number, last: boolean, kind: ManeuverKind, dist: string, label: ReactNode, chip?: string | null) => (
    <div key={key} style={{
      display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      opacity: ROW_OPACITY[Math.min(i, ROW_OPACITY.length - 1)],
    }}>
      <div style={{ width: 36, flexShrink: 0, color: i === 0 ? 'var(--primary)' : 'var(--text-mid)', paddingTop: 3 }}>
        <ManeuverIcon kind={kind} size={28} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="rk-num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05 }}>{dist}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {label}
        </div>
      </div>
      {chip && (
        <span style={{ marginTop: 5, flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', fontSize: 12, fontWeight: 700, color: 'var(--text-mid)' }}>
          {chip}
        </span>
      )}
    </div>
  )

  return (
    <SnapSheet
      snaps={['full']}
      index={snap}
      onIndexChange={setSnap}
      onDismiss={onClose}
      header={header}
      fill
      closing={closing}
      bottomOffset={bottomOffset}
      topGap={topGap}
      surface="var(--float-bg)"
      zIndex={46}
      ariaLabel={t('w3a.follow_route')}
    >
      <div style={{ padding: '0 18px calc(16px + env(safe-area-inset-bottom))' }}>
        {hasSteps ? (
          upcoming.length === 0 ? (
            <EmptyNote text={t('w3a.no_upcoming_maneuver')} />
          ) : (
            upcoming.map((s, i) => {
              const badge = detectRoadBadge(s.name, s.instruction)
              return row(`${nextIdx + i}`, i, i === upcoming.length - 1, maneuverKind(s.type), fmtDist(Math.max(0, upcomingDist[i] ?? 0)),
                <>{badge && <RoadBadge info={badge} />}{s.instruction}</>,
                s.exitNumber != null ? exitChipLabel(s.exitNumber) : null)
            })
          )
        ) : geoUpcoming.length === 0 ? (
          <EmptyNote text={t('w3a.no_turn_guidance')} />
        ) : (
          <>
            {geoUpcoming.map((g, i) => row(String(i), i, i === geoUpcoming.length - 1, g.kind, fmtDist(Math.max(0, g.cumM - traveledM)), geoLabel(g.kind)))}
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', padding: '12px 0 4px' }}>
              {t('w3a.geo_turns_note')}
            </div>
          </>
        )}
      </div>
    </SnapSheet>
  )
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div style={{
      minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '0 20px',
      fontSize: 14, fontWeight: 500, color: 'var(--text-mid)',
    }}>
      {text}
    </div>
  )
}
