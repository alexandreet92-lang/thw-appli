'use client'
// ══════════════════════════════════════════════════════════════════
// ReadOnlyActivityDetail — fiche LECTURE SEULE de l'activité d'un AUTRE
// athlète (feed, profil, showcase). Plein écran type Strava :
//   • carte GPS en héros (composant partagé ActivityMapCard) ;
//   • feuille remontante « spring » draggable (poignée + snap doux) ;
//   • en-tête propre (titre + sport · date), bouton partage rond,
//     lien « View on Strava » + attribution ;
//   • grille de stats aérée, profil altimétrique (SVG brut), jauges
//     Ressenti / Difficulté (SVG brut).
// 100 % lecture seule : aucune écriture, aucune édition, aucun bouton IA.
// La ligne complète est hydratée via la RPC sécurisée (confidentialité).
//
// NOTE PÉRIMÈTRE : le lissage du zoom/pan de la carte dépend du composant
// PARTAGÉ ActivityMapInner (props MapContainer) — non modifiable ici, à
// corriger côté composant partagé (voir rapport de la tâche).
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { getActivityDetailRow, decodePolyline } from '@/lib/profile/activityShowcase'
import type { ActivityDetailRow, ActivityStreams } from '@/lib/profile/activityShowcase'
import { ActivityMapCard } from '@/components/activity/ActivityMapCard'
import { ViewOnStrava, PoweredByStrava } from '@/components/strava/StravaBranding'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'
import { AM_CARD, AmKpis, NUMS, FB, PAGE_BG, CARD_BG, SOFT_SHADOW, roundBtnStyle, Ico, ICON } from '@/components/activity/ActivityMobileKit'

// ── Accès typés null-safe sur la ligne brute (colonnes de la table) ──
function num(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null }
function str(v: unknown): string | null { return typeof v === 'string' && v.length > 0 ? v : null }

const SPORT_LABEL_KEY: Record<string, string> = {
  run: 'actp.sport_run', trail_run: 'actp.sport_trail_run', bike: 'actp.sport_bike', virtual_bike: 'actp.sport_bike',
  swim: 'actp.sport_swim', rowing: 'actp.sport_rowing', hyrox: 'actp.sport_hyrox', gym: 'actp.sport_gym', other: 'actp.sport_other',
}

// ── Formatage (répliqué localement, lib activities/page non exportée) ──
function fmtDur(s: number | null): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  if (m > 0) return sec > 0 ? `${m}'${String(sec).padStart(2, '0')}` : `${m}'`
  return `${sec}s`
}
function fmtPace(sKm: number | null): string {
  if (!sKm || sKm <= 0 || sKm > 1800) return '—'
  const m = Math.floor(sKm / 60), s = Math.floor(sKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Jauge arc 3/4 (SVG brut) — répliquée du design Ressenti/Difficulté ──
const FD_ARC_TOTAL = 217
const FD_ARC_FULL = 289
const FEELING_THRESHOLDS = [
  { max: 1.5, color: '#ef4444', label: 'actp.feel_sad' },
  { max: 3, color: '#eab308', label: 'actp.feel_normal' },
  { max: 4.5, color: '#10b981', label: 'actp.feel_good' },
  { max: 5, color: '#06b6d4', label: 'actp.feel_amazing' },
]
const DIFFICULTY_THRESHOLDS = [
  { max: 3, color: '#10b981', label: 'actp.diff_easy' },
  { max: 5, color: '#84cc16', label: 'actp.diff_moderate' },
  { max: 6, color: '#eab308', label: 'actp.diff_bit_hard' },
  { max: 7.5, color: '#f97316', label: 'actp.diff_hard' },
  { max: 9, color: '#ef4444', label: 'actp.diff_very_hard' },
  { max: 10, color: '#991b1b', label: 'actp.diff_terrible' },
]
function descriptorFor(thr: { max: number; color: string; label: string }[], v: number) {
  return thr.find(t => v <= t.max) ?? thr[thr.length - 1]
}
function fdFormat(v: number): string { return Number.isInteger(v) ? `${v}` : v.toString().replace('.', ',') }

function GaugeArc({ value, max, label, thresholds }: {
  value: number | null; max: number; label: string
  thresholds: { max: number; color: string; label: string }[]
}) {
  const { t } = useI18n()
  const isSet = value != null
  const ratio = isSet ? Math.max(0, Math.min(1, (value as number) / max)) : 0
  const filled = ratio * FD_ARC_TOTAL
  const desc = isSet ? descriptorFor(thresholds, value as number) : null
  const color = desc ? desc.color : 'var(--border)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 112, height: 112 }}>
        <svg width={112} height={112} viewBox="0 0 110 110" aria-hidden>
          <circle cx={55} cy={55} r={46} stroke="var(--border)" strokeWidth={6} fill="none"
            strokeDasharray={`${FD_ARC_TOTAL} ${FD_ARC_FULL}`} transform="rotate(135 55 55)" strokeLinecap="round" />
          {isSet && (
            <circle cx={55} cy={55} r={46} stroke={color} strokeWidth={6} fill="none"
              strokeDasharray={`${filled} ${FD_ARC_FULL}`} transform="rotate(135 55 55)" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.32,0.72,0,1), stroke 0.3s ease' }} />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...NUMS, fontSize: 32, fontWeight: 700, lineHeight: 1, color: isSet ? 'var(--text)' : 'var(--text-dim)' }}>
            {isSet ? fdFormat(value as number) : '—'}
          </div>
          {isSet && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontWeight: 500 }}>{t('actp.out_of')} {max}</div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: isSet ? 'var(--text)' : 'var(--text-dim)' }}>
        {isSet && desc ? t(desc.label) : t('actp.not_set')}
      </div>
    </div>
  )
}

