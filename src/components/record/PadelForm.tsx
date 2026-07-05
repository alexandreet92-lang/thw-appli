'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import RPESlider from './RPESlider'
import MatchScoreInput, { type MatchSet } from './MatchScoreInput'
import { PADEL_SPORTS, PADEL_SURFACES } from '@/types/padel'

interface Props { onClose: () => void }

function autoTitle(sport: string) {
  const d = new Date()
  const label = PADEL_SPORTS.find(s => s.id === sport)?.label ?? 'Padel'
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  return `${label} · ${day.charAt(0).toUpperCase() + day.slice(1)}`
}

const LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 10px', display: 'block' }
const INPUT: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
const NUM_SM: React.CSSProperties = { ...INPUT, width: 72, padding: '12px 8px', textAlign: 'center' }
function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onChange(it.id)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: value === it.id ? '#06B6D4' : 'var(--bg-card2)', color: value === it.id ? '#FFF' : 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{it.label}</button>
      ))}
    </div>
  )
}

type Result = 'win' | 'loss' | 'draw'
type SavedData = { sport: string; result: Result; sets: MatchSet[]; durationSec: number; opponent: string; surface: string; rpe: number }

export default function PadelForm({ onClose }: Props) {
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
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const setsWonMe  = sets.filter(s => s.me  > s.opp).length
        const setsWonOpp = sets.filter(s => s.opp > s.me ).length
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport,
          duration_seconds: durationSec, status: 'completed',
          title: autoTitle(sport), rpe, comment,
          calories: Math.round(durationSec / 60 * 9),
          opponent_name: opponent || null, partner_name: isDouble ? partner || null : null,
          match_result: result, match_score: { sets, setsWonMe, setsWonOpp },
          court_surface: surface, court_location: location || null,
          training_types: ['match'],
        })
      }
    } catch (e) { console.error('[padel] save error:', e) }
    setSaving(false)
    setSaved({ sport, result, sets, durationSec, opponent, surface, rpe })
  }

  if (saved) {
    const setsWonMe  = saved.sets.filter(s => s.me  > s.opp).length
    const setsWonOpp = saved.sets.filter(s => s.opp > s.me ).length
    const resultColors: Record<Result, string> = { win: '#22C55E', loss: '#EF4444', draw: '#8C8C8C' }
    const resultLabels: Record<Result, string> = { win: t('record.padelResultWin'), loss: t('record.padelResultLoss'), draw: t('record.padelResultDraw') }
    const fmtDur = `${String(Math.floor(saved.durationSec/3600)).padStart(2,'0')}:${String(Math.floor((saved.durationSec%3600)/60)).padStart(2,'0')}:${String(saved.durationSec%60).padStart(2,'0')}`
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <span style={{ fontSize: 48 }}>🎾</span>
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('record.padelSessionSaved')}</p>
        <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: resultColors[saved.result], color: '#FFF', fontWeight: 700, fontSize: 15 }}>{resultLabels[saved.result]}</div>
        {saved.sets.length > 0 && <p style={{ fontSize: 18, fontWeight: 600, color: '#06B6D4', margin: 0 }}>{setsWonMe} — {setsWonOpp}</p>}
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, lineHeight: 2 }}>
          <p style={{ margin: 0 }}>{t('record.padelSummaryDuration')} {fmtDur}</p>
          {saved.opponent && <p style={{ margin: 0 }}>{t('record.padelSummaryOpponent')} {saved.opponent}</p>}
          <p style={{ margin: 0 }}>{t('record.padelSummarySurface')} {PADEL_SURFACES.find(s => s.id === saved.surface)?.label}</p>
          <p style={{ margin: 0 }}>{t('record.padelSummaryRpe')} {saved.rpe}/10</p>
        </div>
        <button onClick={onClose} style={{ padding: '14px 40px', borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{t('record.padelFinish')}</button>
      </div>
    )
  }

  const fmtDur = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  const resultColors: Record<Result, string> = { win: '#22C55E', loss: '#EF4444', draw: '#94A3B8' }
  const resultLabels: Record<Result, string> = { win: t('record.padelResultWin'), loss: t('record.padelResultLoss'), draw: t('record.padelResultDraw') }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}>×</button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>{t('record.padelNewSession')}</span>
        <button onClick={handleSave} disabled={saving} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#06B6D4', fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? '…' : t('record.padelSave')}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: 120 }}>
        <div style={{ marginBottom: 24 }}><label style={LABEL}>{t('record.padelSport')}</label><Chips items={PADEL_SPORTS} value={sport} onChange={setSport} /></div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>{t('record.padelOpponent')}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {([{ id: 'solo', label: t('record.padelSolo') }, { id: 'double', label: t('record.padelDoubleMode') }] as const).map(m => (
              <button key={m.id} onClick={() => setIsDouble(m.id === 'double')} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', background: (m.id === 'double') === isDouble ? '#06B6D4' : 'var(--bg-card2)', color: (m.id === 'double') === isDouble ? '#FFF' : 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{m.label}</button>
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
              <button key={r} onClick={() => setResult(r)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: `2px solid ${result === r ? resultColors[r] : 'transparent'}`, background: result === r ? `${resultColors[r]}20` : 'var(--bg-card2)', color: result === r ? resultColors[r] : 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{resultLabels[r]}</button>
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
          <p style={{ margin: '10px 0 0', fontSize: 24, fontWeight: 700, color: '#06B6D4', textAlign: 'center' }}>{fmtDur}</p>
        </div>
        <div style={{ marginBottom: 24 }}><label style={LABEL}>{t('record.padelFeeling')}</label><RPESlider value={rpe} onChange={setRpe} isDark={true} /></div>
        <div style={{ marginBottom: 12 }}><label style={LABEL}>{t('record.padelComment')}</label><textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('record.padelCommentPlaceholder')} style={{ ...INPUT, resize: 'none' }} /></div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)', background: 'linear-gradient(transparent, var(--bg) 40%)' }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}>
          {saving ? t('record.padelSaving') : t('record.padelSaveActivity')}
        </button>
      </div>
    </div>
  )
}
