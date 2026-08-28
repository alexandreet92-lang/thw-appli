'use client'
// ══════════════════════════════════════════════════════════════
// Tests PERSONNALISÉS (créés par l'athlète) — visibles uniquement par leur
// créateur (RLS owner-only sur custom_tests). Création, liste, saisie d'une
// valeur (historique dans results jsonb), suppression. Indépendant du catalogue
// et du moteur de protocoles.
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { Plus, FlaskConical, Trash2, X } from 'lucide-react'

interface Result { date: string; value: string; note?: string }
interface CustomTest { id: string; nom: string; sport: string; description: string | null; unite: string | null; results: Result[] }

export function CustomTests({ sport, color }: { sport: string; color: string }) {
  const { t } = useI18n()
  const [tests, setTests] = useState<CustomTest[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [logTest, setLogTest] = useState<CustomTest | null>(null)
  const [nom, setNom] = useState(''); const [desc, setDesc] = useState(''); const [unite, setUnite] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { setTests([]); return }
      const { data } = await sb.from('custom_tests').select('id, nom, sport, description, unite, results')
        .eq('user_id', user.id).eq('sport', sport).order('created_at', { ascending: true })
      setTests((data ?? []) as CustomTest[])
    } catch { setTests([]) }
  }
  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sport])

  const create = async () => {
    if (!nom.trim() || busy) return
    setBusy(true)
    try {
      const sb = createClient()
      const user = await getCurrentUser(); if (!user) return
      await sb.from('custom_tests').insert({ user_id: user.id, sport, nom: nom.trim(), description: desc.trim() || null, unite: unite.trim() || null })
      setNom(''); setDesc(''); setUnite(''); setCreateOpen(false)
      await load()
    } finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    const sb = createClient()
    await sb.from('custom_tests').delete().eq('id', id)
    setTests(ts => (ts ?? []).filter(x => x.id !== id))
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }

  if (!tests) return null

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 10px' }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
        <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('perf.customTests')}</span>
        {tests.length > 0 && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 600 }}>{tests.length}</span>}
        <button onClick={() => setCreateOpen(o => !o)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, border: 'none', background: color, color: 'var(--on-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> {t('perf.createTest')}
        </button>
      </div>

      {createOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 10 }}>
          <input style={inp} value={nom} onChange={e => setNom(e.target.value)} placeholder={t('perf.testNamePlaceholder')} />
          <input style={inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('perf.testDescPlaceholder')} />
          <input style={inp} value={unite} onChange={e => setUnite(e.target.value)} placeholder={t('perf.testUnitPlaceholder')} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCreateOpen(false)} style={{ flex: 1, padding: 9, borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 12.5, cursor: 'pointer' }}>{t('perf.cancel')}</button>
            <button onClick={() => void create()} disabled={!nom.trim() || busy} style={{ flex: 2, padding: 9, borderRadius: 9, background: color, border: 'none', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: !nom.trim() ? 0.5 : 1 }}>{t('perf.create')}</button>
          </div>
        </div>
      )}

      {tests.length === 0 && !createOpen && (
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 4px' }}>{t('perf.noCustomTest')}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {tests.map(ct => {
          const last = ct.results?.[ct.results.length - 1]
          return (
            <div key={ct.id} onClick={() => setLogTest(ct)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${color} 12%, transparent)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FlaskConical size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{ct.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {last ? `${t('perf.lastValue')} : ${last.value}${ct.unite ? ` ${ct.unite}` : ''}` : (ct.description || t('perf.tapToLog'))}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); void remove(ct.id) }} aria-label={t('perf.delete')} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Trash2 size={15} /></button>
            </div>
          )
        })}
      </div>

      {logTest && <CustomTestLog test={logTest} color={color} onClose={() => setLogTest(null)} onSaved={() => { void load() }} />}
    </div>
  )
}

// Saisie d'une valeur + historique pour un test perso.
function CustomTestLog({ test, color, onClose, onSaved }: { test: CustomTest; color: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }

  const save = async () => {
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      const sb = createClient()
      const next: Result[] = [...(test.results ?? []), { date, value: value.trim(), note: note.trim() || undefined }]
      await sb.from('custom_tests').update({ results: next }).eq('id', test.id)
      onSaved(); onClose()
    } finally { setBusy(false) }
  }

  const hist = [...(test.results ?? [])].reverse()
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 22, maxWidth: 440, width: '100%', maxHeight: '88vh', overflowY: 'auto', fontFamily: 'DM Sans,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>{test.nom}</h3>
            {test.description && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>{test.description}</p>}
          </div>
          <button onClick={onClose} aria-label={t('perf.close')} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inp, flex: 2 }} value={value} onChange={e => setValue(e.target.value)} placeholder={`${t('perf.value')}${test.unite ? ` (${test.unite})` : ''}`} />
          <input type="date" style={{ ...inp, flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <input style={{ ...inp, marginBottom: 12 }} value={note} onChange={e => setNote(e.target.value)} placeholder={t('perf.noteOptional')} />
        <button onClick={() => void save()} disabled={!value.trim() || busy} style={{ width: '100%', padding: 11, borderRadius: 10, background: color, border: 'none', color: 'var(--on-primary)', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !value.trim() ? 0.5 : 1 }}>{t('perf.saveValue')}</button>

        {hist.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }}>{t('perf.history')}</p>
            {hist.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < hist.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 78 }}>{r.date}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.value}{test.unite ? ` ${test.unite}` : ''}</span>
                {r.note && <span style={{ fontSize: 11.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{r.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
