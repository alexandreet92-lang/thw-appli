'use client'

// ══════════════════════════════════════════════════════════════════
// ADMIN → Accès offert.
//
// Toi seul. Tu accordes à un e-mail un accès gratuit : Coach ou Athlète,
// un palier, une durée. La vraie sécurité est côté serveur (la route
// /api/admin/grant vérifie ADMIN_EMAIL) ; ce garde-fou d'affichage évite
// juste de montrer l'écran à quelqu'un d'autre.
// ══════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Kind = 'coach' | 'athlete'
type Tier = 'premium' | 'pro' | 'expert'
type Acces = { email: string; kind: Kind; tier: string; until: string | null }

const TIERS: { v: Tier; label: string }[] = [
  { v: 'premium', label: 'Premium' },
  { v: 'pro', label: 'Pro' },
  { v: 'expert', label: 'Expert' },
]
const DUREES: { v: number | null; label: string }[] = [
  { v: 30, label: '30 jours' },
  { v: 60, label: '60 jours' },
  { v: 90, label: '90 jours' },
  { v: null, label: 'Illimité' },
]

function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return !!admin && !!email && email.toLowerCase() === admin.toLowerCase()
}

export default function AccesOffertPage() {
  const router = useRouter()
  const [pret, setPret] = useState(false)

  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<Kind>('coach')
  const [tier, setTier] = useState<Tier>('premium')
  const [jours, setJours] = useState<number | null>(60)
  const [joursPerso, setJoursPerso] = useState('')

  const [acces, setAcces] = useState<Acces[]>([])
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  // Garde-fou d'affichage : réservé à l'admin.
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (!isAdminEmail(user?.email)) { router.replace('/'); return }
      setPret(true)
    })()
  }, [router])

  const recharger = useCallback(async () => {
    try {
      const rep = await fetch('/api/admin/grant')
      const json = (await rep.json().catch(() => ({}))) as { acces?: Acces[] }
      setAcces(json.acces ?? [])
    } catch { /* liste indisponible, sans bloquer le reste */ }
  }, [])

  useEffect(() => { if (pret) void recharger() }, [pret, recharger])

  async function accorder() {
    setEnCours(true); setMessage(''); setErreur('')
    try {
      const rep = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, kind, tier, jours }),
      })
      const json = (await rep.json().catch(() => ({}))) as { erreur?: string; accorde?: { garde_son_stripe?: boolean } }
      if (!rep.ok) { setErreur(json.erreur ?? 'Impossible.'); return }
      setMessage(
        `Accès ${kind === 'coach' ? 'coach' : 'athlète'} accordé à ${email}.`
        + (json.accorde?.garde_son_stripe ? ' (Son abonnement athlète payant a été conservé.)' : ''),
      )
      setEmail('')
      await recharger()
    } catch {
      setErreur('Connexion impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function revoquer(mail: string) {
    setEnCours(true); setMessage(''); setErreur('')
    try {
      const rep = await fetch('/api/admin/grant', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: mail }),
      })
      const json = (await rep.json().catch(() => ({}))) as { erreur?: string }
      if (!rep.ok) { setErreur(json.erreur ?? 'Impossible.'); return }
      setMessage(`Accès retiré à ${mail}.`)
      await recharger()
    } finally {
      setEnCours(false)
    }
  }

  if (!pret) return null

  const champ: React.CSSProperties = {
    padding: '10px 12px', fontSize: 14, borderRadius: 'var(--r-sm)',
    border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)',
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-8) var(--space-4) var(--space-10)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Accès offert</h1>
      <p style={{ margin: 'var(--space-3) 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)' }}>
        Accorde à quelqu’un un accès gratuit. La personne crée d’abord son compte ; tu l’attribues
        ensuite par son e-mail. Un accès coach ouvre aussi l’interface athlète.
      </p>

      {/* ── Le formulaire ─────────────────────────────────────────── */}
      <section style={{ marginTop: 'var(--space-6)', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-5)' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>E-mail du compte</span>
          <input style={champ} type="email" value={email} placeholder="prenom@exemple.com"
            onChange={(e) => setEmail(e.target.value)} />
        </label>

        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Accès</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Choix actif={kind === 'coach'} onClick={() => setKind('coach')}>Coach</Choix>
            <Choix actif={kind === 'athlete'} onClick={() => setKind('athlete')}>Athlète</Choix>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {kind === 'coach' ? 'Interface coach + interface athlète au palier choisi.' : 'Interface athlète seule.'}
          </span>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Palier athlète</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIERS.map((t) => <Choix key={t.v} actif={tier === t.v} onClick={() => setTier(t.v)}>{t.label}</Choix>)}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Durée</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {DUREES.map((d) => <Choix key={String(d.v)} actif={joursPerso === '' && jours === d.v} onClick={() => { setJoursPerso(''); setJours(d.v) }}>{d.label}</Choix>)}
            <input
              type="number" min={1} inputMode="numeric" placeholder="N jours"
              value={joursPerso}
              onChange={(e) => {
                const raw = e.target.value
                setJoursPerso(raw)
                const n = parseInt(raw, 10)
                if (raw !== '' && Number.isFinite(n) && n > 0) setJours(n)
              }}
              aria-label="Durée personnalisée en jours"
              style={{ width: 96, minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--r-pill)',
                border: joursPerso !== '' ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-high)', fontSize: 14 }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>
            Tu décides : clique une durée ou saisis le nombre de jours exact.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void accorder()} disabled={enCours || !email.trim()}
            style={{ minHeight: 44, padding: '0 var(--space-6)', borderRadius: 'var(--r-pill)', border: 0,
              background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 600,
              cursor: enCours || !email.trim() ? 'default' : 'pointer', opacity: enCours || !email.trim() ? 0.6 : 1 }}>
            Accorder l’accès
          </button>
          {message ? <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{message}</span> : null}
          {erreur ? <span role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{erreur}</span> : null}
        </div>
      </section>

      {/* ── Les accès en cours ────────────────────────────────────── */}
      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0 }}>
          Accès offerts en cours ({acces.length})
        </h2>
        {acces.length === 0 ? (
          <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: 'var(--text-dim)' }}>Aucun pour l’instant.</p>
        ) : (
          <ul style={{ margin: 'var(--space-4) 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {acces.map((a) => (
              <li key={`${a.email}:${a.kind}`} style={{ padding: 'var(--space-3) 0', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                <strong style={{ fontSize: 14, minWidth: 220 }}>{a.email}</strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>
                  {a.kind === 'coach' ? 'Coach' : 'Athlète'} · {a.tier} · {a.until ? `jusqu’au ${jourLisible(a.until)}` : 'illimité'}
                </span>
                <button type="button" onClick={() => void revoquer(a.email)} disabled={enCours}
                  style={{ marginLeft: 'auto', minHeight: 36, padding: '0 var(--space-4)', borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', fontSize: 13, cursor: 'pointer' }}>
                  Révoquer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Choix({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      style={{
        minHeight: 40, padding: '0 var(--space-4)', fontSize: 13.5, fontWeight: actif ? 600 : 400,
        borderRadius: 'var(--r-pill)', cursor: 'pointer',
        border: '1px solid var(--border)',
        background: actif ? 'var(--primary)' : 'transparent',
        color: actif ? 'var(--on-primary)' : 'var(--text)',
      }}>
      {children}
    </button>
  )
}

function jourLisible(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
