'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notifyActivitySaved } from '@/lib/notifications/activitySaved'
import RPESlider from './RPESlider'
import RowingTypeSelector from './RowingTypeSelector'
import RowingPieces from './RowingPieces'
import RowingSummary from './RowingSummary'
import TrainingTypeSelector from './TrainingTypeSelector'
import { ROWING_TYPES, calcSplit500, calcWatts, formatSplit, type RowingPiece } from '@/types/rowing'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Props { onClose: () => void }

function autoTitle(t: (key: string) => string): string {
  const d = new Date()
  const day = d.toLocaleDateString(currentLocale(), { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString(currentLocale(), { month: 'long' })
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${t('record.rowingAutoTitlePrefix')} · ${cap(day)} ${num} ${month}`
}

type SavedData = { id: string | null; durationSec: number; distanceM: number; split500Sec: number; avgWatts: number; calories: number; rpe: number; pieces: RowingPiece[] }

export default function RowingForm({ onClose }: Props) {
  const { t } = useI18n()
  const [isDark, setIsDark] = useState(false)
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])

  const [title, setTitle]             = useState(autoTitle(t))
  const [practiceType, setPracticeType] = useState('indoor')
  const [hours, setHours]             = useState(0)
  const [mins, setMins]               = useState(0)
  const [secs, setSecs]               = useState(0)
  const [distVal, setDistVal]         = useState(0)
  const [distUnit, setDistUnit]       = useState<'m' | 'km'>('m')
  const [pieces, setPieces]           = useState<RowingPiece[]>([])
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [rpe, setRpe]                 = useState(5)
  const [comment, setComment]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState<SavedData | null>(null)

  const durationSec = hours * 3600 + mins * 60 + secs
  const distanceM   = distUnit === 'km' ? distVal * 1000 : distVal

  const totalDurFromPieces = pieces.reduce((s, p) => s + p.durationSec, 0)
  const totalDistFromPieces = pieces.reduce((s, p) => s + p.distanceM, 0)
  const effectiveDur = pieces.length > 0 && totalDurFromPieces > 0 ? totalDurFromPieces : durationSec
  const effectiveDist = pieces.length > 0 && totalDistFromPieces > 0 ? totalDistFromPieces : distanceM

  const split500 = calcSplit500(effectiveDur, effectiveDist)
  const watts = calcWatts(split500)

  const bg     = isDark ? '#0A0A0A' : '#FFFFFF'
  const text   = isDark ? '#FFFFFF' : '#0A0A0A'
  const muted  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const btnBg  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
  const ACCENT = '#06B6D4'

  const LABEL: React.CSSProperties = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:muted, margin:'0 0 10px', display:'block' }
  const INPUT: React.CSSProperties = { width:'100%', boxSizing:'border-box', background:surface, border:`1px solid ${border}`, borderRadius:12, padding:'12px 16px', fontSize:15, color:text, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const NUM_SM: React.CSSProperties = { ...INPUT, width:72, padding:'12px 8px', textAlign:'center' }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    let savedId: string | null = null
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const calories = Math.round(effectiveDur / 60 * 10)
        const { data } = await sb.from('workout_sessions').insert({
          user_id: user.id, sport: 'rowing',
          duration_seconds: effectiveDur, distance_m: effectiveDist,
          title: title.trim() || autoTitle(t),
          rpe, comment,
          rowing_type: practiceType,
          split_500m_seconds: split500 > 0 ? split500 : null,
          avg_watts: watts > 0 ? watts : null,
          rowing_pieces: pieces.length > 0 ? pieces : null,
          calories, training_types: trainingTypes,
          status: 'completed',
        }).select('id').single()
        savedId = data?.id ?? null
        notifyActivitySaved({ sport: 'rowing', title: title.trim() || autoTitle(t) })
      }
    } catch (e) { console.error('[rowing] save error:', e) }
    setSaving(false)
    setSaved({ id: savedId, durationSec: effectiveDur, distanceM: effectiveDist, split500Sec: split500, avgWatts: watts, calories: Math.round(effectiveDur / 60 * 10), rpe, pieces })
  }

  if (saved) return <RowingSummary session={saved} onClose={onClose} />

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10004, background:bg, color:text, display:'flex', flexDirection:'column', fontFamily:'DM Sans, sans-serif', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:`1px solid ${border}`, position:'relative' }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:btnBg, border:'none', color:text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', fontSize:15, fontWeight:600 }}>{t('record.rowingNewSession')}</span>
        <button onClick={handleSave} disabled={saving} style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:10, background:'none', border:'none', color:ACCENT, fontSize:15, fontWeight:600, cursor:saving?'default':'pointer', opacity:saving?0.5:1 }}>
          {saving ? '…' : t('record.rowingSave')}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', paddingBottom:120 }}>
        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingTitle')}</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle(t)} style={INPUT} />
        </div>

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingPracticeType')}</span>
          <RowingTypeSelector selected={practiceType} onChange={setPracticeType} isDark={isDark} />
        </div>

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingTotalDuration')}</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <input type="number" min={0} max={23} value={hours} onChange={e => setHours(Math.max(0, parseInt(e.target.value)||0))} style={NUM_SM} />
              <span style={{ fontSize:11, color:muted }}>h</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <input type="number" min={0} max={59} value={mins} onChange={e => setMins(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} style={NUM_SM} />
              <span style={{ fontSize:11, color:muted }}>min</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <input type="number" min={0} max={59} value={secs} onChange={e => setSecs(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} style={NUM_SM} />
              <span style={{ fontSize:11, color:muted }}>sec</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingTotalDistance')}</span>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
            <input type="number" min={0} step={distUnit==='km'?0.1:100} value={distVal||''} onChange={e => setDistVal(parseFloat(e.target.value)||0)} placeholder="0" style={{ ...INPUT, width:120 }} />
            <div style={{ display:'flex', gap:0, borderRadius:10, overflow:'hidden', border:`1px solid ${border}` }}>
              {(['m','km'] as const).map(u => (
                <button key={u} onClick={() => setDistUnit(u)} style={{ padding:'10px 16px', background: distUnit===u ? ACCENT : surface, color: distUnit===u ? '#FFF' : text, border:'none', cursor:'pointer', fontSize:14, fontWeight:distUnit===u?600:400 }}>{u}</button>
              ))}
            </div>
          </div>
          {split500 > 0 && (
            <p style={{ margin:0, fontSize:15, fontWeight:600, color:ACCENT }}>{t('record.rowingSplit500Label')} {formatSplit(split500)}</p>
          )}
        </div>

        {split500 > 0 && watts > 0 && (
          <div style={{ marginBottom:24, padding:'14px 16px', background:surface, borderRadius:12, border:`1px solid ${border}` }}>
            <p style={{ margin:'0 0 4px', fontSize:15, fontWeight:600, color:text }}>{t('record.rowingEstPower')} {watts} w</p>
            <p style={{ margin:0, fontSize:11, color:muted, fontStyle:'italic' }}>{t('record.rowingEstPowerNote')}</p>
          </div>
        )}

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingCircuitDetails')}</span>
          <p style={{ fontSize:12, color:muted, margin:'-6px 0 12px' }}>{t('record.rowingCircuitHint')}</p>
          <RowingPieces pieces={pieces} onChange={setPieces} practiceType={practiceType} isDark={isDark} />
        </div>

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingTrainingType')}</span>
          <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={ROWING_TYPES} />
        </div>

        <div style={{ marginBottom:24 }}>
          <span style={LABEL}>{t('record.rowingFeeling')}</span>
          <RPESlider value={rpe} onChange={setRpe} isDark={isDark} />
        </div>

        <div style={{ marginBottom:12 }}>
          <span style={LABEL}>{t('record.rowingComment')}</span>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('record.rowingCommentPlaceholder')}
            style={{ ...INPUT, resize:'none' }} />
        </div>
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 20px', paddingBottom:'max(env(safe-area-inset-bottom),20px)', background: isDark?'linear-gradient(transparent,#0A0A0A 40%)':'linear-gradient(transparent,#FFFFFF 40%)' }}>
        <button onClick={handleSave} disabled={saving} style={{ width:'100%', height:52, borderRadius:16, background:`linear-gradient(135deg,${ACCENT},#2563EB)`, border:'none', color:'#fff', fontSize:16, fontWeight:600, cursor:saving?'default':'pointer', opacity:saving?0.7:1, boxShadow:`0 4px 20px rgba(6,182,212,0.35)` }}>
          {saving ? t('record.rowingSaving') : t('record.rowingSaveActivity')}
        </button>
      </div>
    </div>
  )
}
