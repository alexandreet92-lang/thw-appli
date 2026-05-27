import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const { exercise } = await req.json()
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Tu es un coach yoga/mobilité expert. Pour l'exercice "${exercise}", donne 2 conseils courts et pratiques pour bien l'exécuter. Format : 2 phrases maximum, ton bienveillant et encourageant. Langue : français. Pas de titre, juste les conseils.`,
      }],
    })
    const tip = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ tip })
  } catch {
    return Response.json({ tip: '' }, { status: 200 })
  }
}
