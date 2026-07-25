'use client'
// ════════════════════════════════════════════════════════════════════
// GuidePanel — panneau de guidage déplié (spec §4, maquette #gpanel/#gplist).
// Overlay de la page carte (top 56 / bottom 150, r 24, fond guide-panel
// blur 22) : en-tête icône 44 + « Suivez l'itinéraire » 20/800, liste des
// manœuvres À VENIR (icône 40, distance 27/800, libellé 15/600, badge route,
// chip de sortie ORS), opacité dégressive 1/1/1/.72/.5/.34, chevron de repli.
// SANS manœuvres ORS : jamais vide — DÉTAIL DU PARCOURS (nom, distance,
// D+ si connu, mini profil altimétrique SVG maison avec progression).
// Exporte aussi les briques réutilisées par le bandeau compact de MapPage :
// ManeuverIcon (SVG inline stroke currentColor 2.6-2.8, paths de la maquette),
// maneuverKind, detectRoadBadge, RoadBadge, exitChipLabel.
// Aucune donnée inventée : badge / chip absents si ORS ne les fournit pas.
// ════════════════════════════════════════════════════════════════════
import type { NavStep } from '@/lib/openrouteservice'

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
      borderRadius: 5, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.02em',
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

// ── Mini profil altimétrique (SVG maison, tokens live) ──────────────
// Aire + ligne accent, marqueur de progression ; libellés min/max en HTML
// (le SVG est étiré en preserveAspectRatio none).
function MiniElevProfile({ elevProfile, traveledM, fmtAlt }: {
  elevProfile: { distanceM: number; altitudeM: number }[]
  traveledM: number
  fmtAlt: (m: number) => string
}) {
  const W = 320
  const H = 96
  const totalM = elevProfile[elevProfile.length - 1]?.distanceM || 1
  const alts = elevProfile.map(p => p.altitudeM)
  const aMin = Math.min(...alts)
  const aMax = Math.max(...alts)
  const rng = Math.max(aMax - aMin, 10)
  const x = (d: number) => (d / totalM) * W
  const y = (a: number) => 6 + (1 - (a - aMin) / rng) * (H - 12)
  const lineD = elevProfile
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.distanceM).toFixed(1)} ${y(p.altitudeM).toFixed(1)}`)
    .join(' ')
  const areaD = `${lineD} L ${W} ${H} L 0 ${H} Z`
  const progX = Math.max(0, Math.min(W, x(traveledM)))
  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={areaD} fill="var(--live-accent-soft)" />
        <path d={lineD} fill="none" stroke="var(--live-accent)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {traveledM > 0 && (
          <line x1={progX} y1={4} x2={progX} y2={H} stroke="var(--live-text-2)" strokeWidth={1.4} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span className="lv2-num" style={{ position: 'absolute', top: 2, right: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--live-label)' }}>
        {fmtAlt(aMax)}
      </span>
      <span className="lv2-num" style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--live-label)' }}>
        {fmtAlt(aMin)}
      </span>
    </div>
  )
}

// ── Panneau déplié ──────────────────────────────────────────────────
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
  /** Profil altimétrique du parcours (vide si aucune altitude). */
  elevProfile: { distanceM: number; altitudeM: number }[]
  /** Progression le long du parcours (m) — marqueur sur le profil. */
  traveledM: number
  /** Format d'altitude selon les réglages d'unités. */
  fmtAlt: (m: number) => string
  onClose: () => void
}

const ROW_OPACITY = [1, 1, 1, 0.72, 0.5, 0.34]

export default function GuidePanel({
  steps, stepDistM, nextIdx, fmtDist,
  routeName, distLabel, gainLabel, elevProfile, traveledM, fmtAlt, onClose,
}: Props) {
  const upcoming = nextIdx >= 0 ? steps.slice(nextIdx) : []
  const upcomingDist = nextIdx >= 0 ? stepDistM.slice(nextIdx) : []
  const hasSteps = steps.length > 0
  const hasElev = elevProfile.length > 1

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(env(safe-area-inset-top) + 56px)', left: 16, right: 16, bottom: 150,
      borderRadius: 24, zIndex: 40,
      background: 'var(--live-guide-panel)', border: '1px solid var(--live-hairline-2)',
      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* En-tête : icône 44 + titre 20/800 + totaux du parcours */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '22px 22px 16px',
        borderBottom: '1px solid var(--live-hairline)', flexShrink: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'var(--live-accent-soft)', color: 'var(--live-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path d="M11 19 L11 7 M5 12 L11 5.5 L17 12" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 20, fontWeight: 800, lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hasSteps ? 'Suivez l’itinéraire' : (routeName || 'Détail du parcours')}
          </div>
          <div className="lv2-num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--live-text-2)', marginTop: 3 }}>
            {distLabel}
            {gainLabel != null && ` · ${gainLabel}`}
          </div>
        </div>
      </div>

      {/* Contenu : manœuvres ORS si dispo, sinon DÉTAIL DU PARCOURS */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 22px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {!hasSteps ? (
          <div style={{ padding: '18px 0' }}>
            <div style={{ display: 'flex', gap: 22, marginBottom: hasElev ? 16 : 12 }}>
              <div>
                <div className="lv2-eyebrow" style={{ fontSize: 9.5 }}>Distance</div>
                <div className="lv2-num" style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{distLabel}</div>
              </div>
              {gainLabel != null && (
                <div>
                  <div className="lv2-eyebrow" style={{ fontSize: 9.5 }}>Dénivelé</div>
                  <div className="lv2-num" style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{gainLabel}</div>
                </div>
              )}
            </div>
            {hasElev && (
              <>
                <div className="lv2-eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>Profil altimétrique</div>
                <MiniElevProfile elevProfile={elevProfile} traveledM={traveledM} fmtAlt={fmtAlt} />
              </>
            )}
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--live-label)', marginTop: 16 }}>
              Guidage virage-par-virage indisponible sur ce parcours — suivez le tracé sur la carte.
            </div>
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 20px',
            fontSize: 13.5, fontWeight: 500, color: 'var(--live-text-2)',
          }}>
            Aucune manœuvre à venir
          </div>
        ) : (
          upcoming.map((s, i) => {
            const badge = detectRoadBadge(s.name, s.instruction)
            return (
              <div
                key={`${nextIdx + i}`}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16, padding: '19px 0',
                  borderBottom: i < upcoming.length - 1 ? '1px solid var(--live-hairline)' : 'none',
                  opacity: ROW_OPACITY[Math.min(i, ROW_OPACITY.length - 1)],
                }}
              >
                <div style={{ width: 40, flexShrink: 0, color: 'var(--live-text-2)', paddingTop: 3 }}>
                  <ManeuverIcon kind={maneuverKind(s.type)} size={30} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="lv2-num" style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.05 }}>
                    {fmtDist(Math.max(0, upcomingDist[i] ?? 0))}
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: 'var(--live-text-2)', marginTop: 5,
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  }}>
                    {badge && <RoadBadge info={badge} />}
                    {s.instruction}
                  </div>
                </div>
                {s.exitNumber != null && (
                  <div style={{ marginLeft: 'auto', paddingTop: 5, flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
                      borderRadius: 7, background: 'var(--live-chip-bg)',
                      fontSize: 12, fontWeight: 600, color: 'var(--live-text-2)',
                    }}>
                      {exitChipLabel(s.exitNumber)}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Chevron de repli */}
      <button
        onClick={onClose}
        aria-label="Replier"
        className="lv2-press"
        style={{
          height: 44, border: 'none', background: 'none', color: 'var(--live-label)',
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="10" viewBox="0 0 18 10">
          <path d="M1 9 L9 1.5 L17 9" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
