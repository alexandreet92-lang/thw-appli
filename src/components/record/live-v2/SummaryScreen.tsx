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
import UploadGauge, { type UploadGaugeState } from './UploadGauge'
import { useI18n } from '@/lib/i18n'

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
  if (v <= 3) return 'var(--live-success)'
  if (v <= 6) return 'var(--live-warn)'
  return 'var(--live-danger)'
}

interface GearItem { id: string; label: string }

export default function SummaryScreen({
  snap, units, initialSport, canResume, onUploadStart, onUploadDone, onUploadFail,
  onDiscard, onBack, flushPhotos, onFinished,
}: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const df = distFactor(units)
  const af = altFactor(units)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])

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
  const [sheet, setSheet] = useState<'none' | 'rpe' | 'feeling' | 'gear'>('none')

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
    setFoot('uploading')
    setProgress(0)
    onUploadStart()
    try {
      const meta: LiveSaveMeta = {
        title: title.trim() || defaultTitle,
        comment,
        rpe,
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
      setTimeout(() => { setFoot('done'); onUploadDone() }, 350)
    } catch (e) {
      console.error('[live-v2] upload error:', e)
      setFoot('failed')
      onUploadFail()
    }
  }

  const handleDelete = () => {
    if (foot !== 'buttons') return
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

  const LABEL: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--live-label)', marginBottom: 8 }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 66, background: 'var(--live-bg)',
      display: 'flex', flexDirection: 'column',
      transform: mounted ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
    }}>
      {/* En-tête : retour (reprendre) · titre · date */}
      <div style={{
        flexShrink: 0, position: 'relative',
        paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid var(--live-hairline)',
      }}>
        {canResume && onBack && (
          <button
            onClick={onBack}
            aria-label={t('w3a.resume_session')}
            className="lv2-press"
            style={{
              position: 'absolute', left: 16, top: 'calc(env(safe-area-inset-top) + 10px)',
              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--live-surface-2)', color: 'var(--live-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 20 20"><path d="M12.5 4 L6 10 L12.5 16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{t('w3a.summary_title')}</h2>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 3 }}>{dateLine}</div>
        </div>
      </div>

      {/* Contenu défilant */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 8px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {/* Titre */}
        <div style={LABEL}>{t('w3a.title_label')}</div>
        <input
          value={title} onChange={e => setTitle(e.target.value)} placeholder={defaultTitle}
          style={{
            width: '100%', height: 46, borderRadius: 12, padding: '0 14px', marginBottom: 18,
            background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
            color: 'var(--live-text)', fontSize: 15, fontWeight: 600, outline: 'none',
          }}
        />

        {/* Commentaire */}
        <div style={LABEL}>{t('w3a.comment_label')}</div>
        <textarea
          value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder={t('w3a.comment_placeholder')}
          style={{
            width: '100%', borderRadius: 12, padding: '11px 14px', marginBottom: 18, resize: 'none',
            background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
            color: 'var(--live-text)', fontSize: 14.5, fontWeight: 500, outline: 'none', lineHeight: 1.4,
            fontFamily: 'inherit',
          }}
        />

        {/* Sport */}
        <div style={LABEL}>{t('w3a.sport_label')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {sportChips.map(c => {
            const on = sport === c.id
            return (
              <button
                key={c.id} onClick={() => setSport(c.id)} className="lv2-press"
                style={{
                  height: 38, padding: '0 16px', borderRadius: 19, cursor: 'pointer',
                  border: on ? '1px solid var(--live-accent)' : '1px solid var(--live-hairline-2)',
                  background: on ? 'var(--live-accent-soft)' : 'var(--live-surface)',
                  color: on ? 'var(--live-accent)' : 'var(--live-text)', fontSize: 13.5, fontWeight: 700,
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Données principales */}
        <div style={LABEL}>{t('w3a.main_data')}</div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 18,
          background: 'var(--live-hairline)', border: '1px solid var(--live-hairline)', borderRadius: 14, overflow: 'hidden',
        }}>
          {dataCells.map(c => (
            <div key={c.label} style={{ background: 'var(--live-surface)', padding: '13px 8px 15px', textAlign: 'center' }}>
              <div className="lv2-eyebrow" style={{ fontSize: 9 }}>{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3, marginTop: 7 }}>
                <span className="lv2-num" style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</span>
                {c.unit && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--live-label)' }}>{c.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Carte du tracé réel */}
        <div style={LABEL}>{t('w3a.route_map')}</div>
        <div style={{
          height: MAP_H, borderRadius: 16, overflow: 'hidden', position: 'relative', marginBottom: 18,
          background: 'var(--live-map-bg)', border: '1px solid var(--live-hairline)',
        }}>
          {track.length > 1 ? (
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
              <polyline points={polyline} fill="none" stroke="var(--live-accent)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={track[0][0]} cy={track[0][1]} r="6" fill="var(--live-success)" />
              <circle cx={track[0][0]} cy={track[0][1]} r="2.6" fill="#fff" /> {/* design-allow-color */}
              <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="6" fill="var(--live-danger)" />
              <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="2.6" fill="#fff" /> {/* design-allow-color */}
            </svg>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--live-label)' }}>
              {t('w3a.no_gps')}
            </div>
          )}
        </div>

        {/* Matériel */}
        {cfg.gear && (
          <>
            <div style={LABEL}>{cfg.gear === 'bike' ? t('w3a.gear_bike') : t('w3a.gear_shoes')}</div>
            <SummaryRow onClick={() => setSheet('gear')} value={gearLabel ?? t('w3a.gear_none')} />
            <div style={{ height: 18 }} />
          </>
        )}

        {/* RPE */}
        <div style={LABEL}>{t('w3a.rpe_label')}</div>
        <SummaryRow
          onClick={() => setSheet('rpe')}
          value={rpe > 0 ? String(rpe) : t('w3a.tap_to_set')}
          valueColor={rpe > 0 ? rpeColor(rpe) : undefined}
          suffix={rpe > 0 ? '/ 10' : undefined}
        />
        <div style={{ height: 18 }} />

        {/* Ressenti */}
        <div style={LABEL}>{t('w3a.feeling_label')}</div>
        <SummaryRow
          onClick={() => setSheet('feeling')}
          value={feeling > 0 ? String(feeling) : t('w3a.tap_to_set')}
          valueColor={feeling > 0 ? 'var(--live-accent)' : undefined}
          suffix={feeling > 0 ? '/ 5' : undefined}
        />
        <div style={{ height: 18 }} />

        {/* Visibilité */}
        <div style={LABEL}>{t('w3a.visibility_label')}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {visChips.map(o => {
            const on = visibility === o.id
            return (
              <button
                key={o.id} onClick={() => setVisibility(o.id)} className="lv2-press"
                style={{
                  flex: 1, height: 66, borderRadius: 14, cursor: 'pointer',
                  border: on ? '1px solid var(--live-accent)' : '1px solid var(--live-hairline-2)',
                  background: on ? 'var(--live-accent-soft)' : 'var(--live-surface)',
                  color: on ? 'var(--live-accent)' : 'var(--live-text-2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {o.icon}
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{o.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pied : boutons / jauge d'envoi / confirmation */}
      <div style={{ flexShrink: 0, padding: '14px 20px calc(env(safe-area-inset-bottom) + 22px)', textAlign: 'center', borderTop: '1px solid var(--live-hairline)' }}>
        {foot === 'buttons' ? (
          <>
            <button className="lv2-pill lv2-pill-primary lv2-press" style={{ marginBottom: 12 }} onClick={runUpload}>
              {t('w3a.save_session')}
            </button>
            <button
              className={armed ? 'lv2-pill lv2-pill-danger lv2-armed lv2-press' : 'lv2-pill lv2-pill-danger lv2-press'}
              onClick={handleDelete}
            >
              {armed ? t('w3a.confirm_delete', { dist: frNum((snap.distM / 1000) * df, 1), unit: getUnitLabel('km', units) }) : t('w3a.delete_activity')}
            </button>
          </>
        ) : (
          <UploadGauge state={foot} progress={progress} onRetry={runUpload} onSeeTraining={seeTraining} />
        )}
      </div>

      {/* ── Sous-feuilles coulissantes ── */}
      <GaugeSheet
        open={sheet === 'rpe'} title={t('w3a.rpe_label')} subtitle={t('w3a.rpe_hint')}
        value={rpe} max={10} step={1} color={rpeColor(rpe || 1)}
        onChange={setRpe} onClose={() => setSheet('none')}
      />
      <GaugeSheet
        open={sheet === 'feeling'} title={t('w3a.feeling_label')} subtitle={t('w3a.feeling_hint')}
        value={feeling} max={5} step={1} color="var(--live-accent)"
        onChange={setFeeling} onClose={() => setSheet('none')}
      />
      <PickSheet
        open={sheet === 'gear'} title={cfg.gear === 'bike' ? t('w3a.gear_bike') : t('w3a.gear_shoes')}
        items={gearList} selectedId={gearId} emptyLabel={t('w3a.gear_empty')}
        onPick={id => { setGearId(id); setSheet('none') }} onClose={() => setSheet('none')}
      />
    </div>
  )
}

// ── Ligne cliquable (matériel / RPE / ressenti) ─────────────────────
function SummaryRow({ onClick, value, valueColor, suffix }: {
  onClick: () => void; value: string; valueColor?: string; suffix?: string
}) {
  return (
    <button
      onClick={onClick} className="lv2-press"
      style={{
        width: '100%', height: 50, borderRadius: 12, padding: '0 14px', cursor: 'pointer',
        background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="lv2-num" style={{ fontSize: 16, fontWeight: 700, color: valueColor ?? 'var(--live-text)' }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--live-label)' }}>{suffix}</span>}
      </span>
      <svg width="8" height="14" viewBox="0 0 8 14" style={{ color: 'var(--live-label)' }}><path d="M1 1 L7 7 L1 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}

// ── Feuille jauge (RPE 0-10 / ressenti 0-5) ─────────────────────────
function GaugeSheet({ open, title, subtitle, value, max, step, color, onChange, onClose }: {
  open: boolean; title: string; subtitle: string; value: number; max: number; step: number; color: string
  onChange: (v: number) => void; onClose: () => void
}) {
  return (
    <SlideUp open={open} onClose={onClose}>
      <div style={{ padding: '4px 22px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 4 }}>{subtitle}</div>
        <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
          <span className="lv2-num" style={{ fontSize: 64, fontWeight: 800, color }}>{value || 0}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--live-label)' }}> / {max}</span>
        </div>
        <input
          type="range" min={0} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: color as string, height: 30 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--live-label)', marginTop: 2 }}>
          <span>0</span><span>{max}</span>
        </div>
        <button className="lv2-pill lv2-pill-primary lv2-press" style={{ marginTop: 18 }} onClick={onClose}>
          OK
        </button>
      </div>
    </SlideUp>
  )
}

// ── Feuille de sélection (matériel) ─────────────────────────────────
function PickSheet({ open, title, items, selectedId, emptyLabel, onPick, onClose }: {
  open: boolean; title: string; items: GearItem[]; selectedId: string | null; emptyLabel: string
  onPick: (id: string | null) => void; onClose: () => void
}) {
  return (
    <SlideUp open={open} onClose={onClose}>
      <div style={{ padding: '4px 22px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{title}</div>
        {items.length === 0 ? (
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--live-text-2)', padding: '16px 0' }}>{emptyLabel}</div>
        ) : (
          items.map((it, i) => {
            const on = it.id === selectedId
            return (
              <button
                key={it.id} onClick={() => onPick(it.id)}
                style={{
                  width: '100%', padding: '15px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
                  borderTop: i > 0 ? '1px solid var(--live-hairline)' : 'none', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 15, fontWeight: 700, color: on ? 'var(--live-accent)' : 'var(--live-text)',
                }}
              >
                {it.label}
                {on && <svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 12.5 L9.5 18 L20 6.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            )
          })
        )}
      </div>
    </SlideUp>
  )
}

// ── Conteneur de feuille coulissante (bas → haut) ───────────────────
function SlideUp({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) {
      setRender(true)
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [open])
  if (!render) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--live-veil)', opacity: shown ? 1 : 0, transition: 'opacity 0.28s' }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--live-bg)', borderRadius: '22px 22px 0 0',
        borderTop: '1px solid var(--live-hairline-2)',
        padding: '10px 0 calc(env(safe-area-inset-bottom) + 20px)',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
          <span style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--live-hairline-2)' }} />
        </div>
        {children}
      </div>
    </div>
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
