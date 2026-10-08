'use client'

// ══════════════════════════════════════════════════════════════════
// LE DÉFI HYBRID — vitrine publique du test Decaform, ouverte par un QR.
//
// Pas de test sur place : Decaform est une vraie batterie d'athlète (terrain,
// piste, salle, 18+), impossible à faire à une table. La page PRÉSENTE ce que
// Decaform mesure et invite à créer un compte gratuit pour le faire dans l'app,
// à son rythme. On suit, par établissement/table : ouvertures, clics « compte »,
// et les mots laissés. AUCUNE connexion requise pour voir cette page.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'

export function DefiClient({ code, table }: { code: string | null; table: number | null }) {
  const participationId = useRef<string | null>(null)
  const ouvertEnvoye = useRef(false)
  const [commentaire, setCommentaire] = useState('')
  const [commentEnvoye, setCommentEnvoye] = useState(false)

  useEffect(() => {
    if (ouvertEnvoye.current) return
    ouvertEnvoye.current = true
    void envoyer({ s: code, t: table, etape: 'ouvert' }).then((id) => { if (id) participationId.current = id })
  }, [code, table])

  const lienCompte = `/auth?from=defi${code ? `&s=${encodeURIComponent(code)}` : ''}`

  // On enregistre l'intention d'inscription AVANT de naviguer (beacon : survit au
  // changement de page), puis la navigation du lien se fait normalement.
  function versCompte() {
    try {
      const body = JSON.stringify({ participationId: participationId.current, s: code, t: table, etape: 'commence' })
      navigator.sendBeacon?.('/api/decouverte/evenement', new Blob([body], { type: 'application/json' }))
    } catch { /* sans gravité */ }
  }

  function envoyerCommentaire() {
    if (!commentaire.trim()) return
    setCommentEnvoye(true)
    void envoyer({ participationId: participationId.current, s: code, t: table, etape: 'ouvert', commentaire: commentaire.trim() })
  }

  return (
    <main style={sMain}>
      <div style={sCadre}>
        <div style={{ textAlign: 'center' }}><span style={sKicker}>Hybrid</span></div>

        {/* Accroche */}
        <section style={sCarte}>
          <span style={sKicker2}>Le test physique</span>
          <h1 style={sTitre}>Decaform</h1>
          <p style={sLead}>Mesurez vraiment où vous en êtes, physiquement.</p>
          <p style={sTexte}>
            Une batterie de 21 épreuves, réparties en trois qualités. Vous obtenez un score et un
            niveau par qualité — et vous suivez vos progrès dans le temps.
          </p>
          <a href={lienCompte} onClick={versCompte} style={sBtnPrimaireLien}>Créer mon compte gratuit →</a>
          <p style={sMini}>Gratuit. Vous faites le test à votre rythme dans l’app.</p>
        </section>

        {/* Les trois qualités */}
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <Qualite
            titre="Vitesse · Explosivité · Jump"
            detail="Sauts, sprints, agilité, natation, 400 m."
          />
          <Qualite
            titre="Force"
            detail="Squat, développé couché, soulevé de terre, militaire, traction lestée, dead hang."
          />
          <Qualite
            titre="Endurance musculaire & anaérobie"
            detail="AMRAP 20 min, 3200 m, FTP vélo, circuit Hyrox."
          />
        </div>

        {/* Honnêteté : ce que c'est vraiment */}
        <section style={sCarteSobre}>
          <p style={sTexte}>
            Decaform est un <strong style={{ color: 'var(--text)' }}>vrai test d’athlète</strong> : terrain, piste, salle.
            Réservé aux 18 ans et plus. Pas besoin de tout faire d’un coup — l’app vous guide, épreuve
            par épreuve, et garde vos résultats.
          </p>
        </section>

        {/* Un mot (facultatif) */}
        <section style={sCarte}>
          {!commentEnvoye ? (
            <>
              <label style={sLabel}>Une question, un mot ? <span style={sOpt}>(facultatif)</span></label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Dites-nous ce que vous en pensez…"
                rows={3}
                style={sTextarea}
              />
              <button type="button" onClick={envoyerCommentaire} disabled={!commentaire.trim()}
                style={{ ...sBtnSecondaire, opacity: commentaire.trim() ? 1 : 0.5, cursor: commentaire.trim() ? 'pointer' : 'default' }}>
                Envoyer
              </button>
            </>
          ) : (
            <p style={sMerci}>Merci, c’est noté. 🙌</p>
          )}
        </section>

        <div style={{ textAlign: 'center' }}>
          <a href={lienCompte} onClick={versCompte} style={sLienTexte}>Créer mon compte gratuit →</a>
        </div>
      </div>
    </main>
  )
}

function Qualite({ titre, detail }: { titre: string; detail: string }) {
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'grid', gap: 4 }}>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{titre}</strong>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)' }}>{detail}</span>
    </div>
  )
}

async function envoyer(body: Record<string, unknown>): Promise<string | null> {
  try {
    const rep = await fetch('/api/decouverte/evenement', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
    const json = (await rep.json().catch(() => ({}))) as { id?: string }
    return json.id ?? null
  } catch { return null }
}

/* ──────────────────────────────  styles  ────────────────────────────── */
const sMain: React.CSSProperties = {
  minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: 'var(--space-6) var(--space-5) var(--space-10)',
}
const sCadre: React.CSSProperties = { width: '100%', maxWidth: 460, display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }
const sKicker: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--text-dim)' }
const sKicker2: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-dim)' }
const sCarte: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }
const sCarteSobre: React.CSSProperties = { padding: '0 var(--space-2)', display: 'grid', gap: 'var(--space-3)' }
const sTitre: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, margin: 0, letterSpacing: '.01em' }
const sLead: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, lineHeight: 1.35, margin: 0 }
const sTexte: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)', margin: 0 }
const sMini: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-dim)', margin: 0, textAlign: 'center' }
const sLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }
const sOpt: React.CSSProperties = { fontWeight: 400, color: 'var(--text-dim)' }
const sTextarea: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 15, fontFamily: 'var(--font-body)', lineHeight: 1.5, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }
const sBtnPrimaireLien: React.CSSProperties = { minHeight: 50, padding: '0 var(--space-6)', borderRadius: 'var(--r-pill)', border: 0, background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'grid', placeItems: 'center', textDecoration: 'none', marginTop: 'var(--space-2)' }
const sBtnSecondaire: React.CSSProperties = { minHeight: 44, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const sLienTexte: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }
const sMerci: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: 0 }
