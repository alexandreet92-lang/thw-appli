'use client'
// ════════════════════════════════════════════════════════════════════
// SummaryScreen — résumé/édition de la sortie après l'arrêt (sur-page
// coulissante). Titre + commentaire, sport, données principales sport-
// spécifiques, carte du tracé RÉEL, matériel (vélo / chaussures), RPE (0-10)
// et ressenti (0-5) en sous-feuilles coulissantes, visibilité, puis envoi
// (jauge réelle) + suppression (confirmation). Bouton retour en haut à
// gauche → reprend la séance. Persistance : workout_sessions (titre,
// commentaire, rpe, sport) + activities (visibilité, bike_id/shoes_id).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHMS, frNum } from './liveMachine'
import { uploadLiveSession, type LiveSaveMeta } from './saveLive'
import { clearLiveBackup, type LiveSnapshot } from './useLocalBackup'
import { distFactor, altFactor, getUnitLabel, type LiveUnits } from '../units'
import { type UploadGaugeState } from './UploadGauge'
import { useI18n } from '@/lib/i18n'
import { motion, useReducedMotion } from 'motion/react'
import { haptic } from '@/lib/haptics'
import {
  RkFab, RkIco, RK_ICON, RkGroup, RkRow, RkCta, RkRangeSheet, RkPickSheet, RK_SPRING, RkFabSpacer,
} from '../kit/RecordKit'

interface Props {
  snap: LiveSnapshot
  units?: LiveUnits
  /** Sport du parcours chargé (cycling/mtb/running/trail/hiking) → sport par défaut. */
  initialSport?: string | null
  /** Vrai si la séance est encore reprenable (résumé après arrêt, pas backup restauré). */
  canResume?: boolean
  onUploadStart: () => void
  onUploadDone: () => void
  onUploadFail: () => void
  onDiscard: () => void
  /** Retour en arrière → reprendre la séance (bouton haut-gauche). */
  onBack?: () => void
  /** Envoi des photos prises pendant la séance vers la session créée (best effort). */
  flushPhotos?: (sessionId: string) => Promise<void>
  /** Callback historique de fin (nettoyage de la page record) — avant navigation. */
  onFinished: () => void
  /** Thème de l'écran live (feuilles en portail). */
  isDark?: boolean
  /** Vignettes des photos prises pendant / après la séance. */
  photos?: string[]
  /** Ajouter une photo (ouvre l'appareil / la galerie). */
  onAddPhoto?: () => void
}

// ── Sports proposés dans le résumé ───────────────────────────────────
type SportId = 'velo' | 'vtt' | 'running' | 'trail' | 'rando'
interface SportCfg { wsSport: string; sportType: string; gear: 'bike' | 'shoes' | null; foot: boolean }
const SPORTS: Record<SportId, SportCfg> = {
  velo:    { wsSport: 'cycling', sportType: 'bike',    gear: 'bike',  foot: false },
  vtt:     { wsSport: 'mtb',     sportType: 'mtb',     gear: 'bike',  foot: false },
  running: { wsSport: 'running', sportType: 'running', gear: 'shoes', foot: true  },
  trail:   { wsSport: 'trail',   sportType: 'trail',   gear: 'shoes', foot: true  },
  rando:   { wsSport: 'hiking',  sportType: 'hiking',  gear: 'shoes', foot: true  },
}
function sportFromRoute(s?: string | null): SportId {
  switch (s) {
    case 'mtb': return 'vtt'
    case 'running': return 'running'
    case 'trail': return 'trail'
    case 'hiking': return 'rando'
    default: return 'velo'
  }
}

type Visibility = 'public' | 'followers' | 'private'

const MAP_W = 358
const MAP_H = 186
const MAP_PAD = 18

