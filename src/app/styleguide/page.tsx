'use client'
// Page vivante du design system : TOUT nouvel écran se construit à partir de ces briques.
// Route publique /styleguide (lecture seule, aucune donnée). Référence : docs/DESIGN_SYSTEM.md.
import { useState } from 'react'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card'
import { Badge } from '@/components/shadcn/badge'
import { Input } from '@/components/shadcn/input'
import { Switch } from '@/components/shadcn/switch'
import { Skeleton } from '@/components/shadcn/skeleton'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedList, AnimatedItem } from '@/components/motion/AnimatedList'
import { Reveal } from '@/components/motion/Reveal'

const RADII = [['--r-sm', '8 — champs, puces'], ['--r-md', '14 — cartes'], ['--r-lg', '20 — feuilles, grandes cartes'], ['--r-pill', '999 — boutons, onglets']] as const
const COLORS = ['--bg', '--bg-card', '--bg-card2', '--text', '--text-mid', '--text-dim', '--primary', '--danger', '--border'] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}>{title}</h2>
        {children}
      </section>
    </Reveal>
  )
}

export default function StyleguidePage() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [on, setOn] = useState(true)
  return (
    <main style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh', padding: '28px 20px 80px', maxWidth: 560, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>Design system</h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 32px' }}>Référence unique. Un écran n’invente rien : il assemble ces briques.</p>

      <Section title="Typographie">
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>Titre de page · Fraunces 28</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500 }}>Accroche · Fraunces 17</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>Titre de section · Fraunces 15</div>
          <div style={{ fontSize: 14 }}>Corps · Inter 14</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Label · Inter 13</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)' }}>Micro / méta · Inter 11</div>
          <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>1 234,5 · Métrique 22</div>
        </div>
      </Section>

      <Section title="Couleurs (tokens)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {COLORS.map(c => (
            <div key={c}>
              <div style={{ height: 44, borderRadius: 'var(--r-sm)', background: `var(${c})`, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent)' }} />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{c}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rayons">
        <div style={{ display: 'grid', gap: 10 }}>
          {RADII.map(([t, d]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 40, background: 'var(--bg-card2)', borderRadius: `var(${t})` }} />
              <span style={{ fontSize: 13 }}>{t} <span style={{ color: 'var(--text-dim)' }}>{d}</span></span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Boutons">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="inverse">Inversé</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button size="sm">Petit</Button>
          <Button variant="link">Lien</Button>
        </div>
      </Section>

      <Section title="Cartes, badges, champs">
        <Card>
          <CardHeader><CardTitle>Titre de carte</CardTitle><CardDescription>Description secondaire</CardDescription></CardHeader>
          <CardContent style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}><Badge>Badge</Badge><Badge variant="secondary">Neutre</Badge></div>
            <Input placeholder="Champ de saisie" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>Interrupteur <Switch checked={on} onCheckedChange={setOn} /></div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Segmented">
        <Segmented options={[{ id: 'a', label: 'Jour' }, { id: 'b', label: 'Semaine' }, { id: 'c', label: 'Mois' }]} value={seg} onChange={setSeg} />
      </Section>

      <Section title="Listes animées">
        <AnimatedList>
          {['Séance 1', 'Séance 2', 'Séance 3'].map((l, i) => (
            <AnimatedItem key={l} index={i}>
              <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 8, fontSize: 14 }}>{l}</div>
            </AnimatedItem>
          ))}
        </AnimatedList>
      </Section>

      <Section title="Chargement (squelette, jamais de spinner)">
        <div style={{ display: 'grid', gap: 8 }}><Skeleton className="h-4 w-2/3" /><Skeleton className="h-16 w-full" /></div>
      </Section>
    </main>
  )
}
