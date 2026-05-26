'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { YogaExercise, YogaCategory, YogaSessionExercise } from '@/types/yoga'
import { YOGA_CATEGORIES, DEFAULT_YOGA_EXERCISES } from '@/types/yoga'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (ex: YogaSessionExercise) => void
  isDark: boolean
}

const CAT_TABS = [{ id: 'all', label: 'Tout' }, ...YOGA_CATEGORIES.map(c => ({ id: c.id, label: c.label }))]

async function seedIfEmpty(sb: ReturnType<typeof createClient>) {
  const { data } = await sb.from('yoga_exercises').select('id').limit(1)
  if (data && data.length > 0) return
  await sb.from('yoga_exercises').insert(
    DEFAULT_YOGA_EXERCISES.map(e => ({ ...e, user_id: null }))
  )
}

export default function YogaExercisePicker({ open, onClose, onAdd, isDark }: Props) {
  const [exercises, setExercises] = useState<YogaExercise[]>([])
  const [tab, setTab]             = useState<'all' | YogaCategory>('all')
  const [search, setSearch]       = useState('')
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newCat, setNewCat]       = useState<YogaCategory>('flexibility')
  const [newDur, setNewDur]       = useState(30)
  const [closing, setClosing]     = useState(false)

  const bg   = isDark ? '#111' : '#FFF'
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const surf = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const bord = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  useEffect(() => {
    if (!open) return
    setClosing(false)
    const sb = createClient()
    seedIfEmpty(sb).then(() => {
      sb.from('yoga_exercises').select('*').order('name').then(({ data }) => {
        setExercises((data ?? []) as YogaExercise[])
      })
    })
  }, [open])

  if (!open) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 220) }

  const filtered = exercises.filter(e =>
    (tab === 'all' || e.category === tab) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newName.trim()) return
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('yoga_exercises').insert({
      name: newName.trim(), category: newCat,
      default_duration_seconds: newDur,
      is_custom: true, user_id: user.id,
    }).select().single()
    if (data) {
      setExercises(prev => [...prev, data as YogaExercise])
      onAdd({ exerciseId: data.id, name: data.name, category: data.category as YogaCategory, duration_seconds: data.default_duration_seconds })
    }
    setCreating(false); setNewName(''); setNewDur(30)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', animation: closing ? 'ypick-out 200ms ease-in forwards' : 'ypick-in 200ms ease-out forwards' }} />
      <div style={{ position: 'relative', width: '100%', height: '80vh', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: closing ? 'sheet-cls 200ms ease-in forwards' : 'sheet-opn 220ms cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: dim }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px', flexShrink: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'Syne, sans-serif' }}>Ajouter un exercice</p>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: dim, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
          <div style={{ background: surf, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${bord}` }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#8C8C8C" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="#8C8C8C" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input placeholder="Rechercher" value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: text, fontSize: 14, flex: 1, fontFamily: 'DM Sans, sans-serif' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto', flexShrink: 0 }}>
          {CAT_TABS.map(c => (
            <button key={c.id} onClick={() => setTab(c.id as 'all' | YogaCategory)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: tab === c.id ? '#06B6D4' : surf, color: tab === c.id ? '#FFF' : text, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {filtered.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 12px', borderBottom: `1px solid ${sep}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, color: text, margin: 0 }}>{e.name}</p>
                <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>{e.default_duration_seconds}s</p>
              </div>
              <button onClick={() => onAdd({ exerciseId: e.id, name: e.name, category: e.category as YogaCategory, duration_seconds: e.default_duration_seconds })} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', border: 'none', color: '#06B6D4', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          ))}
          {!creating ? (
            <button onClick={() => setCreating(true)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: `1px dashed ${bord}`, borderRadius: 12, color: '#06B6D4', fontSize: 14, cursor: 'pointer', margin: '12px 0', fontFamily: 'DM Sans, sans-serif' }}>+ Créer un exercice</button>
          ) : (
            <div style={{ padding: '16px 12px', borderTop: `1px solid ${sep}` }}>
              <input placeholder="Nom de l'exercice" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: surf, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: text, outline: 'none', marginBottom: 10, fontFamily: 'DM Sans, sans-serif' }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={newCat} onChange={e => setNewCat(e.target.value as YogaCategory)} style={{ flex: 1, background: surf, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: text, outline: 'none' }}>
                  {YOGA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="number" value={newDur} onChange={e => setNewDur(Number(e.target.value))} min={5} style={{ width: 80, background: surf, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: text, outline: 'none', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCreating(false)} style={{ flex: 1, height: 40, borderRadius: 10, background: surf, border: `1px solid ${bord}`, color: text, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleCreate} style={{ flex: 1, height: 40, borderRadius: 10, background: '#06B6D4', border: 'none', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Créer</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ypick-in  { from{opacity:0} to{opacity:1} }
        @keyframes ypick-out { from{opacity:1} to{opacity:0} }
        @keyframes sheet-opn { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes sheet-cls { from{transform:translateY(0)} to{transform:translateY(100%)} }
      `}</style>
    </div>
  )
}
