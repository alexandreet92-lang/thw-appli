'use client'
// ══════════════════════════════════════════════════════════════════
// CADENCES — résultats d'une campagne (client). G1 donut, G3 anneaux,
// G5 barres par épreuve, détail chiffré, bascule barème général ⇄ âge.
// SVG brut, palette de niveaux sanctionnée. Lecture seule.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { CONFIG, QUALITIES } from '@/lib/cadences/catalog'
import { levelFor } from '@/lib/cadences/engine'
import { formatValue } from '@/lib/cadences/format'
import type { Mode, QualityKey, QualityScore, TestScore } from '@/lib/cadences/types'
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
  completed_on: string | null
  status: string
}
export interface Snapshot {
  age_mode: Mode
  total_points: number
  quality_scores: Record<QualityKey, QualityScore>
  test_scores: Record<string, TestScore>
}
export interface RawResult { test_slug: string; raw_value: number | null; status: string }

export function ResultsView({ campagne, snapshots, results }: { campagne: Campagne; snapshots: Snapshot[]; results: RawResult[] }) {
  const [mode, setMode] = useState<Mode>('general')
  const snap = useMemo(() => snapshots.find((s) => s.age_mode === mode) ?? snapshots[0], [snapshots, mode])
  const rawBySlug = useMemo(() => {
    const m: Record<string, number | null> = {}
    for (const r of results) m[r.test_slug] = r.raw_value
    return m
  }, [results])

  if (!snap) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Résultats CADENCES</h1>
        <p style={muted}>Aucun score figé pour cette campagne.</p>
        <Link href="/cadences" style={lien}>← Accueil CADENCES</Link>
      </main>
    )
  }

  const total = snap.total_points
  const globalLevel = levelFor(total / CONFIG.total_points, CONFIG)
  const qualityItems: QualityItem[] = QUALITIES.map((q) => ({
    key: q.key, label: q.label,
    pct: snap.quality_scores[q.key]?.pct ?? 0,
    level: snap.quality_scores[q.key]?.level ?? 'Faible',
  }))
  // G5 : épreuves triées force → faiblesse (par %).
  const tests = CONFIG.tests
    .filter((t) => snap.test_scores[t.slug])
    .sort((a, b) => (snap.test_scores[b.slug]!.pct) - (snap.test_scores[a.slug]!.pct))

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Résultats</span>
          <h1 style={h1}>CADENCES</h1>
        </div>
        <Link href="/cadences" style={lien}>← Accueil</Link>
      </div>
      <p style={muted}>
        {campagne.completed_on ? `Clôturé le ${frDate(campagne.completed_on)}` : `Démarré le ${frDate(campagne.started_on)}`}
        {' '}· barème {campagne.scale_sex === 'M' ? 'homme' : 'femme'} · {campagne.age_at_start} ans · {Math.round(campagne.body_weight_kg)} kg.
      </p>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <ModeToggle mode={mode} onChange={setMode} />
        <span style={{ ...muted, marginLeft: 'var(--space-3)' }}>
          {mode === 'general' ? 'Barème général (21–35 ans).' : `Barème ajusté à l’âge (tranche ${campagne.age_band}).`}
        </span>
      </div>

      {/* G1 + G3 */}
      <section style={{ ...card, marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'minmax(190px, 230px) 1fr', gap: 'var(--space-6)', alignItems: 'center' }}>
        <ScoreDonut total={total} level={globalLevel} size={200} />
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>Par qualité</div>
          <QualityRings items={qualityItems} />
        </div>
      </section>

      {/* G5 — barres par épreuve */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={h2}>Détail par épreuve</h2>
        <p style={muted}>De ton point fort à ton point faible. Repère à 60 % (Référence) et 100 % (Max).</p>
        <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          {tests.map((t) => {
            const s = snap.test_scores[t.slug]!
            const raw = rawBySlug[t.slug]
            return (
              <div key={t.slug} style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
                    {raw != null ? formatValue(t, raw) + ' · ' : ''}{Math.round(s.points)} / {t.pts_max} pts
                  </span>
                </div>
                <TestBar pct={s.pct} level={s.level} />
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: levelColor(s.level) }}>{s.level} · {Math.round(s.pct * 100)} %</div>
              </div>
            )
          })}
        </div>
      </section>

      <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link href="/cadences" style={lien}>← Mes passages</Link>
        <Link href="/cadences/methode" style={lien}>Comprendre le barème</Link>
      </div>
    </main>
  )
}

/** Barre points/%, graduée 0→Max. SVG brut (pas de lib). */
function TestBar({ pct, level }: { pct: number; level: string }) {
  const w = Math.max(0, Math.min(100, pct * 100)) // largeur capée à 100 pour la barre
  const col = levelColor(level)
  return (
    <svg width="100%" height={12} viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label={`${Math.round(pct * 100)} %`}>
      <rect x={0} y={3} width={100} height={6} rx={3} fill="var(--border)" />
      <rect x={0} y={3} width={w} height={6} rx={3} fill={col} />
      {/* repères Référence (60 %) et Max (100 %) */}
      <line x1={60} y1={1} x2={60} y2={11} stroke="var(--border-mid)" strokeWidth={0.6} />
      <line x1={99.5} y1={1} x2={99.5} y2={11} stroke="var(--border-mid)" strokeWidth={0.6} />
    </svg>
  )
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2 }}>
      {(['general', 'age'] as const).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)} aria-pressed={mode === m}
          style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', border: 'none', borderRadius: 'calc(var(--r-md) - 2px)', cursor: 'pointer', color: mode === m ? 'var(--on-primary)' : 'var(--text-mid)', background: mode === m ? 'var(--primary)' : 'transparent' }}>
          {m === 'general' ? 'Général' : 'Ajusté à l’âge'}
        </button>
      ))}
    </div>
  )
}

function frDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

const wrap: CSSProperties = { maxWidth: 860, margin: '0 auto', padding: 'var(--space-6) var(--space-5) var(--space-10)' }
const h1: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 600, margin: 'var(--space-1) 0 0' }
const h2: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }
const muted: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)', margin: '6px 0 0' }
const lien: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', textDecoration: 'none' }
const card: CSSProperties = { background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)' }
