'use client'

// ══════════════════════════════════════════════════════════════
// ActivityCard — carte du fil d'activités (façon Strava).
//   En-tête : avatar + nom · date/heure · appareil · sport + lieu
//   Titre en gras, rangée de stats (libellés gris, grosses valeurs),
//   ligne SM/SN + records, puis la carte GPS PLEINE LARGEUR (bord à bord
//   de l'écran sur mobile) — aperçu statique non interactif (FeedRouteMap).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { formatRecordDuration, durationRank } from '@/lib/records/format'
import { SmSnStat } from '@/components/metrics/SmSnStat'
import { workoutTypeDefs } from '@/components/activity/WorkoutTypeBadges'
import { FeedRouteMap } from '@/components/activity/FeedRouteMap'
import { useI18n } from '@/lib/i18n'
import { reverseGeocode } from '@/lib/geo/reverseGeocode'
import { currentLocale } from '@/lib/i18n'

// ── Couleurs sémantiques fixes ─────────────────────────────────────────
const GOLD = '#eab308'
const CYAN = '#06B6D4'

const FB = 'var(--font-body)'

// ── Types ──────────────────────────────────────────────────────────────
export interface ActivityCardData {
  id:                string
  title:             string | null
  sportType:         string
  sportLabel:        string
  sportColor:        string  // ex: '#06B6D4'
  startedAt:         string  // ISO
  distance_m:        number | null
  moving_time_s:     number | null
  elevation_gain_m:  number | null
  avgHr:             number | null  // FC moyenne (bpm) — affichée pour muscu/hyrox/boxe
  avgPaceSKm?:       number | null  // allure moyenne (s/km) — course
  avgSpeedMs?:       number | null  // vitesse moyenne (m/s) — vélo
  avgWatts?:         number | null  // puissance moyenne (W) — vélo
  sm:                number | null  // Score Métabolique
  sn:                number | null  // Score Neuromusculaire
  // Polyline encodée Google (Strava format) — déjà extraite côté page
  encodedPolyline:   string | null
  // Records auto associés à cette activité
  records: {
    allTime: { label: string; watts: number }[]
    year:    { label: string; watts: number; year: string }[]
  }
  trainingTypes?: string[]        // ids de type d'entraînement (Force, PMA…)
  nbExercises?:   number | null   // muscu : nb d'exercices
  nbCircuits?:    number | null   // muscu : nb de circuits
  deviceName?:    string | null   // ex: « Garmin Edge 830 »
  startLat?:      number | null
  startLng?:      number | null
  locationName?:  string | null   // « Ville, Région » (si déjà géocodé)
  media?:         Array<{ url: string; type: 'image' | 'video'; path: string }> | null
  comment?:       string | null
  isRace?:        boolean         // true = Compétition · false/undefined = Entraînement
  raceName?:      string | null   // objectif lié (ex. « Ironman Leeds Vélo » pour un triathlon)
}

export interface ActivityCardAthlete {
  name:      string | null
  avatarUrl: string | null
}

interface Props {
  data:       ActivityCardData
  onClick:    () => void
  athlete?:   ActivityCardAthlete | null
  /** Activité tout juste créée : liseré cyan à gauche. */
  highlight?: boolean
}

// Rapport hauteur/largeur de la carte GPS (≈ Strava).
const MAP_RATIO = 2 / 3

// ── Formatters dédiés à la card ────────────────────────────────────────
function fmtDistKm(m: number | null | undefined): string {
  if (!m || m <= 0) return '—'
  const km = m / 1000
  if (km >= 100) return `${Math.round(km)} km`
  return `${km.toFixed(km < 10 ? 2 : 1)} km`
}

function fmtDurCompact(s: number | null | undefined): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  const sec = Math.floor(s % 60)
  return sec > 0 && m < 10 ? `${m}min ${String(sec).padStart(2, '0')}s` : `${m} min`
}

function fmtElev(m: number | null | undefined): string {
  if (m == null || m <= 0) return '—'
  return `${Math.round(m)} m`
}

function fmtMinSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

