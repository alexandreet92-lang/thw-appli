'use client'

// ══════════════════════════════════════════════════════════════════
// ProgressionSportPage — page sport (shell). Header + onglets familles.
// ⚠️ Les métriques de progression (hero, stats, liste, comparaison)
// nécessitent : la table `session_families` (détection auto des familles
// d'effort) ET des données structurées (intervalles « work », segments
// Hyrox, exos/séries, 1RM/FTP/CSS) — ABSENTES du schéma actuel.
// Tant qu'elles n'existent pas, on affiche un état « non disponible »
// documenté plutôt que des chiffres inventés (cf. PROMPT_PROGRESSION_COMPLETE.md).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const SPORT_LABELS: Record<string, string> = {
  running: 'Running', cycling: 'Cyclisme', hyrox: 'Hyrox', muscu: 'Muscu',
  aviron: 'Aviron', natation: 'Natation', trail: 'Trail',
}
const FAMILIES_BY_SPORT: Record<string, { id: string; label: string }[]> = {
  running:  [{ id: 'vma', label: 'VMA' }, { id: 'seuil', label: 'Seuil' }, { id: 'ef', label: 'EF' }],
  cycling:  [{ id: 'ef', label: 'EF' }, { id: 'ftp', label: 'Seuil / FTP' }, { id: 'pma', label: 'PMA' }, { id: 'anaerobie', label: 'Anaérobie' }, { id: 'sprints', label: 'Sprints' }],
  hyrox:    [{ id: 'simulation', label: 'Simulation' }, { id: 'spe_stations', label: 'Spé Stations' }],
  muscu:    [{ id: 'squat', label: 'Squat' }, { id: 'developpe_couche', label: 'DC' }, { id: 'deadlift', label: 'Deadlift' }, { id: 'traction', label: 'Traction' }, { id: 'dips', label: 'Dips' }, { id: 'developpe_militaire', label: 'DM' }, { id: 'front_squat', label: 'Front squat' }],
  aviron:   [{ id: 'test_2000m', label: '2000m' }, { id: 'ef', label: 'EF' }],
  natation: [{ id: 'css', label: 'CSS' }, { id: 'test_400m', label: '400m' }, { id: 'endurance', label: 'Endurance' }],
}

export default function ProgressionSportPage() {
  const params = useParams()
  const router = useRouter()
  const sport = String(params.sport ?? '')
  const families = FAMILIES_BY_SPORT[sport] ?? []
  const [active, setActive] = useState(families[0]?.id ?? '')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 80px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.push('/progression')} aria-label="Retour"
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>
            Progression {SPORT_LABELS[sport] ?? sport}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 0' }}>Évolution par type d&apos;effort</p>
        </div>
      </header>

      {families.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {families.map(f => (
            <button key={f.id} onClick={() => setActive(f.id)} style={{
              padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer',
              whiteSpace: 'nowrap', fontSize: 12, fontWeight: active === f.id ? 700 : 500, fontFamily: 'DM Sans,sans-serif',
              background: active === f.id ? 'rgba(6,182,212,0.12)' : 'var(--bg-card2)',
              color: active === f.id ? '#06B6D4' : 'var(--text-dim)',
            }}>{f.label}</button>
          ))}
        </div>
      )}

      {/* État réel : pas de données de progression (cf. blocage documenté) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>
          <strong style={{ color: 'var(--text)' }}>Progression bientôt disponible pour cette famille.</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)' }}>
            Le suivi de progression nécessite la détection automatique des familles d&apos;effort
            (table <code>session_families</code>) et des données structurées (intervalles, segments
            Hyrox, exercices, 1RM/FTP/CSS) qui ne sont pas encore disponibles. Aucune donnée n&apos;est
            inventée. Détails et prérequis dans <code>PROMPT_PROGRESSION_COMPLETE.md</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
