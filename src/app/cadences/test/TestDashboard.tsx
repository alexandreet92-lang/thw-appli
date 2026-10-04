'use client'
// ══════════════════════════════════════════════════════════════════
// CADENCES — tableau de bord du parcours (client). Frise J1→J12, saisie
// terrain par épreuve (protocole + dérivées + sélecteurs), score partiel
// EN DIRECT (moteur client), clôture. Saisie SITE uniquement (API cookie).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DAYS, testsOfDay, CONFIG, QUALITIES, TOTAL_TESTS } from '@/lib/cadences/catalog'
import { computeCampaign, aggregateParts } from '@/lib/cadences/engine'
import type { TestConfig, TestInput, Mode } from '@/lib/cadences/types'
import { parseDuration, derivedData } from '@/lib/cadences/format'
import { protocolFor, ECHAUFFEMENT_GENERAL } from '@/lib/cadences/protocols'
import { ScoreDonut } from '@/components/cadences/ScoreDonut'
import { QualityRings, type QualityItem } from '@/components/cadences/QualityRings'
import { levelColor } from '@/lib/cadences/palette'

export interface Campagne {
  id: string
  scale_sex: 'M' | 'F'
  age_at_start: number
  age_band: string
  body_weight_kg: number
  started_on: string
  status: string
}
export interface ResultRow {
  test_slug: string
  raw_value: number | null
  raw_parts: number[] | null
  variant: string | null
  equipment: string | null
  timing_method: string | null
  pool_length_m: number | null
  status: 'draft' | 'validated' | 'skipped'
  skip_reason: string | null
}

interface Draft {
  parts: string[]
  partialReps: string
  equipment: string | null
  timing: string | null
  pool: number | null
  variant: string | null
}