/** Projette les points GPS dans la mini-carte (équirectangulaire, cadrage auto). */
function projectTrack(pts: { lat: number; lng: number }[]): [number, number][] {
  if (pts.length === 0) return []
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos(midLat * Math.PI / 180)
  const spanX = Math.max((maxLng - minLng) * kx, 1e-6)
  const spanY = Math.max(maxLat - minLat, 1e-6)
  const scale = Math.min((MAP_W - 2 * MAP_PAD) / spanX, (MAP_H - 2 * MAP_PAD) / spanY)
  const w = spanX * scale
  const h = spanY * scale
  const ox = (MAP_W - w) / 2
  const oy = (MAP_H - h) / 2
  return pts.map(p => [
    ox + ((p.lng - minLng) * kx) * scale,
    oy + (maxLat - p.lat) * scale,
  ])
}

/** Allure (min/km) à partir de la vitesse moyenne (km/h). */
function paceLabel(kmh: number): string {
  if (kmh <= 0.3) return '—'
  const secPerKm = 3600 / kmh
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function rpeColor(v: number): string {
  if (v <= 3) return 'var(--success)'
  if (v <= 6) return 'var(--live-warn)'
  return 'var(--danger)'
}

interface GearItem { id: string; label: string }

export default function SummaryScreen({
  snap, units, initialSport, canResume, onUploadStart, onUploadDone, onUploadFail,
  onDiscard, onBack, flushPhotos, onFinished, isDark, photos = [], onAddPhoto,
}: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const df = distFactor(units)
  const af = altFactor(units)

  const reduce = useReducedMotion()

  const started = new Date(snap.startedAtISO)
  const defaultTitle = t('w3a.default_ride_title')
  const [sport, setSport] = useState<SportId>(() => sportFromRoute(initialSport))
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [rpe, setRpe] = useState(0)
  const [feeling, setFeeling] = useState(0)
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [gearId, setGearId] = useState<string | null>(null)
  const [bikes, setBikes] = useState<GearItem[]>([])
  const [shoes, setShoes] = useState<GearItem[]>([])
  const [sheet, setSheet] = useState<'none' | 'rpe' | 'feeling' | 'gear' | 'sport' | 'visibility'>('none')

  const [foot, setFoot] = useState<'buttons' | UploadGaugeState>('buttons')
  const [progress, setProgress] = useState(0)
  const [armed, setArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedIdRef = useRef<string | null>(null)
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current) }, [])

  const cfg = SPORTS[sport]

  // ── Matériel de l'utilisateur (vélos / chaussures) ──
  useEffect(() => {
    let alive = true
    const sb = createClient()
    void (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || !alive) return
      const [b, s] = await Promise.all([
        sb.from('user_bikes').select('id, name, brand, model, is_default').eq('user_id', user.id).order('is_default', { ascending: false }),
        sb.from('user_running_shoes').select('id, name, brand, is_default').eq('user_id', user.id).order('is_default', { ascending: false }),
      ])
      if (!alive) return
      const bl = (b.data ?? []).map(r => {
        const row = r as { id: string; name: string; brand?: string | null; model?: string | null }
        return { id: row.id, label: [row.brand, row.model].filter(Boolean).join(' ') || row.name }
      })
      const sl = (s.data ?? []).map(r => {
        const row = r as { id: string; name: string; brand?: string | null }
        return { id: row.id, label: [row.brand, row.name].filter(Boolean).join(' ') || row.name }
      })
      setBikes(bl)
      setShoes(sl)
    })()
    return () => { alive = false }
  }, [])

  // Matériel par défaut (is_default en tête) à chaque changement de type de sport.
  useEffect(() => {
    const list = cfg.gear === 'bike' ? bikes : cfg.gear === 'shoes' ? shoes : []
    setGearId(list.length > 0 ? list[0].id : null)
  }, [cfg.gear, bikes, shoes])

  const gearList = cfg.gear === 'bike' ? bikes : cfg.gear === 'shoes' ? shoes : []
  const gearLabel = gearList.find(g => g.id === gearId)?.label ?? null

  // ── Trace SVG (décimée) ──
  const track = useMemo(() => {
    const pts = snap.gpsPts
    if (pts.length <= 600) return projectTrack(pts)
    const step = Math.ceil(pts.length / 600)
    const dec = pts.filter((_, i) => i % step === 0)
    if (dec[dec.length - 1] !== pts[pts.length - 1]) dec.push(pts[pts.length - 1])
    return projectTrack(dec)
  }, [snap.gpsPts])
  const polyline = track.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // ── Données principales (sport-spécifiques) ──
  const dataCells: { label: string; value: string; unit?: string }[] = [
    { label: t('w3a.distance'), value: frNum((snap.distM / 1000) * df, 2), unit: getUnitLabel('km', units) },
    { label: t('w3a.elevation_gain'), value: String(Math.round(snap.elevM * af)), unit: getUnitLabel('m', units) },
    { label: t('w3a.duration'), value: formatHMS(snap.durationSec, true) },
    cfg.foot
      ? { label: t('w3a.avg_pace'), value: paceLabel(snap.avgSpeedKmh), unit: `min/${getUnitLabel('km', units)}` }
      : { label: t('w3a.avg_speed'), value: frNum(snap.avgSpeedKmh * df, 1), unit: getUnitLabel('km/h', units) },
    cfg.foot
      ? { label: t('w3a.avg_vap'), value: '—', unit: getUnitLabel('km/h', units) }
      : { label: t('w3a.avg_watts'), value: '—', unit: 'W' },
    { label: t('w3a.avg_temp'), value: '—', unit: '°C' },
  ]

  const runUpload = async () => {
    haptic('medium')
    setFoot('uploading')
    setProgress(0)
    onUploadStart()
    try {
      const meta: LiveSaveMeta = {
        title: title.trim() || defaultTitle,
        comment,
        rpe,
        sensation: feeling,
        visibility,
        wsSport: cfg.wsSport,
        sportType: cfg.sportType,
        bikeId: cfg.gear === 'bike' ? gearId : null,
        shoesId: cfg.gear === 'shoes' ? gearId : null,
      }
      const { activityId, sessionId } = await uploadLiveSession(snap, setProgress, meta)
      savedIdRef.current = activityId
      if (sessionId && flushPhotos) {
        try { await flushPhotos(sessionId) } catch (e) { console.error('[live-v2] photo flush error:', e) }
      }
      clearLiveBackup()
      setTimeout(() => { setFoot('done'); haptic('success'); onUploadDone() }, 350)
    } catch (e) {
      console.error('[live-v2] upload error:', e)
      setFoot('failed')
      onUploadFail()
    }
  }

  const handleDelete = () => {
    if (foot !== 'buttons') return
    haptic(armed ? 'heavy' : 'medium')
    if (!armed) {
      setArmed(true)
      armTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    if (armTimer.current) clearTimeout(armTimer.current)
    setArmed(false)
    onDiscard()
  }

  const seeTraining = () => {
    onFinished()
    const id = savedIdRef.current
    router.push(id ? `/activities?new=${id}` : '/activities')
  }

  const dateLine = `${started.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${started.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  const sportChips: { id: SportId; label: string }[] = [
    { id: 'velo', label: t('w3a.sport_velo') },
    { id: 'vtt', label: t('w3a.sport_vtt') },
    { id: 'running', label: t('w3a.sport_running') },
    { id: 'trail', label: t('w3a.sport_trail') },
    { id: 'rando', label: t('w3a.sport_rando') },
  ]
  const visChips: { id: Visibility; label: string; icon: React.ReactNode }[] = [
    { id: 'followers', label: t('w3a.vis_followers'), icon: <VisIcon kind="followers" /> },
    { id: 'private', label: t('w3a.vis_private'), icon: <VisIcon kind="private" /> },
    { id: 'public', label: t('w3a.vis_public'), icon: <VisIcon kind="public" /> },
  ]

  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  const visLabel = visChips.find(v => v.id === visibility)?.label ?? ''
  const sportLabel = sportChips.find(c => c.id === sport)?.label ?? ''
  const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }

  return (
    <motion.div
      initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }} animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0.15 } : RK_SPRING}
      style={{ position: 'absolute', inset: 0, zIndex: 66, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête : retour (reprendre) · « Enregistrer » + date */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <div style={{ width: 44 }}>
          {canResume && onBack && foot === 'buttons' ? (
            <RkFab label={t('w3a.resume_session')} onClick={onBack}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab>
          ) : <RkFabSpacer />}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>{t('rec.saveTitle')}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginTop: 1, textTransform: 'capitalize' }}>{dateLine}</div>
        </div>
        <RkFabSpacer />
      </div>

      {/* Contenu défilant */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {/* Titre + commentaire */}
        <div style={{ ...card, padding: '16px 16px 12px' }}>
          <input
            className="rk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={defaultTitle}
            aria-label={t('w3a.title_label')}
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', minHeight: 36 }}
          />
          <textarea
            className="rk-input" value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder={t('w3a.comment_placeholder')}
            aria-label={t('w3a.comment_label')}
            style={{ fontSize: 16, marginTop: 6, resize: 'none', lineHeight: 1.4 }}
          />
        </div>

        {/* Carte du tracé + données principales */}
        <div style={card}>
          <div style={{ height: MAP_H, position: 'relative', background: 'var(--live-map-bg)' }}>
            {track.length > 1 ? (
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                <motion.polyline points={polyline} fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }} />
                <circle cx={track[0][0]} cy={track[0][1]} r="7" fill="var(--surface-card)" />
                <circle cx={track[0][0]} cy={track[0][1]} r="4.5" fill="var(--success)" />
                <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="7" fill="var(--surface-card)" />
                <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="4.5" fill="var(--sport-bike)" />
              </svg>
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-mid)' }}>
                {t('w3a.no_gps')}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 10px', padding: '14px 16px 16px' }}>
            {dataCells.map(c => (
              <div key={c.label} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{c.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                  <span className="rk-num" style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</span>
                  {c.unit && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{c.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photos */}
        {(onAddPhoto || photos.length > 0) && (
          <div className="rk-chips" style={{ gap: 8, margin: '0 -16px', padding: '0 16px' }}>
            {onAddPhoto && (
              <button type="button" onClick={() => { haptic('light'); onAddPhoto() }} aria-label={t('record.photoButtonTitle')} className="rk-press"
                style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--surface-card)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RkIco d={RK_ICON.camera} size={24} sw={1.8} />
              </button>
            )}
            {photos.map(u => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="rk-fade-up" style={{ width: 76, height: 76, flexShrink: 0, objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
            ))}
          </div>
        )}

        {/* Sport · Effort · Ressenti · Matériel · Visibilité */}
        <RkGroup>
          <RkRow label={t('w3a.sport_label')} value={sportLabel} onClick={() => setSheet('sport')} />
          <RkRow label={t('w3a.rpe_label')} value={rpe > 0 ? <span className="rk-num" style={{ letterSpacing: 0, color: 'var(--text)' }}><span className="rk-dot" style={{ background: rpeColor(rpe), display: 'inline-block', marginRight: 6 }} />{rpe} / 10</span> : t('w3a.tap_to_set')} onClick={() => setSheet('rpe')} />
          <RkRow label={t('w3a.feeling_label')} value={feeling > 0 ? <span className="rk-num" style={{ letterSpacing: 0, color: 'var(--text)' }}>{feeling} / 5</span> : t('w3a.tap_to_set')} onClick={() => setSheet('feeling')} />
          {cfg.gear && (
            <RkRow label={cfg.gear === 'bike' ? t('w3a.gear_bike') : t('w3a.gear_shoes')} value={gearLabel ?? t('w3a.gear_none')} onClick={() => setSheet('gear')} />
          )}
          <RkRow label={t('w3a.visibility_label')} value={visLabel} onClick={() => setSheet('visibility')} />
        </RkGroup>
      </div>

      {/* Pied : enregistrer (jauge réelle intégrée) · supprimer / voir l'entraînement */}
      <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--surface-page)' }}>
        {foot === 'done' ? (
          <motion.div initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? { duration: 0.12 } : RK_SPRING}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 800 }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RkIco d={RK_ICON.check} size={18} sw={3} />
              </span>
              {t('activities.recordedSession')}
            </div>
            <RkCta variant="primary" onClick={seeTraining}>{t('rec.seeTraining')}</RkCta>
          </motion.div>
        ) : foot === 'failed' ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--danger)', padding: '2px 0 4px' }}>{t('rec.uploadFailed')}</div>
            <RkCta variant="primary" onClick={runUpload}>{t('rec.retry')}</RkCta>
          </>
        ) : foot === 'uploading' ? (
          <RkCta variant="primary" disabled progress={pct} style={{ opacity: 1 }}>
            {t('rec.uploading')} <span className="rk-num" style={{ letterSpacing: 0 }}>{pct} %</span>
          </RkCta>
        ) : (
          <>
            <RkCta variant="primary" onClick={runUpload}>{t('rec.saveActivity')}</RkCta>
            <RkCta variant={armed ? 'danger' : 'text-danger'} onClick={handleDelete}>
              {armed ? t('w3a.confirm_delete', { dist: frNum((snap.distM / 1000) * df, 1), unit: getUnitLabel('km', units) ?? 'km' }) : t('w3a.delete_activity')}
            </RkCta>
          </>
        )}
      </div>

      {/* ── Sous-feuilles ── */}
      <RkRangeSheet
        open={sheet === 'rpe'} title={t('w3a.rpe_label')} subtitle={t('w3a.rpe_hint')}
        value={rpe} max={10} step={1} color={rpeColor(rpe || 1)}
        onChange={setRpe} onClose={() => setSheet('none')} isDark={isDark}
      />
      <RkRangeSheet
        open={sheet === 'feeling'} title={t('w3a.feeling_label')} subtitle={t('w3a.feeling_hint')}
        value={feeling} max={5} step={1} color="var(--primary)"
        onChange={setFeeling} onClose={() => setSheet('none')} isDark={isDark}
      />
      <RkPickSheet
        open={sheet === 'gear'} title={cfg.gear === 'bike' ? t('w3a.gear_bike') : t('w3a.gear_shoes')}
        items={gearList} selectedId={gearId} emptyLabel={t('w3a.gear_empty')}
        onPick={id => { setGearId(id); setSheet('none') }} onClose={() => setSheet('none')} isDark={isDark}
      />
      <RkPickSheet
        open={sheet === 'sport'} title={t('w3a.sport_label')}
        items={sportChips} selectedId={sport}
        onPick={id => { setSport(id as SportId); setSheet('none') }} onClose={() => setSheet('none')} isDark={isDark}
      />
      <RkPickSheet
        open={sheet === 'visibility'} title={t('w3a.visibility_label')}
        items={visChips.map(v => ({ id: v.id, label: v.label, icon: <span style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{v.icon}</span> }))}
        selectedId={visibility}
        onPick={id => { setVisibility(id as Visibility); setSheet('none') }} onClose={() => setSheet('none')} isDark={isDark}
      />
    </motion.div>
  )
}

// ── Icônes visibilité ───────────────────────────────────────────────
function VisIcon({ kind }: { kind: Visibility }) {
  const c = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'private') {
    return <svg width="20" height="20" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" {...c} /><path d="M8 11 V7.5 a4 4 0 0 1 8 0 V11" {...c} /></svg>
  }
  if (kind === 'followers') {
    return <svg width="22" height="20" viewBox="0 0 26 24"><circle cx="9" cy="8" r="3.4" {...c} /><path d="M3.5 20 a5.5 5.5 0 0 1 11 0" {...c} /><path d="M17 6 a3 3 0 0 1 0 6 M18.5 20 a5 5 0 0 0 -3.2 -4.6" {...c} /></svg>
  }
  return <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" {...c} /><path d="M3 12 h18 M12 3 c3 3 3 15 0 18 c-3 -3 -3 -15 0 -18" {...c} /></svg>
}
