'use client'
// CADENCES — démarrage / reprise d'une campagne + historique (client).
// Saisie SITE uniquement : POST /api/cadences/campaign (client cookie → 401 natif).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface Campagne {
  id: string
  status: 'in_progress' | 'completed' | 'abandoned'
  scale_sex: 'M' | 'F'
  age_at_start: number
  age_band: string
  body_weight_kg: number
  started_on: string
  completed_on: string | null
}

export function StartCampaign({ campagnes }: { campagnes: Campagne[] }) {
  const router = useRouter()
  const enCours = campagnes.find((c) => c.status === 'in_progress')
  const terminees = campagnes.filter((c) => c.status === 'completed')

  const [sex, setSex] = useState<'M' | 'F' | null>(null)
  const [age, setAge] = useState('')
  const [poids, setPoids] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function demarrer() {
    setErreur(null)
    if (!sex) return setErreur('Choisis le barème (homme / femme).')
    const a = Number(age), p = Number(poids)
    if (!Number.isFinite(a) || a < 18 || a > 80) return setErreur('Âge requis : réservé aux 18 à 80 ans.')
    if (!Number.isFinite(p) || p < 30 || p > 250) return setErreur('Poids de corps requis (30 à 250 kg).')
    setBusy(true)
    try {
      const r = await fetch('/api/cadences/campaign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sex, scaleSex: sex, age: a, bodyWeightKg: p, shareForCalibration: consent }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErreur(j?.erreur ?? 'Impossible de démarrer le test.'); setBusy(false); return }
      router.push('/cadences/test')
    } catch {
      setErreur('Erreur réseau. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {enCours ? (
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Un test est en cours</div>
          <p style={muted}>
            Démarré le {frDate(enCours.started_on)} · barème {enCours.scale_sex === 'M' ? 'homme' : 'femme'},
            {' '}{enCours.age_at_start} ans, {Math.round(enCours.body_weight_kg)} kg.
          </p>
          <Link href="/cadences/test" style={{ ...cta, textDecoration: 'none', display: 'inline-flex' }}>Reprendre le test →</Link>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Démarrer un nouveau test</div>
          <p style={muted}>Ton sexe, ton âge et ton poids de corps servent au barème. Ils restent privés.</p>

          <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
            <Field label="Barème">
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['M', 'F'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSex(s)}
                    aria-pressed={sex === s}
                    style={pill(sex === s)}>{s === 'M' ? 'Homme' : 'Femme'}</button>
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Field label="Âge">
                <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)}
                  placeholder="ex. 32" style={input} aria-label="Âge en années" />
              </Field>
              <Field label="Poids de corps (kg)">
                <input inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value)}
                  placeholder="ex. 78" style={input} aria-label="Poids de corps en kilos" />
              </Field>
            </div>

            <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3 }} />
              <span style={{ ...muted, margin: 0 }}>
                J’accepte que mes résultats anonymisés servent à affiner les barèmes (optionnel, révocable).
              </span>
            </label>

            {erreur ? <div role="alert" style={alerte}>{erreur}</div> : null}

            <button type="button" onClick={demarrer} disabled={busy} style={{ ...cta, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Démarrage…' : 'Démarrer le test'}
            </button>
          </div>
        </div>
      )}

      {terminees.length > 0 ? (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Mes passages
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {terminees.map((c) => (
              <Link key={c.id} href={`/cadences/resultats/${c.id}`} style={ligne}>
                <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
                  {frDate(c.completed_on ?? c.started_on)}
                </span>
                <span style={{ ...muted, margin: 0 }}>
                  {c.scale_sex === 'M' ? 'H' : 'F'} · {c.age_at_start} ans · {Math.round(c.body_weight_kg)} kg →
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link href="/cadences/methode" style={{ ...muted, margin: 0, textDecoration: 'underline' }}>
        Comprendre la méthode et le barème
      </Link>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function frDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

const card: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-5)', border: '1px solid var(--border)' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)', margin: '6px 0 0' }
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 16, color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)' }
const alerte: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', background: 'var(--primary-dim)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '10px 12px' }
const cta: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--on-primary)', background: 'var(--primary)', border: 'none', borderRadius: 'var(--r-md)', padding: '13px 18px', cursor: 'pointer' }
const ligne: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px', textDecoration: 'none', color: 'var(--text)', fontSize: 13 }

function pill(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '11px 14px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    color: active ? 'var(--on-primary)' : 'var(--text)',
    background: active ? 'var(--primary)' : 'var(--bg-card)',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border-mid)'}`,
    borderRadius: 'var(--r-md)',
  }
}
