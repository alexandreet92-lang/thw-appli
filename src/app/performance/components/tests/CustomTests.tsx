'use client'
// ══════════════════════════════════════════════════════════════
// Tests PERSONNALISÉS (créés par l'athlète) — visibles uniquement par leur
// créateur (RLS owner-only sur custom_tests). L'athlète décrit un PROTOCOLE
// complet (objectif, conditions, échauffement, protocole, interprétation,
// erreurs courantes, fréquence), exactement comme une fiche de test du
// catalogue. Il peut ensuite enregistrer des valeurs (historique dans
// results jsonb). Indépendant du catalogue et du moteur de scoring.
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { Plus, FlaskConical, Trash2, X, Target, ListChecks, Flame, BookOpen, AlertTriangle, Clock, Save } from 'lucide-react'
import { MBlock, MField, MRow, MRowText, MSheetFrame, PillButton, SoftInput, SoftPill, SoftTextarea, NUM, SOFT_SHADOW } from '@/app/injuries/components/mobileUi'

interface Result { date: string; value: string; note?: string }
// Protocole saisi par l'athlète — même structure qu'un test du catalogue.
interface Protocol {
  objectif: string
  conditions: string[]
  echauffement: string[]
  etapes: string[]
  interpretation: string[]
  erreurs: string[]
  frequence: string
}
interface CustomTest { id: string; nom: string; sport: string; description: string | null; unite: string | null; results: Result[]; protocol: Protocol | null }

const emptyProtocol = (): Protocol => ({ objectif: '', conditions: [''], echauffement: [''], etapes: [''], interpretation: [''], erreurs: [''], frequence: '' })
const cleanList = (l: string[]) => l.map(s => s.trim()).filter(Boolean)

export function CustomTests({ sport, color, mobile }: { sport: string; color: string; mobile?: boolean }) {
  const { t } = useI18n()
  const [tests, setTests] = useState<CustomTest[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [openTest, setOpenTest] = useState<CustomTest | null>(null)

  const load = async () => {
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { setTests([]); return }
      const { data } = await sb.from('custom_tests').select('id, nom, sport, description, unite, results, protocol')
        .eq('user_id', user.id).eq('sport', sport).order('created_at', { ascending: true })
      setTests((data ?? []) as CustomTest[])
    } catch { setTests([]) }
  }
  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sport])

  const remove = async (id: string) => {
    const sb = createClient()
    await sb.from('custom_tests').delete().eq('id', id)
    setTests(ts => (ts ?? []).filter(x => x.id !== id))
  }

  if (!tests) return null

  // ══ MOBILE natif : carte blanche, lignes groupées, feuilles mobiles ══
  if (mobile) {
    return (
      <section style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '10px 0 4px', fontFamily: 'var(--font-body)', boxShadow: SOFT_SHADOW }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 2px 16px' }}>
          <h3 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            {t('perf.customTests')}{tests.length > 0 && <span style={{ ...NUM, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 8 }}>{tests.length}</span>}
          </h3>
          <button type="button" onClick={() => setCreateOpen(true)}
            style={{ minHeight: 44, padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <Plus size={18} /> {t('perf.createTest')}
          </button>
        </div>
        {tests.length === 0 && <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: 0, padding: '0 16px 12px', lineHeight: 1.45 }}>{t('perf.noCustomTest')}</p>}
        {tests.map((ct, i) => {
          const last = ct.results?.[ct.results.length - 1]
          const sub = last ? `${t('perf.lastValue')} : ${last.value}${ct.unite ? ` ${ct.unite}` : ''}`
            : (ct.protocol?.objectif || ct.description || t('perf.tapToLog'))
          return (
            <div key={ct.id} role="button" tabIndex={0} onClick={() => setOpenTest(ct)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenTest(ct) } }}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '8px 8px 8px 16px', cursor: 'pointer' }}>
              {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />}
              <span aria-hidden style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><FlaskConical size={18} /></span>
              <MRowText title={ct.nom} sub={<span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>} />
              <button type="button" onClick={e => { e.stopPropagation(); void remove(ct.id) }} aria-label={t('perf.delete')}
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Trash2 size={18} /></button>
            </div>
          )
        })}

        {createOpen && <CustomTestForm mobile sport={sport} color={color} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); void load() }} />}
        {openTest && <CustomTestDetail mobile test={openTest} color={color} onClose={() => setOpenTest(null)} onSaved={() => { void load() }} />}
      </section>
    )
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 10px' }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('perf.customTests')}</span>
        {tests.length > 0 && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 'var(--r-lg)', background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 600 }}>{tests.length}</span>}
        <button onClick={() => setCreateOpen(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 'var(--r-pill)', border: 'none', background: color, color: 'var(--on-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> {t('perf.createTest')}
        </button>
      </div>

      {tests.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 4px' }}>{t('perf.noCustomTest')}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {tests.map(ct => {
          const last = ct.results?.[ct.results.length - 1]
          const sub = last ? `${t('perf.lastValue')} : ${last.value}${ct.unite ? ` ${ct.unite}` : ''}`
            : (ct.protocol?.objectif || ct.description || t('perf.tapToLog'))
          return (
            <div key={ct.id} onClick={() => setOpenTest(ct)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${color} 12%, transparent)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FlaskConical size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{ct.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); void remove(ct.id) }} aria-label={t('perf.delete')} style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Trash2 size={15} /></button>
            </div>
          )
        })}
      </div>

      {createOpen && <CustomTestForm sport={sport} color={color} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); void load() }} />}
      {openTest && <CustomTestDetail test={openTest} color={color} onClose={() => setOpenTest(null)} onSaved={() => { void load() }} />}
    </div>
  )
}