// ── Profil altimétrique (SVG brut, aucune lib de chart) ──
function buildAltitude(alt: number[], w: number, h: number, pad: number): { area: string; line: string; min: number; max: number } | null {
  const clean = alt.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (clean.length < 2) return null
  // Sous-échantillonnage ~260 points max + lissage léger (moyenne glissante 3).
  const MAXN = 260
  const stride = Math.max(1, Math.floor(clean.length / MAXN))
  const sampled: number[] = []
  for (let i = 0; i < clean.length; i += stride) sampled.push(clean[i])
  const smooth = sampled.map((_, i) => {
    const a = sampled[Math.max(0, i - 1)], b = sampled[i], c = sampled[Math.min(sampled.length - 1, i + 1)]
    return (a + b + c) / 3
  })
  let min = Infinity, max = -Infinity
  for (const v of smooth) { if (v < min) min = v; if (v > max) max = v }
  const span = Math.max(1, max - min)
  const n = smooth.length
  const xOf = (i: number) => pad + (i / (n - 1)) * (w - pad * 2)
  const yOf = (v: number) => (h - pad) - ((v - min) / span) * (h - pad * 2)
  let line = ''
  for (let i = 0; i < n; i++) line += `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(smooth[i]).toFixed(1)}`
  const area = `${line} L${xOf(n - 1).toFixed(1)},${(h - pad).toFixed(1)} L${xOf(0).toFixed(1)},${(h - pad).toFixed(1)} Z`
  return { area, line, min: Math.round(min), max: Math.round(max) }
}

