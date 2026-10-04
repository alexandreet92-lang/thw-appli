// CADENCES — entrée du test (site, connecté ; middleware gate /cadences).
// Présentation + démarrer / reprendre une campagne + historique.
import { createClient } from '@/lib/supabase/server'
import { StartCampaign, type Campagne } from './StartCampaign'

export const dynamic = 'force-dynamic'

export default async function CadencesPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data } = user
    ? await sb.from('cadences_campaigns')
        .select('id, status, scale_sex, age_at_start, age_band, body_weight_kg, started_on, completed_on')
        .order('started_on', { ascending: false })
    : { data: [] }
  const campagnes = (data ?? []) as Campagne[]

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-8) var(--space-5) var(--space-10)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Le test physique</span>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, margin: 'var(--space-2) 0 0', letterSpacing: '.01em' }}>CADENCES</h1>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, lineHeight: 1.4, margin: 'var(--space-3) 0 0' }}>
        Mesurez vraiment où vous en êtes, physiquement — et suivez vos progrès chaque année.
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--text-mid)', margin: 'var(--space-4) 0 0' }}>
        24 épreuves réparties sur 12 jours et 3 familles (course, force, haltérophilie). Un score sur
        1000 et un niveau par qualité, en barème général ou ajusté à votre âge. Réservé aux 18 à 80 ans.
      </p>

      <section style={{ marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Pre t="7 qualités" d="Vitesse, Force, Puissance, Explosivité, Endurance, VO2max, Coordination." />
        <Pre t="12 jours" d="Un protocole fixe, à refaire à l'identique d'une année sur l'autre." />
        <Pre t="Matériel" d="Stade/piste, salle de muscu, piscine, vélo avec capteur, barre de traction." />
      </section>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <StartCampaign campagnes={campagnes} />
      </div>
    </main>
  )
}

function Pre({ t, d }: { t: string; d: string }) {
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{t}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)', marginTop: 4 }}>{d}</div>
    </div>
  )
}
