'use client'

// ══════════════════════════════════════════════════════════════════
// LE DÉFI HYBRID — test physique public (anonyme), ouvert par un QR.
//
// Parcours : intro → test → résultat (+ commentaire) → création de compte.
// À chaque étape, on enregistre discrètement l'avancement côté serveur
// (/api/decouverte/evenement) pour qu'Alexandre sache, par établissement,
// qui a ouvert / commencé / terminé / commenté. AUCUNE connexion requise.
//
// ⚠️ TEST PROVISOIRE : le barème ci-dessous (computeScore) est un placeholder.
//    Il sera remplacé par le vrai test d'Alexandre — toute la mécanique de
//    suivi, de QR et de compte reste inchangée le jour du remplacement.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'

type Etape = 'intro' | 'test' | 'resultat'

export function DefiClient({ code, table }: { code: string | null; table: number | null }) {
  const [etape, setEtape] = useState<Etape>('intro')
  const participationId = useRef<string | null>(null)
  const ouvertEnvoye = useRef(false)

  // champs du test provisoire
  const [pompes, setPompes] = useState('')
  const [gainage, setGainage] = useState('')
  const [squats, setSquats] = useState('')

  const [commentaire, setCommentaire] = useState('')
  const [commentEnvoye, setCommentEnvoye] = useState(false)

  // Ouverture : on crée la participation une seule fois.
  useEffect(() => {
    if (ouvertEnvoye.current) return
    ouvertEnvoye.current = true
    void envoyer({ s: code, t: table, etape: 'ouvert' }).then((id) => {
      if (id) participationId.current = id
    })
  }, [code, table])

  function commencer() {
    setEtape('test')
    void envoyer({ participationId: participationId.current, etape: 'commence' })
  }

  const score = computeScore(num(pompes), num(gainage), num(squats))

  function terminer() {
    setEtape('resultat')
    void envoyer({
      participationId: participationId.current,
      etape: 'termine',
      score: { pompes: num(pompes), gainage: num(gainage), squats: num(squats), total: score.total, niveau: score.niveau },
    })
    window.scrollTo({ top: 0 })
  }

  function envoyerCommentaire() {
    if (!commentaire.trim()) return
    setCommentEnvoye(true)
    void envoyer({ participationId: participationId.current, etape: 'termine', commentaire: commentaire.trim() })
  }

  const auMoinsUn = num(pompes) > 0 || num(gainage) > 0 || num(squats) > 0
  const lienCompte = `/auth?from=defi${code ? `&s=${encodeURIComponent(code)}` : ''}`

  return (
    <main style={sMain}>
      <div style={sCadre}>
        {/* En-tête de marque, discret */}
        <div style={{ textAlign: 'center' }}>
          <span style={sKicker}>Hybrid</span>
        </div>

        {etape === 'intro' ? (
          <section style={sCarte}>
            <h1 style={sTitre}>Le Défi Hybrid</h1>
            <p style={sLead}>Testez votre condition physique. Gratuit, 2 minutes, sans inscription pour commencer.</p>
            <p style={sTexte}>
              Trois exercices simples, aucun matériel. On vous donne votre niveau tout de suite — et vous
              pourrez garder votre progression si vous le souhaitez.
            </p>
            <button type="button" onClick={commencer} style={sBtnPrimaire}>Commencer le défi</button>
            <p style={sMini}>Aucune donnée personnelle demandée pour faire le test.</p>
          </section>
        ) : null}

        {etape === 'test' ? (
          <section style={sCarte}>
            <h1 style={sTitre}>Vos trois exercices</h1>
            <p style={sTexte}>Faites chaque exercice à votre rythme, puis notez votre résultat.</p>

            <Champ label="Pompes" aide="Nombre maximum d’affilée" unite="reps"
              value={pompes} onChange={setPompes} />
            <Champ label="Gainage" aide="Temps de planche tenu" unite="sec"
              value={gainage} onChange={setGainage} />
            <Champ label="Squats" aide="Nombre en 1 minute" unite="reps"
              value={squats} onChange={setSquats} />

            <button type="button" onClick={terminer} disabled={!auMoinsUn}
              style={{ ...sBtnPrimaire, opacity: auMoinsUn ? 1 : 0.5, cursor: auMoinsUn ? 'pointer' : 'default' }}>
              Voir mon résultat
            </button>
          </section>
        ) : null}

        {etape === 'resultat' ? (
          <section style={sCarte}>
            <span style={sKicker2}>Votre résultat</span>
            <div style={sScore}>{score.total}<span style={sScoreUnite}> / 100</span></div>
            <div style={sNiveau}>{score.niveau}</div>
            <p style={sTexte}>{score.phrase}</p>

            <div style={sSep} />

            {!commentEnvoye ? (
              <>
                <label style={sLabel}>Votre ressenti ? <span style={sOpt}>(facultatif)</span></label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Un mot sur le test, votre forme du moment…"
                  rows={3}
                  style={sTextarea}
                />
                <button type="button" onClick={envoyerCommentaire} disabled={!commentaire.trim()}
                  style={{ ...sBtnSecondaire, opacity: commentaire.trim() ? 1 : 0.5, cursor: commentaire.trim() ? 'pointer' : 'default' }}>
                  Envoyer mon ressenti
                </button>
              </>
            ) : (
              <p style={sMerci}>Merci, c’est noté. 🙌</p>
            )}

            <div style={sSep} />

            <p style={sLead}>Gardez votre progression.</p>
            <p style={sTexte}>
              Créez un compte gratuit : suivez votre condition dans le temps, et débloquez les piliers
              de l’app (entraînement, sommeil, nutrition, performance).
            </p>
            <a href={lienCompte} style={sBtnPrimaireLien}>Créer mon compte gratuit →</a>
          </section>
        ) : null}
      </div>
    </main>
  )
}

