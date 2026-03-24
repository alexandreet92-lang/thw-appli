'use client'

import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const MICROS = [
  { label: 'Fer',        value: '14mg',  target: '18mg',  pct: 78, color: 'bg-[#ff5f5f]' },
  { label: 'Magnésium',  value: '310mg', target: '400mg', pct: 77, color: 'bg-[#5b6fff]' },
  { label: 'Potassium',  value: '3.1g',  target: '3.5g',  pct: 88, color: 'bg-[#ffb340]' },
  { label: 'Calcium',    value: '780mg', target: '1000mg',pct: 78, color: 'bg-brand' },
  { label: 'Sodium',     value: '2.1g',  target: '2.3g',  pct: 91, color: 'bg-[#00e5ff]' },
]

const INITIAL_MESSAGES = [
  {
    role: 'ai',
    content: '👋 Bonjour Thomas ! Décris ton repas ou pose-moi une question. J\'analyse tes apports et te donne des conseils adaptés à ton entraînement.',
  },
  {
    role: 'user',
    content: 'J\'ai mangé ce matin : 3 œufs brouillés, une tranche de pain complet, du beurre et un café. Avant vélo à 17h30.',
  },
  {
    role: 'ai',
    content: '✅ Repas analysé\n\n🥚 3 œufs — 210 kcal · 18g P · 0g G · 15g L\n🍞 Pain complet — 80 kcal · 3g P · 15g G · 1g L\n🧈 Beurre 10g — 75 kcal · 0g P · 0g G · 8g L\n\nTotal : 365 kcal · 21g prot · 15g gluc · 24g lip\n\n⚡ Pour ta séance à 17h30, ajoute 60-80g de glucides vers 15h30.',
  },
]

const AI_RESPONSES = [
  '📊 Repas analysé. Calcul des apports en cours... Bon équilibre P/G pour une séance du matin. Pense à t\'hydrater — vise 500ml avant ta séance.',
  '⚡ Pour optimiser en Z3, prends 30–40g de glucides rapides 45min avant. Banane + gel ou riz + miel.',
  '🔍 Ratio protéines insuffisant pour la récupération post-Hyrox. Ajoute fromage blanc, œufs ou shake whey ce soir.',
  '💡 Ta moyenne glucidique cette semaine est en dessous des recommandations pour ton volume. +50–70g/jour conseillés les jours de double séance.',
]

function ProgressBar({ label, value, target, pct, color }: {
  label: string; value: string; target: string; pct: number; color: string
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[var(--text-mid)]">{label}</span>
        <span className="font-mono font-medium">{value} <span className="text-[var(--text-dim)]">/ {target}</span></span>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden bg-[var(--border)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [msgIdx, setMsgIdx] = useState(0)

  function sendMessage() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    const aiMsg = { role: 'ai', content: AI_RESPONSES[msgIdx % AI_RESPONSES.length] }
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setMsgIdx((i) => i + 1)
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Nutrition</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">Suivi alimentaire · IA Coach Nutrition</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Journal</Button>
          <Button variant="primary">+ Repas</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Calories" value="2 840" unit="kcal" variant="orange"
          sub={<span className="text-[var(--text-dim)]">Objectif : 3 100</span>}/>
        <StatCard label="Protéines" value={168} unit="g" variant="blue"
          sub={<span className="text-brand">2.3g/kg · Bien</span>}/>
        <StatCard label="Glucides" value={340} unit="g" variant="brand"
          sub={<span className="text-[#ff5f5f]">↓ Bas pour J. séance</span>}/>
        <Card>
          <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-dim)] mb-2.5">Lipides</p>
          <p className="font-display text-[30px] font-bold tracking-[-0.04em] leading-none text-[#ffb340]">
            88<span className="text-[13px] font-normal text-[var(--text-dim)] ml-1">g</span>
          </p>
          <p className="text-[12px] text-[var(--text-dim)] mt-2">28% · OK</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3.5">

        {/* Micronutriments */}
        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-4">
            Micronutriments
          </h2>
          {MICROS.map((m) => (
            <ProgressBar key={m.label} {...m} />
          ))}
        </Card>

        {/* Chat IA */}
        <div>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
            Assistant IA Nutrition
          </h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-card overflow-hidden flex flex-col" style={{ height: '360px' }}>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed',
                    m.role === 'ai'
                      ? 'self-start rounded-[4px_12px_12px_12px] bg-[rgba(0,200,224,0.07)] border border-[rgba(0,200,224,0.12)]'
                      : 'self-end rounded-[12px_4px_12px_12px] bg-[rgba(91,111,255,0.10)] border border-[rgba(91,111,255,0.15)]'
                  )}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {m.content}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--border)] flex gap-2 bg-[var(--bg-card2)]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Décris ton repas ou pose une question…"
                className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] rounded-[10px] px-3.5 py-2 text-[13px] text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[rgba(0,200,224,0.4)] transition-colors"
              />
              <button
                onClick={sendMessage}
                className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-brand to-brand-purple shadow-brand transition-all hover:brightness-110"
              >
                <svg className="w-[15px] h-[15px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