/** « Aujourd'hui · 16:11 » / « Hier · 07:02 » / « 2 octobre 2026 · 16:11 ». */
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const loc = currentLocale()
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  let day: string
  if (diffDays === 0 || diffDays === 1) {
    try {
      const rel = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' }).format(-diffDays, 'day')
      day = rel.charAt(0).toLocaleUpperCase(loc) + rel.slice(1)
    } catch {
      day = d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })
    }
  } else {
    day = d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return `${day} · ${time}`
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// ── Trophy icon (lucide-style) ─────────────────────────────────────────
function TrophyIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

// Layout effect côté client uniquement (pas d'avertissement SSR).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Pleine largeur d'écran (mobile) : mesure la position HORIZONTALE réelle du
 * parent dans la mise en page (chaîne offsetLeft — insensible aux transforms des
 * transitions de page) et pose `--bleed-l` = −gauche. La carte se cale ainsi
 * exactement sur le bord gauche de l'écran et fait 100vw, même si les marges
 * de la page sont asymétriques. Repli CSS : calc(50% − 50vw).
 */
function useFullBleed(ref: React.RefObject<HTMLDivElement | null>) {
  useIsoLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    const apply = () => {
      const cs = getComputedStyle(parent)
      let x = parent.clientLeft + (parseFloat(cs.paddingLeft) || 0)
      let n: HTMLElement | null = parent
      while (n) {
        x += n.offsetLeft
        const p: HTMLElement | null = n.offsetParent as HTMLElement | null
        if (p) x += p.clientLeft
        n = p
      }
      el.style.setProperty('--bleed-l', `${-Math.round(x)}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    ro?.observe(parent)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      ro?.disconnect()
    }
  }, [])
}

// ── Main component ─────────────────────────────────────────────────────
export function ActivityCard({ data, onClick, athlete, highlight }: Props) {
  const { t } = useI18n()
  const [place, setPlace] = useState<string | null>(data.locationName ?? null)
  const [avatarOk, setAvatarOk] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  useFullBleed(rootRef)
  // Détection tap vs swipe sur le carrousel (map + photos) : un swipe horizontal
  // fait défiler les médias sans ouvrir le détail ; un simple tap ouvre l'activité.
  const carStartX = useRef(0)
  const carDragged = useRef(false)
  // Retour d'appui : très léger scale de TOUTE la carte, seulement si le doigt
  // reste immobile (pas pendant un scroll) — jamais de voile gris sur la carte.
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null }>({ x: 0, y: 0, timer: null })

  // Géocode le lieu de départ (Ville, Région) si pas déjà connu.
  useEffect(() => {
    if (place || data.startLat == null || data.startLng == null) return
    let cancelled = false
    void reverseGeocode(data.startLat, data.startLng).then(n => { if (!cancelled && n) setPlace(n) })
    return () => { cancelled = true }
  }, [place, data.startLat, data.startLng])

  useEffect(() => () => { if (press.current.timer) clearTimeout(press.current.timer) }, [])

  const releasePress = () => {
    if (press.current.timer) { clearTimeout(press.current.timer); press.current.timer = null }
    if (rootRef.current) rootRef.current.style.transform = ''
  }

  const allTime = [...data.records.allTime].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const year    = [...data.records.year].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const totalRecords = allTime.length + year.length

  const hasMap = !!data.encodedPolyline
  const media  = data.media ?? []
  const slides = [...(hasMap ? [{ kind: 'map' as const, url: '' }] : []), ...media.map(m => ({ kind: m.type, url: m.url }))]

  const yearLabel = year[0]?.year ?? String(new Date(data.startedAt).getFullYear())
  const tagLabel  = data.isRace ? t('activities.race') : t('activities.training')

  // ── Stats sport-spécifiques (façon Strava) ──
  const isStrength = data.sportType === 'gym' || data.sportType === 'hyrox' || data.sportType === 'boxe'
  const stats: { label: string; value: React.ReactNode }[] = []
  if (isStrength) {
    /* Muscu / Hyrox / Boxe : sports SANS distance ni dénivelé → FC moyenne,
       durée, et exos/circuits. */
    stats.push({ label: t('actp.avg_hr'), value: data.avgHr != null ? `${Math.round(data.avgHr)} bpm` : '—' })
    stats.push({ label: t('activities.time'), value: fmtDurCompact(data.moving_time_s) })
    stats.push({
      label: data.nbCircuits != null ? t('activities.circuits') : t('activities.exercises'),
      value: data.nbCircuits != null ? String(data.nbCircuits) : (data.nbExercises != null ? String(data.nbExercises) : '—'),
    })
  } else {
    const dist = data.distance_m ?? 0
    const time = data.moving_time_s ?? 0
    stats.push({ label: t('activities.distance'), value: fmtDistKm(data.distance_m) })
    const sp = data.sportType
    if (sp === 'run' || sp === 'trail_run') {
      const pace = data.avgPaceSKm ?? (dist > 200 && time > 0 ? (time / dist) * 1000 : null)
      if (pace && pace > 0 && pace < 3600) stats.push({ label: t('activities.pace'), value: `${fmtMinSec(pace)} /km` })
    } else if (sp === 'swim') {
      if (dist > 25 && time > 0) stats.push({ label: t('activities.pace'), value: `${fmtMinSec((time / dist) * 100)} /100m` })
    } else if (sp === 'rowing') {
      if (dist > 100 && time > 0) stats.push({ label: t('activities.pace'), value: `${fmtMinSec((time / dist) * 500)} /500m` })
    } else if ((sp === 'bike' || sp === 'virtual_bike') && data.avgWatts && data.avgWatts > 0) {
      stats.push({ label: t('activities.power'), value: `${Math.round(data.avgWatts)} W` })
    } else {
      const ms = data.avgSpeedMs ?? (dist > 0 && time > 0 ? dist / time : null)
      if (ms && ms > 0) stats.push({ label: t('actp.speed'), value: `${(ms * 3.6).toFixed(1)} km/h` })
    }
    stats.push({ label: t('activities.time'), value: fmtDurCompact(data.moving_time_s) })
    if (totalRecords === 0 && (data.elevation_gain_m ?? 0) > 0 && sp !== 'swim') {
      stats.push({ label: 'D+', value: fmtElev(data.elevation_gain_m) })
    }
  }
  if (totalRecords > 0) {
    stats.push({
      label: t('activities.records'),
      value: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TrophyIcon color={allTime.length > 0 ? GOLD : CYAN} size={18} />
          {totalRecords}
        </span>
      ),
    })
  }

  const hasAthlete = !!athlete && !!(athlete.name || athlete.avatarUrl)
  const metaLine = `${fmtWhen(data.startedAt)}${data.deviceName ? ` · ${data.deviceName}` : ''}`

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      onTouchStart={e => {
        const tch = e.touches[0]
        press.current.x = tch.clientX; press.current.y = tch.clientY
        if (press.current.timer) clearTimeout(press.current.timer)
        const el = e.currentTarget
        press.current.timer = setTimeout(() => { el.style.transform = 'scale(0.985)'; press.current.timer = null }, 90)
      }}
      onTouchMove={e => {
        const tch = e.touches[0]
        if (Math.abs(tch.clientX - press.current.x) > 6 || Math.abs(tch.clientY - press.current.y) > 6) releasePress()
      }}
      onTouchEnd={releasePress}
      onTouchCancel={releasePress}
      className="thw-activity-card thw-card-bleed"
      style={{
        position:      'relative',
        background:    'var(--dash-card, var(--bg-card))',
        boxShadow:     highlight ? 'inset 4px 0 0 var(--primary)' : undefined,
        cursor:        'pointer',
        transition:    'transform 0.18s ease',
        display:       'flex',
        flexDirection: 'column',
        minWidth:      0,
        overflow:      'hidden',
        fontFamily:    FB,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ── En-tête : avatar + nom · date/heure · appareil · sport + lieu ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 16px 0' }}>
        {hasAthlete && (
          <span aria-hidden style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'var(--bg-card2)', color: 'var(--text-mid)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
          }}>
            {athlete?.avatarUrl && avatarOk
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={athlete.avatarUrl} alt="" width={40} height={40} draggable={false} onError={() => setAvatarOk(false)} style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} />
              : initialsOf(athlete?.name)}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasAthlete && athlete?.name && (
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {athlete.name}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: hasAthlete && athlete?.name ? 2 : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
            {metaLine}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 13, color: 'var(--text-mid)', minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.sportColor, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.sportLabel}{place ? ` · ${place}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Titre ── */}
      <p style={{
        margin: '14px 16px 0', fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em',
        color: 'var(--text)', fontFamily: FB, overflowWrap: 'anywhere',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {data.title ?? t('activities.untitledActivity')}
      </p>

      {/* Objectif lié (course/triathlon) — ex. « Ironman Leeds Vélo » */}
      {data.raceName && (
        <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, margin: '8px 16px 0', padding: '2px 9px', borderRadius: 'var(--r-pill)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', maxWidth: 'calc(100% - 32px)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 22V4a1 1 0 0 1 1-1h13l-2 4 2 4H6"/></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.raceName}</span>
        </div>
      )}

      {/* ── Commentaire de l'athlète ── */}
      {data.comment && data.comment.trim() && (
        <p style={{ margin: '8px 16px 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text-mid)' }}>{data.comment}</p>
      )}

      {/* ── Type d'entraînement (Force, PMA, EF…) — puces sobres monochromes ── */}
      {(data.trainingTypes?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px 0' }}>
          {workoutTypeDefs(data.sportType, data.trainingTypes ?? []).map(tp => (
            <span key={tp.id} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-sm)',
              color: 'var(--text-mid)', background: 'var(--bg-card2)',
            }}>{tp.label}</span>
          ))}
        </div>
      )}

      {/* ── Stats (libellés gris, grosses valeurs) ── */}
      <div style={{ display: 'flex', gap: 22, padding: '14px 16px 0', minWidth: 0 }}>
        {stats.map((s, i) => <Stat key={i} label={s.label} value={s.value} />)}
      </div>

      {/* Charge — SM (métabolique) · SN (neuromusculaire), petite ligne */}
      <div style={{ padding: '10px 16px 0' }}>
        <SmSnStat sm={data.sm} sn={data.sn} size={13} />
      </div>

      {/* ── Records (détail) ── */}
      {totalRecords > 0 && (
        <div style={{ padding: '10px 16px 0' }}>
          {totalRecords === 1 ? (
            (() => {
              const isAllTime = allTime.length === 1
              const rec = isAllTime ? allTime[0] : year[0]
              const accent = isAllTime ? GOLD : CYAN
              const rightLabel = isAllTime ? 'All Time' : yearLabel
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconBubble accent={accent} />
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRecordDuration(rec.label)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', fontFamily: FB }}>
                      {rec.watts}<span style={{ opacity: 0.7, marginLeft: 3, fontSize: 10 }}>W</span>
                    </span>
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: accent,
                    opacity: isAllTime ? 1 : 0.7, flexShrink: 0,
                  }}>
                    {rightLabel}
                  </span>
                </div>
              )
            })()
          ) : (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {allTime.length > 0 && <CountBlock accent={GOLD} count={allTime.length} label="All Time" />}
              {year.length > 0 && <CountBlock accent={CYAN} count={year.length} label={t('activities.recordYear', { year: yearLabel })} />}
            </div>
          )}
        </div>
      )}

      {/* ── Carte GPS pleine largeur + médias (défilement horizontal, façon Strava) ── */}
      {slides.length > 0 ? (
        <div
          data-hscroll={slides.length > 1 ? '' : undefined}
          onTouchStart={e => { carStartX.current = e.touches[0].clientX; carDragged.current = false }}
          onTouchMove={e => { if (Math.abs(e.touches[0].clientX - carStartX.current) > 8) carDragged.current = true }}
          onClick={e => {
            // Swipe horizontal (défilement des médias) → on bloque l'ouverture.
            // Simple tap → on laisse remonter au parent qui ouvre l'activité.
            if (carDragged.current) { e.stopPropagation(); carDragged.current = false }
          }}
          className="thw-card-carousel"
          style={{
            display: 'flex', gap: slides.length > 1 ? 4 : 0, marginTop: 14,
            overflowX: slides.length > 1 ? 'auto' : 'hidden', scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            scrollbarWidth: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {slides.map((s, i) => (
            <div key={i} style={{
              // La carte prend TOUJOURS toute la largeur (bord à bord) ; les médias
              // gardent un léger « peek » quand il y en a plusieurs.
              flex: s.kind === 'map' ? '0 0 100%' : (slides.length > 1 ? '0 0 92%' : '0 0 100%'),
              scrollSnapAlign: 'start', position: 'relative', overflow: 'hidden',
              aspectRatio: s.kind === 'map' ? undefined : `1 / ${MAP_RATIO}`,
              background: 'var(--bg-card2)',
            }}>
              {s.kind === 'map' && data.encodedPolyline
                ? <FeedRouteMap encodedPolyline={data.encodedPolyline} color={data.sportColor} label={tagLabel} ratio={MAP_RATIO} />
                : s.kind === 'video'
                  ? <video src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} muted playsInline preload="metadata" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={s.url} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', WebkitTouchCallout: 'none' }} />}
            </div>
          ))}
        </div>
      ) : (
        /* Étiquette Entraînement / Compétition (activités sans carte) */
        <div style={{ padding: '12px 16px 0' }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--bg-card2)' }}>
            {tagLabel}
          </span>
        </div>
      )}
      {slides.length === 0 && <div style={{ height: 16 }} />}
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0, flexShrink: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  )
}

function IconBubble({ accent }: { accent: string }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      background: `color-mix(in srgb, ${accent} 15%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <TrophyIcon color={accent} size={12} />
    </span>
  )
}

function CountBlock({ accent, count, label }: { accent: string; count: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <IconBubble accent={accent} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {count}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
