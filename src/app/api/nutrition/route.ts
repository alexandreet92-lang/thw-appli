import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing API key' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Analyse ce repas, calcule les valeurs nutritionnelles précises. Repas: "${text}". Réponds UNIQUEMENT avec ce JSON sans rien d'autre: {"name":"nom court","cal":500,"p":30,"g":60,"l":15,"detail":"aliment1=Xkcal · aliment2=Xkcal"}`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ success: false, error: `API error ${response.status}: ${err}` })
    }

    const data = await response.json()
    const textResponse = data.content?.find((b: any) => b.type === 'text')?.text || ''
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data: parsed })

  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) })
  }
}