/* ─────────────────────────  un champ de saisie  ───────────────────────── */
function Champ({ label, aide, unite, value, onChange }: {
  label: string; aide: string; unite: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={sLabel}>{label} <span style={sOpt}>· {aide}</span></span>
      <div style={sChampWrap}>
        <input
          type="number" inputMode="numeric" min={0} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          style={sInput}
        />
        <span style={sUnite}>{unite}</span>
      </div>
    </label>
  )
}

/* ─────────────────────────  barème PROVISOIRE  ───────────────────────── */
function computeScore(pompes: number, gainage: number, squats: number): { total: number; niveau: string; phrase: string } {
  const p = Math.min(50, pompes)
  const g = Math.min(40, gainage / 3)
  const s = Math.min(30, squats / 2)
  const total = Math.round(Math.min(100, p + g + s))
  let niveau = 'Débutant'
  let phrase = 'Une base de départ : il y a de la marge, et c’est tant mieux — on part de là.'
  if (total >= 80) { niveau = 'Élite'; phrase = 'Niveau remarquable. Votre condition est déjà très solide.' }
  else if (total >= 55) { niveau = 'Avancé'; phrase = 'Belle condition physique. Vous êtes au-dessus de la moyenne.' }
  else if (total >= 30) { niveau = 'Intermédiaire'; phrase = 'Bonne base. Avec un cap clair, vous progressez vite.' }
  return { total, niveau, phrase }
}

function num(v: string): number {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

async function envoyer(body: Record<string, unknown>): Promise<string | null> {
  try {
    const rep = await fetch('/api/decouverte/evenement', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await rep.json().catch(() => ({}))) as { id?: string }
    return json.id ?? null
  } catch {
    return null
  }
}

/* ──────────────────────────────  styles  ────────────────────────────── */
const sMain: React.CSSProperties = {
  minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: 'var(--space-6) var(--space-5) var(--space-10)',
}
const sCadre: React.CSSProperties = { width: '100%', maxWidth: 460, display: 'grid', gap: 'var(--space-5)', marginTop: 'var(--space-6)' }
const sKicker: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--text-dim)' }
const sKicker2: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-dim)' }
const sCarte: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }
const sTitre: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, lineHeight: 1.15, margin: 0 }
const sLead: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, lineHeight: 1.35, margin: 0 }
const sTexte: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)', margin: 0 }
const sMini: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-dim)', margin: 0, textAlign: 'center' }
const sLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }
const sOpt: React.CSSProperties = { fontWeight: 400, color: 'var(--text-dim)' }
const sChampWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--input-bg)', overflow: 'hidden' }
const sInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '12px 14px', fontSize: 16, fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', background: 'transparent', color: 'var(--text)', border: 0, outline: 'none' }
const sUnite: React.CSSProperties = { padding: '0 14px', fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }
const sTextarea: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 15, fontFamily: 'var(--font-body)', lineHeight: 1.5, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }
const sBtnPrimaire: React.CSSProperties = { minHeight: 50, padding: '0 var(--space-6)', borderRadius: 'var(--r-pill)', border: 0, background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 'var(--space-2)' }
const sBtnPrimaireLien: React.CSSProperties = { ...sBtnPrimaire, display: 'grid', placeItems: 'center', textDecoration: 'none' }
const sBtnSecondaire: React.CSSProperties = { minHeight: 44, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const sScore: React.CSSProperties = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 56, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }
const sScoreUnite: React.CSSProperties = { fontSize: 20, fontWeight: 500, color: 'var(--text-dim)' }
const sNiveau: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--primary)' }
const sSep: React.CSSProperties = { height: 1, background: 'var(--border)', margin: 'var(--space-2) 0' }
const sMerci: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: 0 }
