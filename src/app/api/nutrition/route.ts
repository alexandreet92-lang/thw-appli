import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Tu es un expert en nutrition sportive. Analyse ce repas et calcule les valeurs nutritionnelles PRÉCISES.

Repas : "${text}"

Instructions :
- Utilise tes connaissances et recherche si nécessaire pour les produits de marque
- Quantités non précisées → portion standard réaliste (1 œuf = 60g, 1 banane = 120g, 1 yaourt = 125g, 1 CS miel = 21g)
- Calcule le TOTAL de tous les aliments
- Sois précis

Réponds UNIQUEMENT avec ce JSON exact, rien d'autre :
{"name":"description courte du repas","cal":730,"p":33,"g":92,"l":18,"detail":"détail par aliment : oeuf x3 = 234kcal, yaourt grec = 97kcal, etc"}`
      }]
    })
  })

  const data = await response.json()

  // Extraire le texte de la réponse (peut contenir des tool_use blocks)
  let text_response = ''
  if (data.content) {
    for (const block of data.content) {
      if (block.type === 'text') {
        text_response += block.text
      }
    }
  }

  try {
    const clean = text_response.replace(/```json|```/g, '').trim()
    // Extraire le JSON même s'il y a du texte autour
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data: parsed })
  } catch {
    return NextResponse.json({ success: false, error: 'Parse error', raw: text_response })
  }
}