function AltitudeProfile({ streams, gainM }: { streams: ActivityStreams | null | undefined; gainM: number | null }) {
  const { t } = useI18n()
  const alt = Array.isArray(streams?.altitude) ? (streams?.altitude as number[]) : null
  if (!alt || alt.length < 2) return null
  const W = 1000, H = 220, PAD = 16
  const built = buildAltitude(alt, W, H, PAD)
  if (!built) return null
  return (
    <section style={{ ...AM_CARD, padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{t('actp.altitude')}</h2>
        {gainM != null && gainM > 5 && (
          <span style={{ ...NUMS, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>+{Math.round(gainM)} m</span>
        )}
      </div>
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 128, display: 'block' }}>
          <defs>
            <linearGradient id="roAltFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={built.area} fill="url(#roAltFill)" />
          <path d={built.line} fill="none" stroke="#06B6D4" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, ...NUMS, fontSize: 12, color: 'var(--text-dim)' }}>
          <span>{built.min} m</span>
          <span>{built.max} m</span>
        </div>
      </div>
    </section>
  )
}

type Snap = 'mid' | 'full'

// Position (px depuis le haut) de la feuille pour un cran donné.
function snapTranslate(snap: Snap, vh: number, hasRoute: boolean): number {
  if (snap === 'full') return 0
  return hasRoute ? Math.round(vh * 0.52) : Math.round(vh * 0.14)
}

export function ReadOnlyActivityDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n()
  const [row, setRow] = useState<ActivityDetailRow | null>(null)
  const [failed, setFailed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    let off = false
    setRow(null); setFailed(false)
    void getActivityDetailRow(id)
      .then(r => { if (!off) { if (r) setRow(r); else setFailed(true) } })
      .catch(() => { if (!off) setFailed(true) })
    return () => { off = true }
  }, [id])

  // ── État de la feuille remontante (spring) ──
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ active: boolean; startY: number; base: number; lastY: number }>({ active: false, startY: 0, base: 0, lastY: 0 })
  const [vh, setVh] = useState<number>(() => (typeof window !== 'undefined' ? window.innerHeight : 800))
  const [snap, setSnap] = useState<Snap>('mid')
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)

  const hasRoute = (() => {
    if (!row) return false
    const poly = str(row.summary_polyline) ?? (() => {
      const raw = row.raw_data as Record<string, unknown> | null | undefined
      const mapObj = raw?.map as Record<string, unknown> | null | undefined
      return str(mapObj?.polyline) ?? str(mapObj?.summary_polyline)
    })()
    if (poly && decodePolyline(poly).length >= 2) return true
    const streams = (row.streams ?? (row.raw_data as Record<string, unknown> | undefined)?.streams) as ActivityStreams | null | undefined
    const ll = (streams as { latlng?: number[][] } | null | undefined)?.latlng
    return Array.isArray(ll) && ll.length > 1
  })()

  const applyTransform = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.46s cubic-bezier(0.32,0.72,0,1)' : 'none'
    el.style.transform = `translateY(${y}px)`
  }, [])

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // Entrée : la feuille glisse depuis le bas jusqu'à son cran, une fois montée.
  useEffect(() => {
    if (!row) return
    const r = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(r)
  }, [row])
  // Pose la feuille à la bonne position (hors drag) : départ bas, entrée, snap,
  // fermeture. useLayoutEffect → appliqué avant peinture (aucun flash). Le
  // transform du style JSX reste constant ('translateY(100%)') pour que React
  // ne réécrase jamais la valeur posée ici impérativement lors des re-rendus.
  useLayoutEffect(() => {
    if (!row || drag.current.active) return
    const target = closing || !entered ? vh : snapTranslate(snap, vh, hasRoute)
    applyTransform(target, entered && !closing ? true : false)
  }, [row, snap, vh, entered, closing, hasRoute, applyTransform])

  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    applyTransform(vh, true)
    window.setTimeout(onClose, 320)
  }, [closing, vh, applyTransform, onClose])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const base = snapTranslate(snap, vh, hasRoute)
    drag.current = { active: true, startY: e.clientY, base, lastY: base }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dy = e.clientY - drag.current.startY
    const y = Math.max(0, Math.min(vh * 0.86, drag.current.base + dy))
    drag.current.lastY = y
    applyTransform(y, false)
  }
  const onPointerUp = () => {
    if (!drag.current.active) return
    drag.current.active = false
    const y = drag.current.lastY
    if (hasRoute && y > vh * 0.72) { handleClose(); return }
    if (!hasRoute && y > vh * 0.5) { handleClose(); return }
    const target: Snap = y < vh * 0.26 ? 'full' : 'mid'
    setSnap(target)
    applyTransform(snapTranslate(target, vh, hasRoute), true)
  }

  if (!mounted) return null

  // ── Overlay de chargement / d'erreur (avant hydratation) ──
  if (!row) {
    return createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 15000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <button onClick={onClose} aria-label={t('actp.back')} style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 14, ...roundBtnStyle }}>
          <Ico d={ICON.back} size={22} sw={2.2} />
        </button>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
          {failed ? t('actp.load_error') : t('actp.loading')}
        </p>
      </div>,
      document.body,
    )
  }

  // ── Données ──
  const sportType = str(row.sport_type) ?? 'other'
  const sportLabel = t(SPORT_LABEL_KEY[sportType] ?? 'actp.sport_other')
  const isBike = sportType === 'bike' || sportType === 'virtual_bike'
  const isGym = sportType === 'gym' || sportType === 'hyrox'
  const isTerrain = ['run', 'trail_run', 'bike', 'virtual_bike'].includes(sportType)
  const title = str(row.title) ?? sportLabel
  const dateStr = fmtDate(str(row.started_at))
  const isRace = row.is_race === true

  const distM = num(row.distance_m)
  const movS = num(row.moving_time_s)
  const paceS = num(row.avg_pace_s_km) ?? (distM && movS && distM > 100 ? movS / (distM / 1000) : null)
  const speedKmh = (() => {
    const v = num(row.avg_speed_ms)
    if (v && v > 0) return v * 3.6
    if (paceS && paceS > 0) return 3600 / paceS
    if (distM && movS && distM > 100) return (distM / movS) * 3.6
    return null
  })()
  const avgW = num(row.avg_watts)
  const elevGain = num(row.elevation_gain_m)
  const calories = num(row.calories)
  const sm = num(row.sm)
  const sn = num(row.sn)
  const feeling = num(row.feeling)
  const difficulty = num(row.difficulty)
  const providerId = str(row.provider_id)
  const isStrava = str(row.provider) === 'strava' && !!providerId

  const streams = (row.streams ?? (row.raw_data as Record<string, unknown> | undefined)?.streams) as ActivityStreams | null | undefined

  const km = distM ? (distM / 1000).toFixed(2) : null
  const STATS: { label: string; value: string; key: string }[] = [
    { key: 'dist', label: t('actp.distance'), value: !isGym && km ? `${km} km` : '—' },
    { key: 'dur', label: t('actp.duration'), value: fmtDur(movS) },
    { key: 'spd', label: t('actp.speed'), value: speedKmh ? `${speedKmh.toFixed(1)} km/h` : '—' },
    isBike
      ? { key: 'pw', label: t('actp.avg_watts'), value: avgW ? `${Math.round(avgW)} W` : '—' }
      : { key: 'pace', label: t('actp.pace'), value: fmtPace(paceS) },
    isTerrain && elevGain != null && elevGain > 5
      ? { key: 'dplus', label: 'D+', value: `+${Math.round(elevGain)} m` }
      : { key: 'kcal', label: t('actp.calories'), value: calories ? `${Math.round(calories)} kcal` : '—' },
    { key: 'smsn', label: 'SM · SN', value: sm != null && sn != null ? `${Math.round(sm)} · ${Math.round(sn)}` : '—' },
  ]

  async function share() {
    const url = isStrava ? `https://www.strava.com/activities/${providerId}` : (typeof window !== 'undefined' ? window.location.href : '')
    const data = { title, text: `${title} · ${sportLabel}${dateStr ? ` · ${dateStr}` : ''}`, url }
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share(data); return }
      if (typeof navigator !== 'undefined' && navigator.clipboard && url) await navigator.clipboard.writeText(url)
    } catch { /* annulé */ }
  }

  const fullBar = snap === 'full'

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 15000, overflow: 'hidden', fontFamily: FB, background: PAGE_BG,
        opacity: closing ? 0 : 1, transition: 'opacity 0.3s ease',
        ['--bg-card' as string]: CARD_BG, ['--dash-card' as string]: CARD_BG,
      } as CSSProperties}
    >
      {/* ── CARTE plein écran (héros, derrière la feuille) ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
        {hasRoute ? (
          <ActivityMapCard
            activity={row as unknown as Record<string, unknown>}
            mobileHero
            bottomInset={snap === 'mid' ? Math.round(vh - snapTranslate('mid', vh, hasRoute)) : 0}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: PAGE_BG }} />
        )}
      </div>

      {/* ── Bouton retour flottant (par-dessus la carte), masqué en plein écran ── */}
      {!fullBar && (
        <button onClick={handleClose} aria-label={t('actp.back')}
          style={{ ...roundBtnStyle, position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16, zIndex: 10 }}>
          <Ico d={ICON.back} size={22} sw={2.2} />
        </button>
      )}

      {/* ── FEUILLE remontante draggable (transform piloté par ref → 60fps) ── */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '100dvh', zIndex: 2,
          background: PAGE_BG, color: 'var(--text)',
          borderRadius: fullBar ? 0 : 'var(--r-lg) var(--r-lg) 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
          transform: 'translateY(100%)',
          willChange: 'transform',
        }}
      >
        {/* En-tête de la feuille : poignée (mid) ou barre (full) — zone de drag. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'sticky', top: 0, zIndex: 3, background: PAGE_BG, touchAction: 'none', cursor: 'grab',
            borderRadius: fullBar ? 0 : 'var(--r-lg) var(--r-lg) 0 0',
            paddingTop: fullBar ? 'env(safe-area-inset-top, 0px)' : 0,
          }}
        >
          {fullBar ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 16px 10px' }}>
              <button onClick={() => setSnap('mid')} aria-label={t('actp.back')} style={roundBtnStyle}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sportLabel}</span>
              <button onClick={() => void share()} aria-label={t('actp.share')} style={roundBtnStyle}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
              <div style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
            </div>
          )}
        </div>

        {/* ── En-tête de contenu : titre + sport · date, bouton partage rond ── */}
        <div style={{ padding: '6px 16px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: FB, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>{title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '6px 0 0', lineHeight: 1.4 }}>
              {sportLabel}{dateStr ? ` · ${dateStr}` : ''}{isRace ? ` · ${t('actp.competition')}` : ''}
            </p>
            {isStrava && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <ViewOnStrava activityId={providerId as string} height={28} />
                <PoweredByStrava variant="muted" height={12} />
              </div>
            )}
          </div>
          {!fullBar && (
            <button onClick={() => void share()} aria-label={t('actp.share')} style={roundBtnStyle}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            </button>
          )}
        </div>

        {/* ── Cartes empilées : stats, profil altimétrique, jauges ── */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section style={{ ...AM_CARD, padding: '16px 16px 18px' }}>
            <AmKpis items={STATS} cols={3} />
          </section>

          <AltitudeProfile streams={streams} gainM={elevGain} />

          <section style={{ ...AM_CARD, padding: '18px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, boxShadow: SOFT_SHADOW }}>
            <GaugeArc value={feeling} max={5} label={t('actp.feeling')} thresholds={FEELING_THRESHOLDS} />
            <GaugeArc value={difficulty} max={10} label={t('actp.difficulty')} thresholds={DIFFICULTY_THRESHOLDS} />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
