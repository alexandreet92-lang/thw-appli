#!/usr/bin/env tsx
// ══════════════════════════════════════════════════════════════
// Test : add_week en mode non-streaming
// Vérifie que l'appel Anthropic (sans stream) retourne bien un
// bloc tool_use de type add_week avec sessions[] complet.
//
// Exécution :
//   npx tsx src/scripts/test-coach-stream.ts
//   (depuis la racine du projet, avec .env.local présent)
// ══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import * as path from 'path'
import * as fs from 'fs'

// Charge .env.local manuellement (tsx ne charge pas Next.js env, dotenv non installé)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  }
  console.log('✅ .env.local chargé')
} else {
  console.warn('⚠️  .env.local introuvable — ANTHROPIC_API_KEY doit être dans l\'env')
}

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY manquante')
  process.exit(1)
}

// ── Tools identiques à ceux de la route ──────────────────────

import { coachTools } from '../lib/coach/tools-definition'

// ── Données fictives ──────────────────────────────────────────

const FAKE_PLAN_ID   = '00000000-0000-0000-0000-000000000001'
const FAKE_WEEK5_START = '2026-06-01' // un lundi fictif pour S5

const SYSTEM_PROMPT = `
Tu es un coach triathlon expert. Voici le plan actif de l'athlète.

=== PLAN ACTIF — STRUCTURE RÉELLE ===
Plan : Plan Triathlon Test
Objectif : Finisher sur triathlon MD en septembre
Période : 2026-04-28 → 2026-08-31 (18 semaines)
training_plan_id : ${FAKE_PLAN_ID}

Structure semaine par semaine :

SEMAINE 1 (2026-04-28) :
  Lundi   : Sortie Z2 [run · low, 1h30, id:aaa-001]
  Mercredi: Vélo endurance [bike · low, 2h00, id:aaa-002]
  Vendredi: Natation technique [swim · moderate, 1h00, id:aaa-003]

SEMAINE 2 (2026-05-05) :
  Lundi   : Fartlek [run · high, 1h15, id:bbb-001]
  Mercredi: Sortie longue vélo [bike · moderate, 2h30, id:bbb-002]
  Vendredi: Natation intervalles [swim · high, 1h00, id:bbb-003]
  Samedi  : Brique vélo+run [bike+run · moderate, 2h00, id:bbb-004]

SEMAINE 3 (2026-05-12) :
  Lundi   : Seuil run [run · high, 1h00, id:ccc-001]
  Mercredi: Vélo Z3 [bike · moderate, 1h45, id:ccc-002]
  Vendredi: Natation Z2 [swim · low, 45min, id:ccc-003]

SEMAINE 4 (2026-05-19) :
  Lundi   : Run facile [run · low, 45min, id:ddd-001]
  Mercredi: Vélo récup [bike · low, 1h00, id:ddd-002]
  Vendredi: Natation courte [swim · low, 30min, id:ddd-003]

SEMAINE 5 (${FAKE_WEEK5_START}) :
  ⚠️ AUCUNE SÉANCE — semaine vide

Tu as accès à des outils pour modifier directement le plan.
Quand une semaine est marquée "⚠️ AUCUNE SÉANCE — semaine vide" → utilise OBLIGATOIREMENT add_week.
Tu es un coach expert — TU DÉCIDES du contenu des séances.
Pour une semaine de deload : réduis le volume de 40-50%, intensité low/moderate.
`

// ── Appel Anthropic ───────────────────────────────────────────

async function runTest() {
  console.log('\n🚀 Test coach-stream — add_week non-streaming\n')

  const client = new Anthropic({ apiKey })

  console.log('📡 Appel Anthropic (non-streaming, with tools)...')
  const t0 = Date.now()

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: 'La semaine 5 est vide, remplis-la avec un deload adapté au triathlon.' }
    ],
    tools:      coachTools,
    tool_choice: { type: 'auto' },
  })

  const elapsed = Date.now() - t0
  console.log(`✅ Réponse reçue en ${elapsed}ms`)
  console.log(`   stop_reason : ${response.stop_reason}`)
  console.log(`   blocs       : ${response.content.length}`)
  console.log(`   tokens      : input=${response.usage.input_tokens} output=${response.usage.output_tokens}`)

  // ── Analyse des blocs ─────────────────────────────────────────
  let passed = true
  let toolUseBlock: Anthropic.ToolUseBlock | undefined

  for (let i = 0; i < response.content.length; i++) {
    const block = response.content[i]
    console.log(`\n  Bloc [${i}] type=${block.type}`)

    if (block.type === 'text') {
      console.log(`    text (${block.text.length} chars): "${block.text.slice(0, 80)}..."`)
    } else if (block.type === 'tool_use') {
      toolUseBlock = block
      const inp = block.input as Record<string, unknown>
      console.log(`    tool_name : ${block.name}`)
      console.log(`    input keys: ${Object.keys(inp).join(', ')}`)

      const sessions = inp['sessions'] as unknown[] | undefined
      if (sessions) {
        console.log(`    sessions[] : ${sessions.length} séances`)
        sessions.forEach((s, si) => {
          const sess = s as Record<string, unknown>
          console.log(`      [${si}] day=${sess['day_index']} sport=${sess['sport']} title="${sess['title']}" dur=${sess['duration_min']}min`)
        })
      }
    }
  }

  // ── Assertions ────────────────────────────────────────────────
  console.log('\n── Assertions ─────────────────────────────────')

  function assert(label: string, value: boolean) {
    if (value) {
      console.log(`  ✅ ${label}`)
    } else {
      console.error(`  ❌ ÉCHEC : ${label}`)
      passed = false
    }
  }

  assert('Au moins un bloc tool_use présent', toolUseBlock !== undefined)

  if (toolUseBlock) {
    const inp = toolUseBlock.input as Record<string, unknown>
    const sessions = inp['sessions'] as unknown[] | undefined

    assert('tool_name === "add_week"',            toolUseBlock.name === 'add_week')
    assert('training_plan_id présent',             typeof inp['training_plan_id'] === 'string')
    assert('week_start présent',                   typeof inp['week_start'] === 'string')
    assert('week_type présent',                    typeof inp['week_type'] === 'string')
    assert('sessions[] présent et non-vide',       Array.isArray(sessions) && sessions.length > 0)

    if (Array.isArray(sessions) && sessions.length > 0) {
      const first = sessions[0] as Record<string, unknown>
      assert('sessions[0].day_index est un number', typeof first['day_index'] === 'number')
      assert('sessions[0].sport présent',           typeof first['sport'] === 'string')
      assert('sessions[0].title présent',           typeof first['title'] === 'string')
      assert('sessions[0].duration_min présent',    typeof first['duration_min'] === 'number')
    }

    // Vérif week_start correspond à la semaine 5 fictive
    assert(`week_start === "${FAKE_WEEK5_START}"`, inp['week_start'] === FAKE_WEEK5_START)
  }

  // ── Résultat final ────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  if (passed) {
    console.log('🎉 TOUS LES TESTS PASSENT — route non-streaming prête')
  } else {
    console.error('💥 DES TESTS ÉCHOUENT — vérifie les assertions ci-dessus')
    process.exit(1)
  }
}

runTest().catch(err => {
  console.error('💥 Erreur inattendue:', err)
  process.exit(1)
})