// ── Helpers de saisie ───────────────────────────────────────────────
function partCount(t: TestConfig): number {
  if (t.slug === 'amrap_20min') return 1
  return t.attempts && t.attempts > 1 ? t.attempts : 1
}
function parsePart(t: TestConfig, s: string): number | null {
  if (!s.trim()) return null
  if (t.unit === 's') return parseDuration(s)
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
/** Valeur agrégée prête pour le moteur (avant équipement / ratio). */
function aggregateDraft(t: TestConfig, d: Draft): number | null {
  if (t.slug === 'amrap_20min') {
    const tours = Number(d.parts[0])
    if (!Number.isFinite(tours) || !d.parts[0]?.trim()) return null
    const partial = Number(d.partialReps || 0)
    return tours + (Number.isFinite(partial) ? partial : 0) / 35
  }
  const parsed = d.parts.map((p) => parsePart(t, p)).filter((v): v is number => v != null)
  if (!parsed.length) return null
  if (partCount(t) === 1) return parsed[0]
  return aggregateParts(t, parsed)
}
function equipKind(t: TestConfig): 'chaussures' | 'ceinture' | null {
  if (t.equipment?.field === 'chaussures') return 'chaussures'
  if (t.equipment?.field === 'ceinture') return 'ceinture'
  return null
}
const TRACK = new Set(['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m'])
const SWIM = new Set(['swim_50m', 'swim_200m'])

function emptyDraft(t: TestConfig): Draft {
  const k = equipKind(t)
  return {
    parts: Array(partCount(t)).fill(''),
    partialReps: '',
    equipment: k === 'chaussures' ? 'normales' : k === 'ceinture' ? 'sans' : null,
    timing: TRACK.has(t.slug) ? 'manuel' : null,
    pool: SWIM.has(t.slug) ? 25 : null,
    variant: t.slug === 'hyrox_circuit' ? 'box' : null,
  }
}
function draftFromRow(t: TestConfig, r: ResultRow): Draft {
  const base = emptyDraft(t)
  const parts = r.raw_parts && r.raw_parts.length
    ? r.raw_parts.map((n) => String(n))
    : r.raw_value != null ? [String(r.raw_value)] : base.parts
  return {
    parts: t.slug === 'amrap_20min' ? [parts[0] ?? ''] : padParts(parts, partCount(t)),
    partialReps: t.slug === 'amrap_20min' ? (parts[1] ?? '') : '',
    equipment: r.equipment ?? base.equipment,
    timing: r.timing_method ?? base.timing,
    pool: r.pool_length_m ?? base.pool,
    variant: r.variant ?? base.variant,
  }
}
function padParts(a: string[], n: number): string[] {
  const out = a.slice(0, n)
  while (out.length < n) out.push('')
  return out
}

export function TestDashboard({ campagne, results }: { campagne: Campagne; results: ResultRow[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('general')
  const [closing, setClosing] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const [rows, setRows] = useState<Record<string, ResultRow>>(() => {
    const m: Record<string, ResultRow> = {}
    for (const r of results) m[r.test_slug] = r
    return m
  })
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const m: Record<string, Draft> = {}
    for (const t of CONFIG.tests) {
      const r = results.find((x) => x.test_slug === t.slug)
      m[t.slug] = r ? draftFromRow(t, r) : emptyDraft(t)
    }
    return m
  })

  const profile = useMemo(
    () => ({ sex: campagne.scale_sex, bodyWeightKg: campagne.body_weight_kg, ageBand: campagne.age_band }),
    [campagne],
  )
  const score = useMemo(() => {
    const inputs: TestInput[] = Object.values(rows)
      .filter((r) => r.status === 'validated' && r.raw_value != null)
      .map((r) => ({ slug: r.test_slug, value: Number(r.raw_value), equipment: r.equipment }))
    return computeCampaign(inputs, profile, mode, CONFIG)
  }, [rows, profile, mode])

  const validatedCount = Object.values(rows).filter((r) => r.status === 'validated').length
  const qualityItems: QualityItem[] = QUALITIES.map((q) => ({
    key: q.key, label: q.label,
    pct: score.byQuality[q.key]?.pct ?? 0,
    level: score.byQuality[q.key]?.level ?? 'Faible',
  }))

  function setDraft(slug: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [slug]: { ...d[slug], ...patch } }))
  }

  async function validate(t: TestConfig) {
    setErreur(null)
    const d = drafts[t.slug]
    const value = aggregateDraft(t, d)
    if (value == null || value <= 0) { setErreur(`${t.name} : saisis une valeur valide.`); return }
    if ((t.aggregate === 'sum') && d.parts.some((p) => !p.trim())) {
      setErreur(`${t.name} : renseigne les ${partCount(t)} passages.`); return
    }
    const rawParts = t.slug === 'amrap_20min'
      ? [Number(d.parts[0]), Number(d.partialReps || 0)]
      : partCount(t) > 1 ? d.parts.map((p) => parsePart(t, p)).filter((v): v is number => v != null) : null
    const payload = {
      campaignId: campagne.id, slug: t.slug, value, rawParts, status: 'validated',
      equipment: d.equipment, variant: d.variant, timingMethod: d.timing, poolLength: d.pool,
    }
    const ok = await put(payload)
    if (!ok) return
    setRows((m) => ({
      ...m,
      [t.slug]: {
        test_slug: t.slug, raw_value: value, raw_parts: rawParts, variant: d.variant,
        equipment: d.equipment, timing_method: d.timing, pool_length_m: d.pool,
        status: 'validated', skip_reason: null,
      },
    }))
  }

  async function skip(t: TestConfig, reason: string) {
    setErreur(null)
    const ok = await put({ campaignId: campagne.id, slug: t.slug, status: 'skipped', skipReason: reason })
    if (!ok) return
    setRows((m) => ({
      ...m,
      [t.slug]: {
        test_slug: t.slug, raw_value: null, raw_parts: null, variant: null, equipment: null,
        timing_method: null, pool_length_m: null, status: 'skipped', skip_reason: reason || null,
      },
    }))
  }

  async function clear(t: TestConfig) {
    setErreur(null)
    const r = await fetch('/api/cadences/result', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaignId: campagne.id, slug: t.slug }),
    })
    if (!r.ok) { setErreur('Impossible d’effacer.'); return }
    setRows((m) => { const n = { ...m }; delete n[t.slug]; return n })
    setDrafts((d) => ({ ...d, [t.slug]: emptyDraft(t) }))
  }

  async function put(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await fetch('/api/cadences/result', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setErreur(j?.erreur ?? 'Enregistrement impossible.')
        return false
      }
      return true
    } catch { setErreur('Erreur réseau.'); return false }
  }

  async function cloturer() {
    if (!confirm('Clôturer le test ? Les saisies seront figées et ton score définitif calculé.')) return
    setClosing(true); setErreur(null)
    try {
      const r = await fetch('/api/cadences/campaign/close', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: campagne.id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErreur(j?.erreur ?? 'Clôture impossible.'); setClosing(false); return }
      router.push(`/cadences/resultats/${campagne.id}`)
    } catch { setErreur('Erreur réseau.'); setClosing(false) }
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 'var(--space-6) var(--space-5) var(--space-10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 600, margin: 0 }}>Mon test CADENCES</h1>
        <Link href="/cadences" style={lien}>← Accueil</Link>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0' }}>
        Barème {campagne.scale_sex === 'M' ? 'homme' : 'femme'} · {campagne.age_at_start} ans · {Math.round(campagne.body_weight_kg)} kg.
        Saisis chaque épreuve dès qu’elle est faite ; tu peux corriger jusqu’à la clôture.
      </p>

      {/* Score partiel en direct */}
      <section style={{ ...card, marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Où j’en suis</div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 'var(--space-5)', alignItems: 'center' }}>
          <ScoreDonut total={score.total} level={score.globalLevel} size={180} />
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>
              {validatedCount} / {TOTAL_TESTS} épreuves validées. Score indicatif tant que des épreuves manquent.
            </div>
            <QualityRings items={qualityItems} />
          </div>
        </div>
        {validatedCount > 0 ? (
          <button type="button" onClick={cloturer} disabled={closing} style={{ ...cta, justifySelf: 'start', opacity: closing ? 0.6 : 1 }}>
            {closing ? 'Clôture…' : 'Clôturer mon test'}
          </button>
        ) : null}
        {erreur ? <div role="alert" style={alerte}>{erreur}</div> : null}
      </section>

      {/* Frise J1→J12 */}
      <nav aria-label="Jours du test" style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', padding: 'var(--space-4) 0', WebkitOverflowScrolling: 'touch' }}>
        {DAYS.map((d) => {
          const tests = testsOfDay(d.day)
          const done = tests.filter((t) => rows[t.slug]?.status === 'validated').length
          return (
            <a key={d.day} href={d.rest ? undefined : `#jour-${d.day}`} style={jourChip(d.rest)}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)' }}>J{d.day}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.label}</span>
              {d.rest ? null : (
                <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: done === tests.length ? levelColor('Solide') : 'var(--text-mid)' }}>
                  {done}/{tests.length}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-mid)', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)' }}>
        <strong style={{ color: 'var(--text)' }}>Échauffement général.</strong> {ECHAUFFEMENT_GENERAL}
      </p>

      {/* Jours */}
      <div style={{ display: 'grid', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        {DAYS.map((d) => (
          <section key={d.day} id={`jour-${d.day}`} style={{ scrollMarginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Jour {d.day}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>{d.label}</span>
            </div>
            {d.rest ? (
              <div style={{ ...card, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                Jour de repos — fait partie du protocole. Pas d’épreuve.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {testsOfDay(d.day).map((t) => (
                  <TestCard key={t.slug} t={t} draft={drafts[t.slug]} row={rows[t.slug]}
                    bodyWeightKg={campagne.body_weight_kg}
                    points={score.byTest[t.slug]?.points} level={score.byTest[t.slug]?.level}
                    setDraft={(p) => setDraft(t.slug, p)}
                    onValidate={() => validate(t)} onSkip={(reason) => skip(t, reason)} onClear={() => clear(t)} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}

// ── Carte d'une épreuve ───────────────────────────────────────────────
function TestCard({
  t, draft, row, bodyWeightKg, points, level, setDraft, onValidate, onSkip, onClear,
}: {
  t: TestConfig; draft: Draft; row?: ResultRow; bodyWeightKg: number
  points?: number; level?: string
  setDraft: (p: Partial<Draft>) => void
  onValidate: () => void; onSkip: (reason: string) => void; onClear: () => void
}) {
  const [showProto, setShowProto] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState('')
  const proto = protocolFor(t.slug)
  const n = partCount(t)
  const k = equipKind(t)

  const aggForDerived = aggregateDraft(t, draft)
  const derived = aggForDerived != null ? derivedData(t, aggForDerived, bodyWeightKg) : []

  const validated = row?.status === 'validated'
  const skipped = row?.status === 'skipped'

  return (
    <div style={{ ...card, borderColor: validated ? levelColor(level ?? '') : 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{t.name}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {t.group} · {t.pts_max} pts max{proto?.flag ? ' · protocole en relecture' : ''}
          </div>
        </div>
        {validated ? (
          <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: levelColor(level ?? ''), whiteSpace: 'nowrap' }}>
            {Math.round(points ?? 0)} pts · {level}
          </span>
        ) : skipped ? (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)' }}>Non passée</span>
        ) : null}
      </div>

      {proto ? (
        <>
          <button type="button" onClick={() => setShowProto((s) => !s)} style={lienBtn}>
            {showProto ? 'Masquer le protocole' : 'Voir le protocole'}
          </button>
          {showProto ? (
            <div style={{ display: 'grid', gap: 6, fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-mid)', borderLeft: '2px solid var(--border-mid)', paddingLeft: 'var(--space-3)' }}>
              <div><strong style={{ color: 'var(--text)' }}>Objectif.</strong> {proto.objectif}</div>
              <div><strong style={{ color: 'var(--text)' }}>Matériel.</strong> {proto.materiel.join(', ')}.</div>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 2 }}>
                {proto.etapes.map((e, i) => <li key={i}>{e}</li>)}
              </ol>
              {proto.securite ? <div><strong style={{ color: 'var(--text)' }}>Sécurité.</strong> {proto.securite}</div> : null}
              <div><strong style={{ color: 'var(--text)' }}>À saisir.</strong> {proto.saisie}</div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Saisie */}
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: n > 1 ? 'repeat(auto-fit, minmax(84px, 1fr))' : '1fr', gap: 'var(--space-2)' }}>
          {Array.from({ length: n }).map((_, i) => (
            <div key={i}>
              {n > 1 ? <div style={partLabel}>{t.aggregate === 'sum' ? `Passage ${i + 1}` : `Essai ${i + 1}`}</div> : null}
              <input value={draft.parts[i] ?? ''} inputMode={t.unit === 's' ? 'text' : 'decimal'}
                placeholder={placeholder(t)} aria-label={`${t.name} valeur ${i + 1}`}
                onChange={(e) => { const parts = [...draft.parts]; parts[i] = e.target.value; setDraft({ parts }) }}
                style={input} />
            </div>
          ))}
        </div>

        {t.slug === 'amrap_20min' ? (
          <div>
            <div style={partLabel}>Répétitions du tour en cours (optionnel)</div>
            <input value={draft.partialReps} inputMode="numeric" placeholder="ex. 12"
              onChange={(e) => setDraft({ partialReps: e.target.value })} style={input} aria-label="Répétitions partielles" />
          </div>
        ) : null}

        {/* Sélecteurs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {k === 'chaussures' ? (
            <Select label="Chaussures" value={draft.equipment ?? 'normales'} onChange={(v) => setDraft({ equipment: v })}
              options={[['normales', 'Normales'], ['pointes', 'Pointes']]} />
          ) : null}
          {k === 'ceinture' ? (
            <Select label="Ceinture" value={draft.equipment ?? 'sans'} onChange={(v) => setDraft({ equipment: v })}
              options={[['sans', 'Sans'], ['ceinture', 'Avec ceinture']]} />
          ) : null}
          {TRACK.has(t.slug) ? (
            <Select label="Chrono" value={draft.timing ?? 'manuel'} onChange={(v) => setDraft({ timing: v })}
              options={[['manuel', 'Manuel'], ['cellules', 'Cellules'], ['montre', 'Montre']]} />
          ) : null}
          {SWIM.has(t.slug) ? (
            <Select label="Bassin" value={String(draft.pool ?? 25)} onChange={(v) => setDraft({ pool: Number(v) })}
              options={[['25', '25 m'], ['50', '50 m']]} />
          ) : null}
          {t.slug === 'hyrox_circuit' ? (
            <Select label="Burpee" value={draft.variant ?? 'box'} onChange={(v) => setDraft({ variant: v })}
              options={[['box', 'Box jump'], ['plate', 'To plate']]} />
          ) : null}
        </div>

        {derived.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
            {derived.map((dd, i) => (
              <span key={i} style={{ color: 'var(--text-mid)' }}>
                {dd.label} : <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{dd.value}</strong>
              </span>
            ))}
          </div>
        ) : null}

        {/* Actions */}
        {skipping ? (
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <input value={skipReason} placeholder="Pourquoi non passée ? (blessure, matériel…)"
              onChange={(e) => setSkipReason(e.target.value)} style={input} aria-label="Motif" />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" onClick={() => { onSkip(skipReason); setSkipping(false) }} style={btnGhost}>Confirmer « non passée »</button>
              <button type="button" onClick={() => setSkipping(false)} style={btnGhost}>Annuler</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" onClick={onValidate} style={btnValider}>{validated ? 'Mettre à jour' : 'Valider'}</button>
            {!validated && !skipped ? <button type="button" onClick={() => setSkipping(true)} style={btnGhost}>Passer</button> : null}
            {validated || skipped ? <button type="button" onClick={onClear} style={btnGhost}>Effacer</button> : null}
          </div>
        )}
      </div>
    </div>
  )
}

function placeholder(t: TestConfig): string {
  switch (t.unit) {
    case 's': return 'm:ss ou s'
    case 'm': return 'mètres'
    case 'kg': return 'kg'
    case 'W': return 'watts'
    case 'tours': return 'nombre de tours'
    default: return ''
  }
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2 }}>
      {(['general', 'age'] as const).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)} aria-pressed={mode === m}
          style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, padding: '6px 12px', border: 'none', borderRadius: 'calc(var(--r-md) - 2px)', cursor: 'pointer', color: mode === m ? 'var(--on-primary)' : 'var(--text-mid)', background: mode === m ? 'var(--primary)' : 'transparent' }}>
          {m === 'general' ? 'Général' : 'Ajusté à l’âge'}
        </button>
      ))}
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label style={{ display: 'grid', gap: 3 }}>
      <span style={partLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: 'var(--font-body)', fontSize: 13, padding: '8px 10px', color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)' }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

// ── Styles ────────────────────────────────────────────────────────────
const card: CSSProperties = { background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 16, color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)' }
const partLabel: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }
const cta: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--on-primary)', background: 'var(--primary)', border: 'none', borderRadius: 'var(--r-md)', padding: '11px 18px', cursor: 'pointer' }
const btnValider: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--on-primary)', background: 'var(--primary)', border: 'none', borderRadius: 'var(--r-sm)', padding: '9px 16px', cursor: 'pointer' }
const btnGhost: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '9px 14px', cursor: 'pointer' }
const lien: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', textDecoration: 'none' }
const lienBtn: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', justifySelf: 'start' }
const alerte: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', background: 'var(--primary-dim)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '10px 12px' }

function jourChip(rest: boolean): CSSProperties {
  return {
    display: 'grid', gap: 2, placeItems: 'center', minWidth: 92, padding: '8px 10px',
    background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
    textDecoration: 'none', color: 'var(--text)', opacity: rest ? 0.55 : 1, cursor: rest ? 'default' : 'pointer',
  }
}
