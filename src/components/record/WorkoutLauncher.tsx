'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise } from '@/types/workout'
import { DEFAULT_GYM_EXERCISES, DEFAULT_HYROX_EXERCISES } from '@/types/workout'

interface PlannedSession { id: string; title: string; sport: string; blocks: WorkoutExercise[] }

interface Props {
  sport: 'gym' | 'hyrox'
  open: boolean
  onClose: () => void
  onStart: (exercises: WorkoutExercise[], title?: string) => void
  isDark: boolean
}

function getTheme(isDark: boolean) {
  return { bg: isDark?'#0A0A0A':'#FFFFFF', text: isDark?'#FFFFFF':'#0A0A0A', dim: isDark?'rgba(255,255,255,0.35)':'#8C8C8C', separator: isDark?'rgba(255,255,255,0.08)':'#E8E8E8', surface: isDark?'rgba(255,255,255,0.05)':'#F9FAFB', border: isDark?'rgba(255,255,255,0.10)':'#E5E7EB' }
}

export default function WorkoutLauncher({ sport, open, onClose, onStart, isDark }: Props) {
  const t = getTheme(isDark)
  const [closing, setClosing] = useState(false)
  const [sessions, setSessions] = useState<PlannedSession[]>([])
  const accent = sport === 'gym' ? '#8B5CF6' : '#EF4444'

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('planned_sessions').select('id, title, sport, blocks').eq('sport', sport).limit(10)
      .then(({ data }) => setSessions((data ?? []).map(d => ({ ...d, blocks: (d.blocks ?? []) as WorkoutExercise[] }))))
  }, [open, sport])

  if (!open) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const defaultExercises = sport === 'gym' ? DEFAULT_GYM_EXERCISES : DEFAULT_HYROX_EXERCISES
  const label = sport === 'gym' ? 'Muscu' : 'Hyrox'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={handleClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.50)', backdropFilter:'blur(4px)', animation: closing?'fade-out 200ms ease-in forwards':'fade-in 200ms ease-out forwards' }} />
      <div className={closing?'sheet-close':'sheet-open'} style={{ position:'fixed', left:0, right:0, bottom:0, maxHeight:'78vh', background:t.bg, borderTopLeftRadius:24, borderTopRightRadius:24, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'DM Sans, sans-serif', boxShadow:'0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10 }}><div style={{ width:40, height:4, borderRadius:2, background:t.separator }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0, fontFamily:'Syne, sans-serif' }}>{label}</h2>
          <button onClick={handleClose} style={{ color:t.dim, background:'none', border:'none', fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 8px' }}>×</button>
        </div>

        {/* Conseil box */}
        <div style={{ margin:'0 16px 16px', background:`${accent}12`, border:`1px solid ${accent}30`, borderRadius:14, padding:'12px 14px' }}>
          <p style={{ fontSize:13, color: isDark ? `${accent}ee` : accent, margin:0, lineHeight:1.5 }}>
            {sport === 'gym' ? '💪 Sélectionne un plan existant ou démarre en mode libre avec les exercices par défaut.' : '🏅 Lance un circuit Hyrox complet ou sélectionne une simulation planifiée.'}
          </p>
        </div>

        <div style={{ flex:1, overflowY:'auto', paddingBottom:24 }}>
          {/* Mode libre */}
          <div style={{ padding:'0 16px 16px' }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:t.dim, margin:'0 0 10px' }}>Mode libre</p>
            <button onClick={() => onStart(defaultExercises)}
              style={{ width:'100%', padding:'14px 16px', background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:'none', borderRadius:16, display:'flex', alignItems:'center', gap:12, cursor:'pointer', color:'#fff', textAlign:'left' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.20)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {sport === 'gym' ? '🏋️' : '🏅'}
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:600, margin:0 }}>{label} — exercices par défaut</p>
                <p style={{ fontSize:12, margin:'2px 0 0', opacity:0.75 }}>{defaultExercises.length} exercices</p>
              </div>
            </button>
          </div>

          {/* Séances planifiées */}
          {sessions.length > 0 && (
            <div style={{ padding:'0 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:t.dim, margin:'0 0 10px' }}>Plans existants</p>
              {sessions.map((s, idx) => (
                <button key={s.id} onClick={() => onStart(s.blocks, s.title)}
                  style={{ width:'100%', padding:'14px 16px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, display:'flex', alignItems:'center', gap:12, cursor:'pointer', marginBottom: idx < sessions.length - 1 ? 8 : 0, textAlign:'left' }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:500, color:t.text, margin:0 }}>{s.title}</p>
                    <p style={{ fontSize:12, color:t.dim, margin:'2px 0 0' }}>{s.blocks.length} exercices</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke={t.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{from{opacity:1}to{opacity:0}}`}</style>
    </div>
  )
}
