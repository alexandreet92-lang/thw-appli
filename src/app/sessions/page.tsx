'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const SPORTS = [
  { id: 'run',   emoji: '🏃', label: 'Running' },
  { id: 'bike',  emoji: '🚴', label: 'Vélo' },
  { id: 'swim',  emoji: '🏊', label: 'Natation' },
  { id: 'hyrox', emoji: '🏋️', label: 'Hyrox' },
  { id: 'row',   emoji: '🚣', label: 'Ergo' },
]

const INITIAL_BLOCKS = [
  { id: '1', type: 'warmup',   name: 'Échauffement progressif', detail: 'Z1 → Z2 · Allure libre',     duration: '15:00' },
  { id: '2', type: 'effort',   name: "Intervalle 1 — 4'15/km",  detail: 'Z4 · 4\'10–4\'20/km · RPE 7', duration: '08:00' },
  { id: '3', type: 'recovery', name: 'Récupération active',      detail: 'Z1 · Footing lent',           duration: '03:00' },
  { id: '4', type: 'effort',   name: "Intervalle 2 — 4'15/km",  detail: 'Z4 · 4\'10–4\'20/km · RPE 8', duration: '08:00' },
  { id: '5', type: 'recovery', name: 'Récupération active',      detail: 'Z1 · Footing lent',           duration: '03:00' },
  { id: '6', type: 'effort',   name: "Intervalle 3 — 4'15/km",  detail: 'Z4 · RPE 8',                  duration: '08:00' },
  { id: '7', type: 'cooldown', name: 'Retour au calme',          detail: 'Z1 · Allure très lente',      duration: '20:00' },
]

const BLOCK_STYLES: Record<string, string> = {
  warmup:   'border-l-[3px] border-[#00e5ff]',
  effort:   'border-l-[3px] border-[#ff5f5f]',
  recovery: 'border-l-[3px] border-brand',
  cooldown: 'border-l-[3px] border-[#5b6fff]',
}

const INTENSITY_BARS = [30,35,55,60,80,85,100,95,80,75,100,90,50,45,30,25]
const INTENSITY_COLORS = [
  'rgba(0,229,255,0.3)','rgba(0,229,255,0.3)',
  'rgba(0,200,224,0.5)','rgba(0,200,224,0.5)',
  'rgba(255,179,64,0.55)','rgba(255,179,64,0.55)',
  'rgba(255,95,95,0.65)','rgba(255,95,95,0.65)',
  'rgba(255,179,64,0.55)','rgba(255,179,64,0.55)',
  'rgba(255,95,95,0.65)','rgba(255,95,95,0.65)',
  'rgba(0,200,224,0.5)','rgba(0,200,224,0.5)',
  'rgba(0,229,255,0.3)','rgba(0,229,255,0.3)',
]

const ZONES = [
  { z: 'Z1', flex: 15, bg: 'rgba(0,229,255,0.25)', color: 'text-[#00e5ff]', pct: '15%' },
  { z: 'Z2', flex: 25, bg: 'rgba(0,200,224,0.30)', color: 'text-brand',     pct: '25%' },
  { z: 'Z3', flex: 20, bg: 'rgba(255,179,64,0.35)',color: 'text-[#ffb340]', pct: '20%' },
  { z: 'Z4', flex: 30, bg: 'rgba(255,95,95,0.35)', color: 'text-[#ff5f5f]', pct: '30%' },
  { z: 'Z5', flex: 10, bg: 'rgba(220,40,40,0.40)', color: 'text-red-500',   pct: '10%' },
]

export default function SessionsPage() {
  const [selectedSport, setSelectedSport] = useState('run')
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS)

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Session Builder</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Créez et structurez vos séances d'entraînement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Charger template</Button>
          <Button variant="primary">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/>
            </svg>
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">

        {/* Colonne gauche — config */}
        <div className="flex flex-col gap-3.5">

          {/* Sport selector */}
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">Sport</h2>
            <div className="flex gap-2 flex-wrap mb-4">
              {SPORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSport(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-tag border text-[11px] transition-all',
                    selectedSport === s.id
                      ? 'bg-[rgba(0,200,224,0.10)] border-[rgba(0,200,224,0.25)] text-brand'
                      : 'bg-[var(--bg-card2)] border-[var(--border)] text-[var(--text-dim)] hover:border-brand hover:text-brand'
                  )}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[11px] text-[var(--text-dim)] mb-1">Durée totale</p>
                <div className="bg-[var(--bg-card2)] border border-[var(--border)] rounded-[8px] px-3 py-2 font-mono text-[14px]">
                  1h 05min
                </div>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-dim)] mb-1">TSS estimé</p>
                <div className="bg-[var(--bg-card2)] border border-[var(--border)] rounded-[8px] px-3 py-2 font-mono text-[14px] text-brand">
                  72 pts
                </div>
              </div>
            </div>

            {/* Profil intensité */}
            <p className="text-[11px] text-[var(--text-dim)] mb-2">Profil d'intensité</p>
            <div className="flex gap-[2px] items-end h-11 bg-[var(--bg-card2)] rounded-[8px] px-2 py-1.5 border border-[var(--border)]">
              {INTENSITY_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px]"
                  style={{ height: `${h}%`, background: INTENSITY_COLORS[i] }}
                />
              ))}
            </div>
          </Card>

          {/* Zones */}
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">Zones</h2>
            <div className="flex gap-[2px] h-7 rounded-[8px] overflow-hidden mb-2">
              {ZONES.map((z) => (
                <div
                  key={z.z}
                  className={cn('flex items-center justify-center text-[10px] font-semibold', z.color)}
                  style={{ flex: z.flex, background: z.bg }}
                >
                  {z.z}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {ZONES.map((z) => (
                <div key={z.z} className="text-center">
                  <p className={cn('text-[11px] font-semibold', z.color)}>{z.z}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">{z.pct}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Colonne droite — blocs */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
              Blocs de séance
            </h2>
            <Button variant="primary" size="sm">+ Ajouter</Button>
          </div>

          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <div
                key={b.id}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-[10px]',
                  'bg-[var(--bg-card)] border border-[var(--border)]',
                  'hover:border-[var(--border-mid)] transition-all cursor-grab',
                  BLOCK_STYLES[b.type]
                )}
              >
                <span className="text-[var(--text-dim)] text-[16px] cursor-grab">⠿</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium">{b.name}</p>
                  <p className="text-[11px] text-[var(--text-dim)] font-mono">{b.detail}</p>
                </div>
                <span className="font-mono text-[13px] text-[var(--text-mid)] flex-shrink-0">{b.duration}</span>
                <button
                  onClick={() => removeBlock(b.id)}
                  className="text-[var(--text-dim)] hover:text-[#ff5f5f] transition-colors flex-shrink-0 ml-1"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-3 mt-1 border-t border-[var(--border)] text-[12px] text-[var(--text-dim)]">
            <span>Total : <span className="text-[var(--text)] font-mono">1:05:00</span></span>
            <span>Allure moy. est. : <span className="text-brand font-mono">4'32/km</span></span>
          </div>
        </Card>
      </div>
    </div>
  )
}