// ── Éditeur de liste (ajouter / retirer des lignes) ─────────────────
function ListField({ label, icon, accent, items, onChange, placeholder, mobile }: {
  label: string; icon: React.ReactNode; accent: string; items: string[]; onChange: (v: string[]) => void; placeholder: string; mobile?: boolean
}) {
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)))
  const add = () => onChange([...items, ''])
  const del = (i: number) => onChange(items.length > 1 ? items.filter((_, j) => j !== i) : [''])
  // Mobile : carte blanche — une ligne = champ doux + rond « retirer », pilule « + ».
  if (mobile) {
    return (
      <MBlock title={label} icon={icon}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}><SoftInput value={v} onChange={x => set(i, x)} placeholder={placeholder} ariaLabel={label} /></div>
              <button type="button" onClick={() => del(i)} aria-label="—"
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--surface-chip)', color: 'var(--text-mid)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={18} /></button>
            </div>
          ))}
          <SoftPill full={false} onClick={add} color="var(--primary)" style={{ alignSelf: 'flex-start' }}><Plus size={18} /> {label}</SoftPill>
        </div>
      </MBlock>
    )
  }
  const inp: React.CSSProperties = { flex: 1, boxSizing: 'border-box', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ color: accent, display: 'grid', placeItems: 'center' }}>{icon}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mid)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input style={inp} value={v} onChange={e => set(i, e.target.value)} placeholder={placeholder} />
            <button onClick={() => del(i)} aria-label="—" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={14} /></button>
          </div>
        ))}
        <button onClick={add} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r-sm)', border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Plus size={13} /> {label}</button>
      </div>
    </div>
  )
}

