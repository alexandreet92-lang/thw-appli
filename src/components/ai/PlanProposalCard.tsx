'use client'

// ══════════════════════════════════════════════════════════════
// PlanProposalCard — aperçu d'un plan AVANT enregistrement.
//
// Le coach génère le plan (à partir des données réelles), le présente
// ici : phases de périodisation, volumes (début / fin / max), 2 premières
// semaines détaillées, logique. L'athlète valide → seulement alors le
// plan est écrit dans le Planning.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'

export interface GenBloc {
  nom: string; type: string; semaine_debut: number; semaine_fin: number
  description?: string; volume_hebdo_h?: number
}
export interface GenSession {
  jour?: number; sport?: string; titre?: string; duree_min?: number
  tss?: number; intensite?: string; heure?: string; notes?: string; rpe?: number
  blocs?: { nom?: string; duree_min?: number; zone?: number; repetitions?: number; recup_min?: number; watts?: number | null; allure?: string | null; consigne?: string }[]
}
export interface GenWeek {
  numero?: number; type?: string; volume_h?: number; theme?: string
  note_coach?: string; seances?: GenSession[]
}
export interface GenProgram {
  nom?: string; objectif_principal?: string; duree_semaines?: number
  methodologie?: string
  blocs_periodisation?: GenBloc[]; semaines?: GenWeek[]
  conseils_adaptation?: string[]; points_cles?: string[]
}
export interface PlanRequirements {
  name?: string; objectif_principal?: string; sport_principal?: string
  niveau?: string; duree_semaines?: number; start_date?: string
  seances_par_semaine?: number; date_objectif?: string; type_competition?: string
  requirements_resume?: string; methode?: string; methodologie?: string
}
export interface PlanProposal {
  status: 'generating' | 'ready' | 'error' | 'validated'
  requirements: PlanRequirements
  program?: GenProgram
  error?: string
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SPORTS: Record<string, string> = { run: 'Course', bike: 'Vélo', swim: 'Natation', hyrox: 'Hyrox', rowing: 'Aviron', gym: 'Muscu' }
const sportLabel = (s?: string) => SPORTS[(s ?? '').toLowerCase()] ?? (s ?? '')
const weekVol = (w: GenWeek) => w.volume_h ?? Math.round((w.seances ?? []).reduce((a, s) => a + (s.duree_min ?? 0), 0) / 6) / 10

export function PlanProposalCard({
  proposal,
  onValidate,
  onCancel,
}: {
  proposal: PlanProposal
  onValidate: () => void
  onCancel: () => void
}) {
  const [openWeek, setOpenWeek] = useState<number | null>(1)

  // ── États transitoires ──────────────────────────────────────
  if (proposal.status === 'generating') {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={spinner} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ai-text)' }}>Je construis ton plan…</p>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ai-dim)' }}>Analyse de tes données, zones et historique (20-40 s).</p>
          </div>
        </div>
        <style>{`@keyframes pp_spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (proposal.status === 'error') {
    return (
      <div style={card}>
        <p style={{ margin: 0, fontSize: 12.5, color: '#ef4444' }}>{proposal.error ?? 'La génération a échoué.'}</p>
        <button onClick={onCancel} style={ghostBtn}>Fermer</button>
      </div>
    )
  }

  const prog = proposal.program ?? {}
  const weeks = prog.semaines ?? []
  const blocs = prog.blocs_periodisation ?? []
  const vols = weeks.map(weekVol).filter(v => v > 0)
  const vStart = vols[0]
  const vEnd = vols[vols.length - 1]
  const vMax = vols.length ? Math.max(...vols) : undefined
  const previewWeeks = weeks.filter(w => (w.numero ?? 99) <= 2)
  const validated = proposal.status === 'validated'

  return (
    <div style={card}>
      {/* Titre */}
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
        {prog.nom ?? proposal.requirements.name ?? "Plan d'entraînement"}
      </p>
      {(prog.objectif_principal ?? proposal.requirements.objectif_principal) && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ai-mid)' }}>{prog.objectif_principal ?? proposal.requirements.objectif_principal}</p>
      )}

      {/* Analyse du coach (méthodologie) */}
      {prog.methodologie && (
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
          <p style={sectionTitle}>L&apos;analyse du coach</p>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ai-text)', lineHeight: 1.5 }}>{prog.methodologie}</p>
        </div>
      )}

      {/* Volumes */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[
          { l: 'Début', v: vStart !== undefined ? `${vStart}h` : '—' },
          { l: 'Fin', v: vEnd !== undefined ? `${vEnd}h` : '—' },
          { l: 'Max/sem', v: vMax !== undefined ? `${vMax}h` : '—' },
          { l: 'Durée', v: `${prog.duree_semaines ?? weeks.length} sem` },
        ].map(k => (
          <div key={k.l} style={kpi}>
            <p style={kpiL}>{k.l}</p>
            <p style={kpiV}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Phases de périodisation */}
      {blocs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>Phases jusqu&apos;à l&apos;objectif</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blocs.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ ...phaseDot, background: phaseColor(b.type) }} />
                <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>{b.nom}</span>
                <span style={{ color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace', fontSize: 11 }}>
                  S{b.semaine_debut}–{b.semaine_fin}{b.volume_hebdo_h ? ` · ${b.volume_hebdo_h}h` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 premières semaines détaillées */}
      {previewWeeks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>Les 2 premières semaines</p>
          {previewWeeks.map(w => {
            const num = w.numero ?? 0
            const open = openWeek === num
            return (
              <div key={num} style={{ border: '1px solid var(--ai-border)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
                <button onClick={() => setOpenWeek(open ? null : num)} style={weekHead}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ai-text)' }}>Semaine {num}{w.type ? ` · ${w.type}` : ''}</span>
                  <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{weekVol(w)}h · {(w.seances ?? []).length} séances {open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div style={{ padding: '0 10px 8px' }}>
                    {w.note_coach && <p style={{ margin: '0 0 7px', fontSize: 11.5, color: 'var(--ai-mid)', fontStyle: 'italic' }}>{w.note_coach}</p>}
                    {(w.seances ?? []).map((s, j) => (
                      <div key={j} style={{ padding: '6px 0', borderTop: j ? '1px solid var(--ai-border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                          <span style={dayChip}>{DAYS[s.jour ?? 0]}</span>
                          <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>{s.titre}</span>
                          <span style={{ marginLeft: 'auto', color: 'var(--ai-dim)', fontSize: 11, fontFamily: 'DM Mono,monospace' }}>
                            {sportLabel(s.sport)} · {s.duree_min}′
                          </span>
                        </div>
                        {(s.blocs ?? []).length > 0 && (
                          <div style={{ marginTop: 3, paddingLeft: 4 }}>
                            {(s.blocs ?? []).map((bl, k) => (
                              <p key={k} style={{ margin: '1px 0', fontSize: 11, color: 'var(--ai-mid)' }}>
                                • {bl.nom}{bl.duree_min ? ` ${bl.duree_min}′` : ''}{bl.repetitions ? ` ×${bl.repetitions}` : ''}{bl.zone ? ` Z${bl.zone}` : ''}{bl.watts ? ` ${bl.watts}W` : ''}{bl.allure ? ` ${bl.allure}` : ''}{bl.consigne ? ` — ${bl.consigne}` : ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Logique / conseils */}
      {(prog.points_cles?.length || prog.conseils_adaptation?.length) ? (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>La logique</p>
          {(prog.points_cles ?? []).map((p, i) => (
            <p key={`k${i}`} style={bullet}>• {p}</p>
          ))}
          {(prog.conseils_adaptation ?? []).map((c, i) => (
            <p key={`c${i}`} style={{ ...bullet, color: 'var(--ai-mid)' }}>→ {c}</p>
          ))}
        </div>
      ) : null}

      {/* Actions */}
      {validated ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 12.5, fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          Ajouté au planning
        </div>
      ) : (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>Annuler</button>
          <button onClick={onValidate} style={primaryBtn}>
            Valider et ajouter au planning
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const card: React.CSSProperties = { border: '1px solid var(--ai-border)', borderRadius: 16, padding: 14, background: 'var(--ai-bg)', marginTop: 4 }
const sectionTitle: React.CSSProperties = { margin: '0 0 6px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif' }
const kpi: React.CSSProperties = { flex: 1, padding: '6px 3px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', textAlign: 'center' }
const kpiL: React.CSSProperties = { margin: 0, fontSize: 8, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }
const kpiV: React.CSSProperties = { margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }
const phaseDot: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }
const dayChip: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, color: 'var(--ai-mid)', background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 5, padding: '2px 5px', minWidth: 30, textAlign: 'center' }
const weekHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', border: 'none', background: 'var(--ai-bg2)', cursor: 'pointer' }
const bullet: React.CSSProperties = { margin: '2px 0', fontSize: 12, color: 'var(--ai-text)', lineHeight: 1.4 }
const ghostBtn: React.CSSProperties = { padding: '9px 14px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', padding: '10px 16px', borderRadius: 10, border: 'none', background: '#3C90D5', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif', boxShadow: '0 3px 10px rgba(60,144,213,0.34)' }
const spinner: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', border: '2.5px solid var(--ai-border)', borderTopColor: '#3C90D5', animation: 'pp_spin 0.7s linear infinite', flexShrink: 0 }

function phaseColor(type: string): string {
  const t = (type ?? '').toLowerCase()
  if (t.includes('base')) return '#22c55e'
  if (t.includes('intens')) return '#f97316'
  if (t.includes('spéc') || t.includes('spec')) return '#3C90D5'
  if (t.includes('deload') || t.includes('affût') || t.includes('affut')) return '#a855f7'
  if (t.includes('comp')) return '#ef4444'
  return '#9ca3af'
}
