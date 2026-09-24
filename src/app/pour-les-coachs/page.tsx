// ══════════════════════════════════════════════════════════════
// /pour-les-coachs — la page publique, pour les COACHS.
//
// POURQUOI ELLE EXISTE, ALORS QU'IL Y A DÉJÀ /decouvrir. Celle-là présente
// l'app aux ATHLÈTES : seize piliers, « une IA qui TE connaît », « TON identité
// d'athlète », essai de 14 jours. Elle est bonne — pour eux. Un coach qui la
// reçoit lit une page qui ne lui parle pas, et le décalage avec le message
// qu'on vient de lui envoyer est immédiat.
//
// Et le domaine nu ne vaut pas mieux : il ouvre le tableau de bord, qui
// redirige vers /auth quand personne n'est connecté. Le coach tomberait sur un
// formulaire de connexion sans avoir rien appris.
//
// ELLE PARLE AU COACH, PAS À L'ATHLÈTE, et c'est tout l'enjeu : l'app est
// écrite pour des athlètes, le message s'adresse à des coachs, et cette page
// est la seule pièce qui fait le raccord.
//
// SA PEUR N'EST PAS LE PRIX, C'EST D'ÊTRE REMPLACÉ. D'où les deux colonnes au
// centre de la page : ce que l'IA fait À SA PLACE, et ce qu'il garde. Tant
// qu'un coach n'a pas lu la deuxième colonne, il n'entend pas la première.
//
// EN FRANÇAIS, SANS i18n, ET C'EST DÉLIBÉRÉ : c'est la page d'une campagne
// française. La traduire le jour où la campagne le sera.
//
// Design : docs/DESIGN_SYSTEM.md. Aucune couleur en dur, aucune bordure
// décorative, séparation par l'espace et --bg-card2, un seul accent.
// ══════════════════════════════════════════════════════════════

import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { authRedirectBase } from '@/lib/auth/redirect'

export const dynamic = 'force-static'

const TITRE = 'THW Coaching — coachez plus d’athlètes sans y passer plus d’heures'
const RESUME =
  'L’IA écrit les plans, ajuste les séances et suit la charge. Vous gardez la relation et les décisions. '
  + 'Six semaines d’accès complet, offertes, pour l’essayer avec vos athlètes.'

// LA CARTE D'APERÇU N'EST PAS UNE DÉCORATION. Le lien de cette page part en
// message privé Instagram. Sans ces balises, le destinataire voit l'adresse
// toute nue — et un lien nu envoyé par un inconnu, c'est la forme même du
// spam, sur le canal précis où le message doit inspirer confiance.
// L'image est fabriquée par `node scripts/apercu-og.mjs` (1200 × 630).
export const metadata: Metadata = {
  // Base publique du site — même source que les liens d'email, pour qu'il n'y
  // ait qu'UN endroit où corriger le domaine (variable NEXT_PUBLIC_SITE_URL).
  metadataBase: new URL(authRedirectBase()),
  title: TITRE,
  description: RESUME,
  robots: { index: true, follow: true },
  alternates: { canonical: '/pour-les-coachs' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'THW Coaching',
    url: '/pour-les-coachs',
    title: TITRE,
    description: RESUME,
    images: [{
      url: '/pour-les-coachs/apercu.png',
      width: 1200,
      height: 630,
      alt: 'THW Coaching — coachez plus d’athlètes sans y passer plus d’heures.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITRE,
    description: RESUME,
    images: ['/pour-les-coachs/apercu.png'],
  },
}

/** Le lien de prise de rendez-vous. Réglable sans toucher au code. */
const CAL = process.env.NEXT_PUBLIC_CAL_COACH || ''
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@the-hybridway.com'

/**
 * Ce que l'IA fait à sa place, et ce qu'il garde.
 *
 * La colonne de droite est la plus importante des deux. Elle n'est pas une
 * précaution de langage : c'est la réponse à la seule objection qui compte.
 */
const A_SA_PLACE = [
  ['Écrire les plans', 'Un cycle complet à partir de son objectif, de son niveau et de ses contraintes. Vous relisez, vous corrigez, vous validez.'],
  ['Ajuster les séances', 'Une séance ratée, une semaine chargée, une blessure : le plan se réajuste tout seul, et vous dit ce qui a changé.'],
  ['Suivre la charge', 'Forme, fatigue, fraîcheur, calculées en continu sur tous ses entraînements. Vous voyez venir la surcharge avant lui.'],
] as const

const CE_QUIL_GARDE = [
  ['La relation', 'C’est vous qu’il appelle quand ça ne va pas. Aucune IA ne parle à sa place et aucune ne lui répond en votre nom.'],
  ['Les décisions', 'Rien ne part chez l’athlète sans votre validation. L’IA propose, vous tranchez.'],
  ['Votre méthode', 'Vos séances, vos blocs, votre façon de périodiser. L’app apprend votre bibliothèque, elle ne vous impose pas la sienne.'],
] as const

/** Les captures, quand elles sont posées. Voir le commentaire de Captures(). */
const CAPTURES = [
  { fichier: 'plan.webp', legende: 'Un cycle écrit en une fois, relu en cinq minutes.' },
  { fichier: 'charge.webp', legende: 'Forme, fatigue et fraîcheur de chaque athlète.' },
  { fichier: 'athletes.webp', legende: 'Tous vos athlètes, et ce qui demande votre attention.' },
] as const

export default function DecouvrirPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: 'var(--space-10) var(--space-5) var(--space-12)',
        }}
      >
        <Entete />
        <Promesse />
        <DeuxColonnes />
        <Captures />
        <LeTest />
        <QuiJeSuis />
        <LAppEntiere />
        <Appel />
        <Pied />
      </div>
    </main>
  )
}

