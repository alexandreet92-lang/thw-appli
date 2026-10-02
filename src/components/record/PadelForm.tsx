'use client'
import { useState } from 'react'
import { rkScope, useAppDark, RkScreenIn, RkFab, RkIco, RK_ICON, RkCta } from './kit/RecordKit'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { notifyActivitySaved } from '@/lib/notifications/activitySaved'
import { useI18n } from '@/lib/i18n'
import RPESlider from './RPESlider'
import MatchScoreInput, { type MatchSet } from './MatchScoreInput'
import { PADEL_SPORTS, PADEL_SURFACES } from '@/types/padel'
import { currentLocale } from '@/lib/i18n'

interface Props { onClose: () => void }

function autoTitle(sport: string) {
  const d = new Date()
  const label = PADEL_SPORTS.find(s => s.id === sport)?.label ?? 'Padel'
  const day = d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'long' })
  return `${label} · ${day.charAt(0).toUpperCase() + day.slice(1)}`
}

const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 4px 8px', display: 'block' }
const INPUT: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', minHeight: 48, padding: '12px 16px', fontSize: 16, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }
const NUM_SM: React.CSSProperties = { ...INPUT, width: 72, padding: '12px 8px', textAlign: 'center' }
function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string; labelKey?: string }[]; value: T; onChange: (v: T) => void }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onChange(it.id)} className="rk-press" style={{ minHeight: 44, padding: '0 18px', borderRadius: 'var(--r-pill)', border: 'none', background: value === it.id ? 'var(--text)' : 'var(--surface-card)', color: value === it.id ? 'var(--bg)' : 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background-color 200ms ease' }}>{it.labelKey ? t(it.labelKey) : it.label}</button>
      ))}
    </div>
  )
}

type Result = 'win' | 'loss' | 'draw'
type SavedData = { sport: string; result: Result; sets: MatchSet[]; durationSec: number; opponent: string; surface: string; rpe: number }

