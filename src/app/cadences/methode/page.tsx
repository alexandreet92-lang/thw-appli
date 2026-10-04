// CADENCES — méthode, barème, qualités, limites (§18). Contenu pédagogique, sans
// promesse médicale. Niveaux et qualités lus depuis la config (source de vérité).
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { CONFIG, QUALITIES } from '@/lib/cadences/catalog'
import { DAYS } from '@/lib/cadences/catalog'
import { levelColor } from '@/lib/cadences/palette'

export const dynamic = 'force-static'

const QUALITY_DEFS: Record<string, string> = {
  vitesse: 'Capacité à se déplacer vite sur une distance courte à moyenne.',
  force: 'Charge maximale que tu peux déplacer sur un mouvement donné.',
  puissance: 'Produire beaucoup de force rapidement (force × vitesse).',
  explosivite: 'Déclencher un effort maximal en une fraction de seconde.',
  endurance: 'Tenir un effort soutenu dans la durée.',
  vo2max: 'Cylindrée aérobie : ta capacité à consommer de l’oxygène à haute intensité.',
  coordination: 'Enchaîner des mouvements précis et efficaces, surtout sous fatigue.',
}

// Plages d'affichage des niveaux (§11) — habillage, ne change jamais le calcul.
const LEVEL_RANGES: Record<string, string> = {
  Faible: '< 20 %', Insuffisant: '20–39 %', Moyen: '40–59 %', Référence: '60–79 %',
  Solide: '80–99 %', Élite: '100–119 %', Exceptionnel: '≥ 120 %',
}

export default function MethodePage() {
  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <h1 style={h1}>La méthode CADENCES</h1>
        <Link href="/cadences" style={lien}>← Accueil</Link>
      </div>

      <Section title="Comment est calculé ton score">
        <p style={p}>
          Chaque épreuve a deux repères : <strong>Référence</strong> (noté 60 %) et <strong>Maximum</strong> (noté 100 %).
          Entre les deux, les points montent de façon <strong>linéaire</strong>. Au-dessus du Max, ça continue de monter
          <strong> sans plafond</strong> ; en dessous de la Référence, ça descend jusqu’à 0 (jamais négatif).
        </p>
        <p style={p}>
          Le score global est la <strong>somme des points</strong> de toutes les épreuves. Le total de référence est
          fixé à <strong>1000 points</strong> : c’est le niveau d’un athlète « Référence » partout. On peut
          donc dépasser 1000.
        </p>
      </Section>

      <Section title="Barème général ou ajusté à l'âge">
        <p style={p}>
          Le barème <strong>général</strong> est calé sur 21–35 ans. Le barème <strong>ajusté à l’âge</strong>
          {' '}assouplit les repères selon ta tranche (12 tranches de 18 à 80 ans), différemment par qualité — et
          <strong> beaucoup moins</strong> sur les efforts très courts (un sprint vieillit moins vite qu’un 3200 m).
          Tu peux basculer entre les deux sur ta page de résultats.
        </p>
      </Section>

      <Section title="Les 7 qualités">
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {QUALITIES.map((q) => (
            <div key={q.key} style={row}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, minWidth: 120 }}>{q.label}</span>
              <span style={{ ...muted, margin: 0 }}>{QUALITY_DEFS[q.key]}</span>
            </div>
          ))}
          <p style={{ ...muted }}>La <strong>souplesse</strong> n’est pas évaluée par CADENCES.</p>
        </div>
      </Section>

      <Section title="Les niveaux">
        <p style={p}>Un libellé lisible posé sur ton pourcentage. Il ne change jamais le calcul, juste la lecture.</p>
        <div style={{ display: 'grid', gap: 6 }}>
          {CONFIG.levels.map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: levelColor(l.label), flexShrink: 0 }} aria-hidden />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, minWidth: 110 }}>{l.label}</span>
              <span style={{ ...muted, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{LEVEL_RANGES[l.label] ?? ''}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Le protocole, sur 12 jours">
        <p style={p}>
          L’ordre est <strong>fixe</strong> et se répète à l’identique chaque année : le but est la
          <strong> comparabilité</strong>, pas la performance maximale isolée. La fatigue accumulée fait partie du test —
          récupérer vite est une qualité. Les jours de repos sont conservés.
        </p>
        <div style={{ display: 'grid', gap: 4 }}>
          {DAYS.map((d) => (
            <div key={d.day} style={{ display: 'flex', gap: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-dim)', minWidth: 34, fontVariantNumeric: 'tabular-nums' }}>J{d.day}</span>
              <span style={{ color: d.rest ? 'var(--text-dim)' : 'var(--text)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Équipement">
        <p style={p}>
          Base de comparaison : <strong>chaussures normales, sans ceinture</strong>. Si tu utilises des pointes
          (sprints, 400 m, 3200 m) ou une ceinture (squat, soulevé de terre), une petite correction ramène ton résultat
          à cette base. Ces corrections sont des <strong>estimations</strong>.
        </p>
      </Section>

      <Section title="Consentement et données">
        <p style={p}>
          Tes résultats sont <strong>privés</strong> et rattachés à ton compte. Tu peux, en option et de façon
          révocable, accepter qu’ils servent <strong>anonymisés</strong> à affiner les barèmes. Aucune donnée
          individuelle n’est publiée, ni exploitée commercialement.
        </p>
      </Section>

      <Section title="Avertissements et limites">
        <p style={p}>
          CADENCES demande des efforts intenses : un <strong>avis médical</strong> est conseillé avant de tester. Ce
          n’est <strong>pas un diagnostic</strong> médical. Les barèmes par âge sont des <strong>estimations</strong>
          {' '}(littérature masters), calibrées pour des pratiquants réguliers, pas pour la population générale — elles
          s’affineront avec les données consenties.
        </p>
        <p style={{ ...muted }}>Version du barème : <strong>{CONFIG.version}</strong>.</p>
      </Section>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <Link href="/cadences" style={lien}>← Retour à l’accueil CADENCES</Link>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-6)' }}>
      <h2 style={h2}>{title}</h2>
      <div style={{ marginTop: 'var(--space-2)' }}>{children}</div>
    </section>
  )
}

const wrap: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: 'var(--space-8) var(--space-5) var(--space-10)' }
const h1: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 600, margin: 0 }
const h2: CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }
const p: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--text-mid)', margin: '0 0 var(--space-2)' }
const muted: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0' }
const lien: CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', textDecoration: 'none' }
const row: CSSProperties = { display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', flexWrap: 'wrap' }