/* ────────────────────────────────────────────────────────────── */

function Entete() {
  return (
    <header style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
        THW Coaching
      </span>
      <Link
        href="/auth"
        style={{
          marginLeft: 'auto',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-mid)',
          textDecoration: 'none',
          padding: 'var(--space-3) 0',
        }}
      >
        J’ai déjà un compte
      </Link>
    </header>
  )
}

function Promesse() {
  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.25,
          margin: 0,
          maxWidth: 620,
        }}
      >
        Coachez plus d’athlètes sans y passer plus d’heures.
      </h1>
      <p
        style={{
          margin: 'var(--space-5) 0 0',
          maxWidth: 580,
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--text-mid)',
        }}
      >
        THW Coaching confie à une IA le travail qui vous prend vos soirées — écrire les plans,
        ajuster les séances, suivre la charge. Vous gardez ce pour quoi vos athlètes vous paient :
        la relation et les décisions.
      </p>
    </section>
  )
}

function DeuxColonnes() {
  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <div
        style={{
          display: 'grid',
          gap: 'var(--space-6)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <Colonne titre="Ce que l’IA fait à votre place" lignes={A_SA_PLACE} />
        <Colonne titre="Ce que vous gardez" lignes={CE_QUIL_GARDE} accent />
      </div>
    </section>
  )
}

function Colonne({
  titre, lignes, accent = false,
}: {
  titre: string
  lignes: readonly (readonly [string, string])[]
  accent?: boolean
}) {
  return (
    <div
      style={{
        // La séparation se fait par le fond, jamais par une bordure.
        background: accent ? 'var(--bg-card2)' : 'transparent',
        borderRadius: 'var(--r-md)',
        padding: accent ? 'var(--space-6)' : 'var(--space-6) 0',
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: 0 }}>
        {titre}
      </h2>
      <div style={{ marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-5)' }}>
        {lignes.map(([quoi, comment]) => (
          <div key={quoi}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{quoi}</div>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--text-mid)' }}>
              {comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Les captures, et la règle qui va avec.
 *
 * ABSENTES, LA SECTION DISPARAÎT. Un cadre « capture à venir » sur une page qui
 * présente un produit dit une seule chose au visiteur, et elle est juste : ce
 * produit n'est pas prêt. Poser les fichiers dans public/pour-les-coachs/ les
 * fait revenir toutes seules. (Pas dans public/decouvrir/, qui sert les pages
 * statiques des athlètes.)
 */
function Captures() {
  const presentes = CAPTURES.filter((c) => {
    try {
      return fs.existsSync(path.join(process.cwd(), 'public', 'pour-les-coachs', c.fichier))
    } catch {
      return false
    }
  })
  if (!presentes.length) return null

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: 0 }}>
        À quoi ça ressemble
      </h2>
      <div
        style={{
          marginTop: 'var(--space-5)',
          display: 'grid',
          gap: 'var(--space-5)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {presentes.map((c) => (
          <figure key={c.fichier} style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/pour-les-coachs/${c.fichier}`}
              alt={c.legende}
              loading="lazy"
              style={{
                display: 'block',
                width: '100%',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-card2)',
              }}
            />
            <figcaption style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--text-dim)' }}>
              {c.legende}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function LeTest() {
  // Les chiffres sont en Inter tabulaire, zéro non barré — règle du design system.
  const chiffre: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: "'zero' 0",
  }

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: 0 }}>
          Essayez-la avec vos athlètes. Six semaines, offertes.
        </h2>
        <p style={{ margin: 'var(--space-4) 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--text-mid)', maxWidth: 560 }}>
          Je cherche quelques coachs pour utiliser l’app en conditions réelles et me dire ce qui
          cloche. On crée votre compte ensemble et je migre vos athlètes avec vous — vous n’avez
          rien à installer ni à ressaisir.
        </p>

        <div
          style={{
            marginTop: 'var(--space-6)',
            display: 'grid',
            gap: 'var(--space-5)',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          {([['6', 'semaines'], ['10', 'athlètes'], ['0', 'euro']] as const).map(([n, quoi]) => (
            <div key={quoi}>
              <div style={chiffre}>{n}</div>
              <div style={{ marginTop: 'var(--space-1)', fontSize: 12, color: 'var(--text-dim)' }}>{quoi}</div>
            </div>
          ))}
        </div>

        <p style={{ margin: 'var(--space-6) 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)' }}>
          Accès complet, aucun engagement, aucune carte bancaire. Au bout des six semaines, on en
          reparle — et si ça ne vous a rien apporté, vous me le dites et on s’arrête là.
        </p>
      </div>
    </section>
  )
}

function QuiJeSuis() {
  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: 0 }}>
        Qui vous écrit
      </h2>
      <p style={{ margin: 'var(--space-4) 0 0', maxWidth: 580, fontSize: 14, lineHeight: 1.65, color: 'var(--text-mid)' }}>
        Alexandre, 20 ans, en préparation d’un Ironman. J’ai construit THW Coaching d’abord pour
        moi : je voulais un plan qui tienne compte de ce que je faisais vraiment, pas d’un tableau
        à remplir. Je ne suis pas un éditeur de logiciel, et c’est pour ça que je viens vous
        demander ce qui manque plutôt que de vous vendre ce que j’ai.
      </p>
    </section>
  )
}

/**
 * LE LIEN VERS LA VISITE COMPLÈTE.
 *
 * La page /decouvrir est écrite pour les athlètes, mais elle montre l'app en
 * seize écrans — c'est le meilleur argument qu'on ait, pour peu qu'on dise à
 * qui elle s'adresse. Un coach curieux ira ; un coach pressé ne cliquera pas,
 * et c'est très bien : elle est en second, pas en premier.
 */
function LAppEntiere() {
  return (
    <section style={{ marginTop: 'var(--space-8)' }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)', maxWidth: 580 }}>
        Vous voulez voir l’app en entier avant de me répondre ?{' '}
        {/* <a> et non <Link> : /decouvrir n'est pas une route de l'app, c'est une
            redirection de next.config.js vers un fichier statique. Le routeur
            client n'a aucune page à cette adresse. */}
        <a href="/decouvrir" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
          La visite complète
        </a>{' '}
        — elle est écrite du point de vue de l’athlète, celui que vos athlètes auront.
      </p>
    </section>
  )
}

function Appel() {
  const rdv = CAL ? (CAL.startsWith('http') ? CAL : `https://cal.com/${CAL}`) : ''
  const mail = `mailto:${CONTACT}?subject=${encodeURIComponent('Je veux tester THW Coaching')}`

  // IL Y A TOUJOURS UN BOUTON. Mesuré sans NEXT_PUBLIC_CAL_COACH : la page
  // n'avait plus pour seule action qu'un petit lien texte, perdu entre deux
  // paragraphes — sur un téléphone, rien qui ressemble à un bouton. Or cette
  // variable est figée au BUILD : posée après un déploiement, elle reste
  // absente jusqu'au suivant. La page doit donc être bonne sans elle.
  // Avec un créneau : le rendez-vous est l'action, « m'écrire » est le repli.
  // Sans créneau : « m'écrire » DEVIENT l'action. Jamais deux boutons pleins.
  const principal: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '0 var(--space-6)',
    borderRadius: 'var(--r-pill)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  }
  const secondaire: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-mid)',
    textDecoration: 'none',
  }

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
        {rdv ? (
          <>
            <a href={rdv} target="_blank" rel="noreferrer noopener" style={principal}>
              Prendre 15 minutes
            </a>
            <a href={mail} style={secondaire}>M’écrire</a>
          </>
        ) : (
          <a href={mail} style={principal}>M’écrire</a>
        )}
      </div>

      <p style={{ margin: 'var(--space-4) 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
        Ou répondez simplement au message par lequel vous êtes arrivé ici — c’est moi qui lis.
      </p>
    </section>
  )
}

function Pied() {
  return (
    <footer
      style={{
        marginTop: 'var(--space-12)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-5)',
        fontSize: 12,
        color: 'var(--text-dim)',
      }}
    >
      <span>THW Coaching</span>
      <Link href="/legal/cgu" style={{ color: 'inherit', textDecoration: 'none' }}>Conditions</Link>
      <Link href="/legal/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Confidentialité</Link>
      <Link href="/auth" style={{ color: 'inherit', textDecoration: 'none', marginLeft: 'auto' }}>
        Se connecter
      </Link>
    </footer>
  )
}