export default function PadelForm({ onClose }: Props) {
  const isDarkApp = useAppDark()
  const { t } = useI18n()
  const [sport, setSport]         = useState<string>('padel')
  const [isDouble, setIsDouble]   = useState(false)
  const [opponent, setOpponent]   = useState('')
  const [partner, setPartner]     = useState('')
  const [location, setLocation]   = useState('')
  const [surface, setSurface]     = useState<string>('hard')
  const [result, setResult]       = useState<Result>('win')
  const [sets, setSets]           = useState<MatchSet[]>([])
  const [hours, setHours]         = useState(0)
  const [mins, setMins]           = useState(1)
  const [secs, setSecs]           = useState(30)
  const [rpe, setRpe]             = useState(5)
  const [comment, setComment]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState<SavedData | null>(null)

  const durationSec = hours * 3600 + mins * 60 + secs

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (user) {
        const setsWonMe  = sets.filter(s => s.me  > s.opp).length
        const setsWonOpp = sets.filter(s => s.opp > s.me ).length
        const finalTitle = autoTitle(sport)
        const startedISO = new Date(Date.now() - durationSec * 1000).toISOString()
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport,
          started_at: startedISO,
          duration_seconds: durationSec, status: 'completed',
          title: finalTitle, rpe, comment,
          calories: Math.round(durationSec / 60 * 9),
          opponent_name: opponent || null, partner_name: isDouble ? partner || null : null,
          match_result: result, match_score: { sets, setsWonMe, setsWonOpp },
          court_surface: surface, court_location: location || null,
          training_types: ['match'],
        })
        // ESSENTIEL : ligne `activities` — lue par la page Training (sinon invisible).
        // Padel/tennis → sport_type 'other' (jeu de raquette, pas de type dédié).
        await sb.from('activities').insert({
          user_id: user.id, sport_type: 'other', title: finalTitle,
          started_at: startedISO, moving_time_s: durationSec, elapsed_time_s: durationSec,
          calories: Math.round(durationSec / 60 * 9), rpe, comment,
        })
        notifyActivitySaved({ sport, title: finalTitle })
      }
    } catch (e) { console.error('[padel] save error:', e) }
    setSaving(false)
    setSaved({ sport, result, sets, durationSec, opponent, surface, rpe })
  }

  if (saved) {
    const setsWonMe  = saved.sets.filter(s => s.me  > s.opp).length
    const setsWonOpp = saved.sets.filter(s => s.opp > s.me ).length
    const resultColors: Record<Result, string> = { win: 'var(--success)', loss: 'var(--danger)', draw: 'var(--text-mid)' }
    const resultLabels: Record<Result, string> = { win: t('record.padelResultWin'), loss: t('record.padelResultLoss'), draw: t('record.padelResultDraw') }
    const fmtDur = `${String(Math.floor(saved.durationSec/3600)).padStart(2,'0')}:${String(Math.floor((saved.durationSec%3600)/60)).padStart(2,'0')}:${String(saved.durationSec%60).padStart(2,'0')}`
    return (
      <RkScreenIn className={rkScope(isDarkApp)} style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', paddingTop: 'env(safe-area-inset-top)', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 16px' }}>
        <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RkIco d={RK_ICON.check} size={28} sw={3} /></span>
        <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('record.padelSessionSaved')}</p>
        <span className="rk-banner" style={{ animation: 'none' }}><span className="rk-dot" style={{ background: resultColors[saved.result] }} />{resultLabels[saved.result]}</span>
        {saved.sets.length > 0 && <p className="rk-num" style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>{setsWonMe} — {setsWonOpp}</p>}
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, lineHeight: 2 }}>
          <p style={{ margin: 0 }}>{t('record.padelSummaryDuration')} {fmtDur}</p>
          {saved.opponent && <p style={{ margin: 0 }}>{t('record.padelSummaryOpponent')} {saved.opponent}</p>}
          <p style={{ margin: 0 }}>{t('record.padelSummarySurface')} {(() => { const s = PADEL_SURFACES.find(s => s.id === saved.surface); return s?.labelKey ? t(s.labelKey) : s?.label })()}</p>
          <p style={{ margin: 0 }}>{t('record.padelSummaryRpe')} {saved.rpe}/10</p>
        </div>
        <div style={{ width: '100%', maxWidth: 380 }}><RkCta variant="primary" onClick={onClose}>{t('record.padelFinish')}</RkCta></div>
      </RkScreenIn>
    )
  }

  const fmtDur = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  const resultColors: Record<Result, string> = { win: 'var(--success)', loss: 'var(--danger)', draw: 'var(--text-mid)' }
  const resultLabels: Record<Result, string> = { win: t('record.padelResultWin'), loss: t('record.padelResultLoss'), draw: t('record.padelResultDraw') }

  return (
    <RkScreenIn className={rkScope(isDarkApp)} style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px', position: 'relative' }}>
        <RkFab label="×" onClick={onClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 19, fontWeight: 800 }}>{t('record.padelNewSession')}</span>
        <button onClick={handleSave} disabled={saving} className="rk-press" style={{ marginLeft: 'auto', minHeight: 44, padding: '0 14px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 16, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? '…' : t('record.padelSave')}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: 120 }}>
        <div style={{ marginBottom: 24 }}><label style={LABEL}>{t('record.padelSport')}</label><Chips items={PADEL_SPORTS} value={sport} onChange={setSport} /></div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.padelOpponent')}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {([{ id: 'solo', label: t('record.padelSolo') }, { id: 'double', label: t('record.padelDoubleMode') }] as const).map(m => (
              <button key={m.id} onClick={() => setIsDouble(m.id === 'double')} className="rk-press" style={{ minHeight: 44, padding: '0 20px', borderRadius: 'var(--r-pill)', border: 'none', background: (m.id === 'double') === isDouble ? 'var(--text)' : 'var(--surface-card)', color: (m.id === 'double') === isDouble ? 'var(--bg)' : 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{m.label}</button>
            ))}
          </div>
          <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder={t('record.padelOpponentPlaceholder')} style={{ ...INPUT, marginBottom: isDouble ? 8 : 0 }} />
          {isDouble && <input value={partner} onChange={e => setPartner(e.target.value)} placeholder={t('record.padelPartnerPlaceholder')} style={INPUT} />}
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.padelLocation')}</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('record.padelLocationPlaceholder')} style={{ ...INPUT, marginBottom: 10 }} />
          <Chips items={PADEL_SURFACES} value={surface} onChange={setSurface} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.padelResult')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['win','loss','draw'] as Result[]).map(r => (
              <button key={r} onClick={() => setResult(r)} className="rk-press" style={{ flex: 1, minHeight: 48, padding: '0 10px', borderRadius: 'var(--r-pill)', border: 'none', background: result === r ? 'var(--text)' : 'var(--surface-card)', color: result === r ? 'var(--bg)' : 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><span className="rk-dot" style={{ background: resultColors[r] }} />{resultLabels[r]}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}><label style={LABEL}>{t('record.padelScoreBySets')}</label><MatchScoreInput sets={sets} onChange={setSets} isDark={true} /></div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.padelDuration')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            {[{ v: hours, set: setHours, max: 23, l: 'h' }, { v: mins, set: setMins, max: 59, l: 'min' }, { v: secs, set: setSecs, max: 59, l: 'sec' }].map(({ v, set, max, l }) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <input type="number" value={v || ''} placeholder="0" min={0} max={max} onChange={e => set(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))} style={NUM_SM} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{l}</span>
              </div>
            ))}
          </div>
          <p className="rk-num" style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>{fmtDur}</p>
        </div>
        <div style={{ marginBottom: 24 }}><label style={LABEL}>{t('record.padelFeeling')}</label><RPESlider value={rpe} onChange={setRpe} isDark={true} /></div>
        <div style={{ marginBottom: 12 }}><label style={LABEL}>{t('record.padelComment')}</label><textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('record.padelCommentPlaceholder')} style={{ ...INPUT, resize: 'none' }} /></div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 16px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)', background: 'linear-gradient(transparent, var(--surface-page) 40%)' }}>
        <RkCta variant="primary" onClick={() => { void handleSave() }} disabled={saving} progress={saving ? 66 : null} style={{ opacity: 1 }}>
          {saving ? t('record.padelSaving') : t('record.padelSaveActivity')}
        </RkCta>
      </div>
    </RkScreenIn>
  )
}