// ── Formulaire de création : protocole complet ─────────────────────
function CustomTestForm({ sport, color, onClose, onSaved, mobile }: { sport: string; color: string; onClose: () => void; onSaved: () => void; mobile?: boolean }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  const [nom, setNom] = useState('')
  const [unite, setUnite] = useState('')
  const [p, setP] = useState<Protocol>(emptyProtocol)
  const [busy, setBusy] = useState(false)
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }
  const upd = (patch: Partial<Protocol>) => setP(prev => ({ ...prev, ...patch }))

  const save = async () => {
    if (!nom.trim() || busy) return
    setBusy(true)
    try {
      const sb = createClient()
      const user = await getCurrentUser(); if (!user) return
      const protocol: Protocol = {
        objectif: p.objectif.trim(),
        conditions: cleanList(p.conditions),
        echauffement: cleanList(p.echauffement),
        etapes: cleanList(p.etapes),
        interpretation: cleanList(p.interpretation),
        erreurs: cleanList(p.erreurs),
        frequence: p.frequence.trim(),
      }
      await sb.from('custom_tests').insert({
        user_id: user.id, sport, nom: nom.trim(),
        description: protocol.objectif || null, unite: unite.trim() || null, protocol,
      })
      onSaved()
    } finally { setBusy(false) }
  }

  // ══ MOBILE natif : feuille grise, protocole en cartes, pilule « Créer » ══
  if (mobile) {
    return (
      <MSheetFrame zIndex={9999} title={t('perf.createTest')} subtitle={t('perf.customTestFormHint')} onClose={onClose} closeLabel={t('perf.close')}
        footer={<PillButton onClick={() => void save()} disabled={!nom.trim() || busy}>{busy ? t('perf.saving') : t('perf.create')}</PillButton>}>
        <MBlock>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SoftInput value={nom} onChange={setNom} placeholder={t('perf.testNamePlaceholder')} ariaLabel={t('perf.testNamePlaceholder')} />
            <SoftInput value={unite} onChange={setUnite} placeholder={t('perf.testUnitPlaceholder')} ariaLabel={t('perf.testUnitPlaceholder')} />
          </div>
        </MBlock>
        <MBlock title={t('performance.objective')} icon={<span style={{ color: 'var(--primary)', display: 'flex' }}><Target size={20} /></span>}>
          <SoftTextarea value={p.objectif} onChange={v => upd({ objectif: v })} placeholder={t('perf.customTestObjectivePlaceholder')} ariaLabel={t('performance.objective')} />
        </MBlock>
        <ListField mobile label={t('performance.conditions')} icon={<ListChecks size={20} />} accent="var(--text-mid)" items={p.conditions} onChange={v => upd({ conditions: v })} placeholder={t('perf.customTestConditionPlaceholder')} />
        <ListField mobile label={t('performance.warmup')} icon={<Flame size={20} />} accent="var(--text-mid)" items={p.echauffement} onChange={v => upd({ echauffement: v })} placeholder={t('perf.customTestWarmupPlaceholder')} />
        <ListField mobile label={t('performance.protocolSteps')} icon={<ListChecks size={20} />} accent="var(--text-mid)" items={p.etapes} onChange={v => upd({ etapes: v })} placeholder={t('perf.customTestStepPlaceholder')} />
        <ListField mobile label={t('performance.resultsInterpretation')} icon={<BookOpen size={20} />} accent="var(--text-mid)" items={p.interpretation} onChange={v => upd({ interpretation: v })} placeholder={t('perf.customTestInterpretPlaceholder')} />
        <ListField mobile label={t('performance.commonMistakes')} icon={<span style={{ color: 'var(--charge-hard)', display: 'flex' }}><AlertTriangle size={20} /></span>} accent="var(--text-mid)" items={p.erreurs} onChange={v => upd({ erreurs: v })} placeholder={t('perf.customTestMistakePlaceholder')} />
        <MBlock title={t('performance.frequency')} icon={<Clock size={20} />}>
          <SoftInput value={p.frequence} onChange={v => upd({ frequence: v })} placeholder={t('perf.customTestFrequencyPlaceholder')} ariaLabel={t('performance.frequency')} />
        </MBlock>
      </MSheetFrame>
    )
  }

  return createPortal(
    <>
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000, maxHeight: 'calc(100dvh - 72px)', background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${color} 14%, transparent)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FlaskConical size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>{t('perf.createTest')}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 0' }}>{t('perf.customTestFormHint')}</p>
          </div>
          <button onClick={requestClose} aria-label={t('perf.close')} style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* Corps défilant */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 2 }} value={nom} onChange={e => setNom(e.target.value)} placeholder={t('perf.testNamePlaceholder')} />
            <input style={{ ...inp, flex: 1 }} value={unite} onChange={e => setUnite(e.target.value)} placeholder={t('perf.testUnitPlaceholder')} />
          </div>

          {/* Objectif */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{ color, display: 'grid', placeItems: 'center' }}><Target size={15} /></span>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mid)' }}>{t('performance.objective')}</span>
            </div>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} value={p.objectif} onChange={e => upd({ objectif: e.target.value })} placeholder={t('perf.customTestObjectivePlaceholder')} />
          </div>

          <ListField label={t('performance.conditions')} icon={<ListChecks size={15} />} accent="var(--text-mid)" items={p.conditions} onChange={v => upd({ conditions: v })} placeholder={t('perf.customTestConditionPlaceholder')} />
          <ListField label={t('performance.warmup')} icon={<Flame size={15} />} accent="#f59e0b" items={p.echauffement} onChange={v => upd({ echauffement: v })} placeholder={t('perf.customTestWarmupPlaceholder')} />
          <ListField label={t('performance.protocolSteps')} icon={<ListChecks size={15} />} accent={color} items={p.etapes} onChange={v => upd({ etapes: v })} placeholder={t('perf.customTestStepPlaceholder')} />
          <ListField label={t('performance.resultsInterpretation')} icon={<BookOpen size={15} />} accent="#22c55e" items={p.interpretation} onChange={v => upd({ interpretation: v })} placeholder={t('perf.customTestInterpretPlaceholder')} />
          <ListField label={t('performance.commonMistakes')} icon={<AlertTriangle size={15} />} accent="#ef4444" items={p.erreurs} onChange={v => upd({ erreurs: v })} placeholder={t('perf.customTestMistakePlaceholder')} />

          {/* Fréquence */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{ color: '#818cf8', display: 'grid', placeItems: 'center' }}><Clock size={15} /></span>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mid)' }}>{t('performance.frequency')}</span>
            </div>
            <input style={inp} value={p.frequence} onChange={e => upd({ frequence: e.target.value })} placeholder={t('perf.customTestFrequencyPlaceholder')} />
          </div>
        </div>

        {/* Pied */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={requestClose} style={{ flex: 1, padding: 11, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer' }}>{t('perf.cancel')}</button>
          <button onClick={() => void save()} disabled={!nom.trim() || busy} style={{ flex: 2, padding: 11, borderRadius: 'var(--r-sm)', background: color, border: 'none', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !nom.trim() ? 0.5 : 1 }}>{busy ? t('perf.saving') : t('perf.create')}</button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── Fiche de test : affiche le protocole (comme le catalogue) + saisie ──
function CustomTestDetail({ test, color, onClose, onSaved, mobile }: { test: CustomTest; color: string; onClose: () => void; onSaved: () => void; mobile?: boolean }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  const p = test.protocol
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }

  const save = async (close: () => void = requestClose) => {
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      const sb = createClient()
      const next: Result[] = [...(test.results ?? []), { date, value: value.trim(), note: note.trim() || undefined }]
      await sb.from('custom_tests').update({ results: next }).eq('id', test.id)
      onSaved(); close()
    } finally { setBusy(false) }
  }
  const hist = [...(test.results ?? [])].reverse()

  const Section = ({ icon, label, accent, children, tint }: { icon: React.ReactNode; label: string; accent: string; children: React.ReactNode; tint?: string }) => (
    <div style={{ padding: '13px 16px', borderRadius: 'var(--r-md)', background: tint ?? 'var(--bg-card2)', border: `1px solid ${tint ? `${accent}30` : 'var(--border)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ color: accent, display: 'grid', placeItems: 'center' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent }}>{label}</span>
      </div>
      {children}
    </div>
  )
  const Bullets = ({ items }: { items: string[] }) => (
    <ul style={{ margin: 0, padding: '0 0 0 15px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((c, i) => <li key={i} style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.55 }}>{c}</li>)}
    </ul>
  )

  // ══ MOBILE natif : protocole en cartes, saisie en champs doux, historique groupé ══
  if (mobile) {
    const ic = (node: React.ReactNode, c = 'var(--text-mid)') => <span style={{ color: c, display: 'flex' }}>{node}</span>
    const mBullets = (items: string[]) => items.map((c, i) => (
      <MRow key={i} first={i === 0} align="flex-start" style={{ minHeight: 44 }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0, marginTop: 8 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)', lineHeight: 1.45 }}>{c}</span>
      </MRow>
    ))
    return (
      <MSheetFrame zIndex={9999} title={test.nom} subtitle={t('perf.customTestBadge')} onClose={onClose} closeLabel={t('perf.close')}>
        {close => (
          <>
            {p?.objectif && <MBlock title={t('performance.objective')} icon={ic(<Target size={20} />, 'var(--primary)')}><p style={{ fontSize: 15, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{p.objectif}</p></MBlock>}
            {p?.conditions?.length ? <MBlock title={t('performance.conditions')} icon={ic(<ListChecks size={20} />)}>{mBullets(p.conditions)}</MBlock> : null}
            {p?.echauffement?.length ? <MBlock title={t('performance.warmup')} icon={ic(<Flame size={20} />)}>{mBullets(p.echauffement)}</MBlock> : null}
            {p?.etapes?.length ? (
              <MBlock title={t('performance.protocolSteps')} icon={ic(<ListChecks size={20} />)}>
                {p.etapes.map((e, i) => (
                  <MRow key={i} first={i === 0} align="flex-start">
                    <span style={{ ...NUM, width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)', lineHeight: 1.5, paddingTop: 3 }}>{e}</span>
                  </MRow>
                ))}
              </MBlock>
            ) : null}
            {p?.interpretation?.length ? (
              <MBlock title={t('performance.resultsInterpretation')} icon={ic(<BookOpen size={20} />)}>
                {p.interpretation.map((r, i) => (
                  <MRow key={i} first={i === 0} align="flex-start" style={{ minHeight: 44 }}>
                    <span aria-hidden style={{ color: 'var(--charge-low)', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>{r}</span>
                  </MRow>
                ))}
              </MBlock>
            ) : null}
            {p?.erreurs?.length ? <MBlock title={t('performance.commonMistakes')} icon={ic(<AlertTriangle size={20} />, 'var(--charge-hard)')}>{mBullets(p.erreurs)}</MBlock> : null}
            {p?.frequence ? <MBlock title={t('performance.frequency')} icon={ic(<Clock size={20} />)}><p style={{ fontSize: 15, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{p.frequence}</p></MBlock> : null}

            <MBlock title={t('perf.enterMyResult')} icon={ic(<Save size={20} />)}>
              <MField label={t('perf.value')}>
                <SoftInput value={value} onChange={setValue} unit={test.unite} placeholder="—" ariaLabel={t('perf.value')} />
              </MField>
              <MField label={t('performance.date')}>
                <SoftInput type="date" value={date} onChange={setDate} ariaLabel={t('performance.date')} />
              </MField>
              <MField label={t('perf.noteOptional')}>
                <SoftInput value={note} onChange={setNote} placeholder={t('perf.noteOptional')} ariaLabel={t('perf.noteOptional')} />
              </MField>
              <PillButton onClick={() => void save(close)} disabled={!value.trim() || busy}>{busy ? t('perf.saving') : t('perf.saveValue')}</PillButton>
            </MBlock>

            {hist.length > 0 && (
              <MBlock title={t('perf.history')}>
                {hist.map((r, i) => (
                  <MRow key={i} first={i === 0}>
                    <span style={{ ...NUM, fontSize: 13, color: 'var(--text-mid)', minWidth: 84 }}>{r.date}</span>
                    <span style={{ ...NUM, flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{r.value}{test.unite ? ` ${test.unite}` : ''}</span>
                    {r.note && <span style={{ fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>{r.note}</span>}
                  </MRow>
                ))}
              </MBlock>
            )}
          </>
        )}
      </MSheetFrame>
    )
  }

  return createPortal(
    <>
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000, maxHeight: 'calc(100dvh - 72px)', background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '18px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${color} 14%, transparent)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FlaskConical size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>{test.nom}</h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{t('perf.customTestBadge')}</p>
          </div>
          <button onClick={requestClose} aria-label={t('perf.close')} style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {p?.objectif && (
            <Section icon={<Target size={15} />} label={t('performance.objective')} accent={color} tint={`${color}0d`}>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>{p.objectif}</p>
            </Section>
          )}
          {(p?.conditions?.length || p?.echauffement?.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {p?.conditions?.length ? <Section icon={<ListChecks size={15} />} label={t('performance.conditions')} accent="var(--text-mid)"><Bullets items={p.conditions} /></Section> : <div />}
              {p?.echauffement?.length ? <Section icon={<Flame size={15} />} label={t('performance.warmup')} accent="#f59e0b"><Bullets items={p.echauffement} /></Section> : <div />}
            </div>
          ) : null}
          {p?.etapes?.length ? (
            <Section icon={<ListChecks size={15} />} label={t('performance.protocolSteps')} accent={color}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.etapes.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, color, width: 18, flexShrink: 0, paddingTop: 2 }}>{i + 1}.</span>
                    <p style={{ fontSize: 12.5, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{e}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
          {p?.interpretation?.length ? (
            <Section icon={<BookOpen size={15} />} label={t('performance.resultsInterpretation')} accent="#22c55e" tint="rgba(34,197,94,0.06)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.interpretation.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e', fontSize: 12, flexShrink: 0, paddingTop: 1 }}>→</span>
                    <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: 0, lineHeight: 1.55 }}>{r}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
          {(p?.erreurs?.length || p?.frequence) ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {p?.erreurs?.length ? <Section icon={<AlertTriangle size={15} />} label={t('performance.commonMistakes')} accent="#ef4444" tint="rgba(239,68,68,0.06)"><Bullets items={p.erreurs} /></Section> : <div />}
              {p?.frequence ? <Section icon={<Clock size={15} />} label={t('performance.frequency')} accent="#818cf8" tint="rgba(99,102,241,0.07)"><p style={{ fontSize: 12, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>{p.frequence}</p></Section> : <div />}
            </div>
          ) : null}

          {/* Saisie d'un résultat */}
          <Section icon={<Save size={15} />} label={t('perf.enterMyResult')} accent={color} tint={`${color}0d`}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input style={{ ...inp, flex: 2 }} value={value} onChange={e => setValue(e.target.value)} placeholder={`${t('perf.value')}${test.unite ? ` (${test.unite})` : ''}`} />
              <input type="date" style={{ ...inp, flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <input style={{ ...inp, marginBottom: 10 }} value={note} onChange={e => setNote(e.target.value)} placeholder={t('perf.noteOptional')} />
            <button onClick={() => void save()} disabled={!value.trim() || busy} style={{ width: '100%', padding: 10, borderRadius: 'var(--r-sm)', background: color, border: 'none', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !value.trim() ? 0.5 : 1 }}>{t('perf.saveValue')}</button>

            {hist.length > 0 && (
              <div style={{ marginTop: 14 }}>
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
          </Section>
        </div>
      </div>
    </>,
    document.body,
  )
}
