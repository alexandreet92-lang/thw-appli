'use client'

// ══════════════════════════════════════════════════════════════════
// ADMIN → Découverte (QR Hybrid). Toi seul.
//
// Tu crées un QR par établissement partenaire (restaurant…), tu imprimes la
// planche, et tu suis ici qui a ouvert / commencé / terminé le test, et les
// commentaires laissés. La vraie sécurité est côté serveur (les routes
// /api/admin/decouverte vérifient ADMIN_EMAIL) ; ce garde-fou d'affichage
// évite juste de montrer l'écran à quelqu'un d'autre.
// ══════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Commentaire = { texte: string; table: number | null; date: string }
type Source = {
  code: string; etablissement: string; metier: string | null; tables: number
  ville: string | null; note: string | null; created_at: string
  stats: { ouvertures: number; commence: number; termine: number }
  commentaires: Commentaire[]
}

function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return !!admin && !!email && email.toLowerCase() === admin.toLowerCase()
}

export default function DecouverteAdminPage() {
  const router = useRouter()
  const [pret, setPret] = useState(false)

  const [etablissement, setEtablissement] = useState('')
  const [metier, setMetier] = useState('')
  const [ville, setVille] = useState('')
  const [tables, setTables] = useState('')
  const [note, setNote] = useState('')

  const [sources, setSources] = useState<Source[]>([])
  const [orphelines, setOrphelines] = useState(0)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (!isAdminEmail(user?.email)) { router.replace('/'); return }
      setPret(true)
    })()
  }, [router])

  const recharger = useCallback(async () => {
    try {
      const rep = await fetch('/api/admin/decouverte')
      const json = (await rep.json().catch(() => ({}))) as { sources?: Source[]; orphelines?: number }
      setSources(json.sources ?? [])
      setOrphelines(json.orphelines ?? 0)
    } catch { /* liste indisponible */ }
  }, [])

  useEffect(() => { if (pret) void recharger() }, [pret, recharger])

  async function creer() {
    setEnCours(true); setMessage(''); setErreur('')
    try {
      const rep = await fetch('/api/admin/decouverte', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          etablissement, metier: metier || null, ville: ville || null,
          note: note || null, tables: tables ? parseInt(tables, 10) : 0,
        }),
      })
      const json = (await rep.json().catch(() => ({}))) as { erreur?: string }
      if (!rep.ok) { setErreur(json.erreur ?? 'Impossible.'); return }
      setMessage(`QR créé pour ${etablissement}.`)
      setEtablissement(''); setMetier(''); setVille(''); setTables(''); setNote('')
      await recharger()
    } catch {
      setErreur('Connexion impossible.')
    } finally { setEnCours(false) }
  }

  async function supprimer(code: string, nom: string) {
    if (!window.confirm(`Supprimer le QR de ${nom} ? Les scans déjà reçus sont conservés.`)) return
    setEnCours(true); setMessage(''); setErreur('')
    try {
      const rep = await fetch('/api/admin/decouverte', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!rep.ok) { const j = await rep.json().catch(() => ({})); setErreur((j as { erreur?: string }).erreur ?? 'Impossible.'); return }
      setMessage(`QR de ${nom} supprimé.`)
      await recharger()
    } finally { setEnCours(false) }
  }

  if (!pret) return null

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 'var(--space-8) var(--space-4) var(--space-10)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Découverte — QR Hybrid</h1>
      <p style={{ margin: 'var(--space-3) 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)' }}>
        Crée un QR par établissement partenaire. Le QR ouvre, sur le site (jamais l’app), une page
        qui présente le test Decaform et invite à créer un compte gratuit. Pour un restaurant,
        indique le nombre de tables : tu auras un QR par table.
      </p>

      {/* ── Créer ───────────────────────────────────────────────── */}
      <section style={{ marginTop: 'var(--space-6)', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }}>
        <Ligne>
          <Champ label="Établissement" value={etablissement} onChange={setEtablissement} placeholder="Ex. Le Bistrot de Marie" />
          <Champ label="Métier" value={metier} onChange={setMetier} placeholder="restaurant, kiné…" />
        </Ligne>
        <Ligne>
          <Champ label="Ville" value={ville} onChange={setVille} placeholder="Lyon" />
          <Champ label="Nb de tables (0 = aucune)" value={tables} onChange={setTables} placeholder="0" type="number" />
        </Ligne>
        <Champ label="Note (privée)" value={note} onChange={setNote} placeholder="Contact, détail…" />

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void creer()} disabled={enCours || !etablissement.trim()}
            style={{ minHeight: 44, padding: '0 var(--space-6)', borderRadius: 'var(--r-pill)', border: 0, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 600, cursor: enCours || !etablissement.trim() ? 'default' : 'pointer', opacity: enCours || !etablissement.trim() ? 0.6 : 1 }}>
            Créer le QR
          </button>
          {message ? <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{message}</span> : null}
          {erreur ? <span role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{erreur}</span> : null}
        </div>
      </section>

      {/* ── Liste ───────────────────────────────────────────────── */}
      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0 }}>
          Établissements ({sources.length})
          {orphelines > 0 ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 400, color: 'var(--text-dim)' }}>  ·  {orphelines} scan(s) sans source</span> : null}
        </h2>

        {sources.length === 0 ? (
          <p style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: 'var(--text-dim)' }}>Aucun pour l’instant.</p>
        ) : (
          <ul style={{ margin: 'var(--space-4) 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--space-3)' }}>
            {sources.map((s) => (
              <li key={s.code} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 15 }}>{s.etablissement}</strong>
                  <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                    {[s.metier, s.ville, s.tables > 0 ? `${s.tables} tables` : null].filter(Boolean).join(' · ')}
                  </span>
                </div>

                {/* Stats : entonnoir ouvert → commencé → terminé */}
                <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                  <Stat n={s.stats.ouvertures} label="scans / ouvertures" />
                  <Stat n={s.stats.commence} label="clics « compte »" />
                  <Stat n={s.commentaires.length} label="commentaires" />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <a href={`/api/admin/decouverte/planche?code=${encodeURIComponent(s.code)}`} target="_blank" rel="noopener"
                    style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    Planche QR à imprimer →
                  </a>
                  <code style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>/defi?s={s.code}</code>
                  <button type="button" onClick={() => void supprimer(s.code, s.etablissement)} disabled={enCours}
                    style={{ marginLeft: 'auto', minHeight: 32, padding: '0 var(--space-4)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', fontSize: 12.5, cursor: 'pointer' }}>
                    Supprimer
                  </button>
                </div>

                {s.commentaires.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6, marginTop: 'var(--space-2)' }}>
                    <span style={{ fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                      Commentaires ({s.commentaires.length})
                    </span>
                    {s.commentaires.map((c, i) => (
                      <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)' }}>
                        « {c.texte} »{c.table ? <span style={{ color: 'var(--text-dim)' }}> — table {c.table}</span> : null}
                      </p>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Ligne({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>{children}</div>
}

function Champ({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{label}</span>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '10px 12px', fontSize: 14, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
      />
    </label>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'grid', gap: 1 }}>
      <strong style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{n}</strong>
      <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}
