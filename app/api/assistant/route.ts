import { NextResponse } from 'next/server'

const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
// Qwen 2.5 1.5B keeps local inference responsive on typical development machines.
const model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : ''
    const services = Array.isArray(body.services) ? body.services.slice(0, 50) : []

    if (!details) return NextResponse.json({ error: 'Describe el problema que necesitas resolver.' }, { status: 400 })

    const catalog = services
      .map((service: { CategoryName?: string; Title?: string; ProviderName?: string }) => `${service.CategoryName || ''}: ${service.Title || ''} (${service.ProviderName || ''})`)
      .join('\n')

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        prompt: `Eres el asistente de ServiciosYa, un marketplace de servicios para el hogar. Analiza el problema del cliente y recomienda una categoría y una búsqueda del catálogo. No inventes prestadores. Responde únicamente JSON válido con las claves category, search y answer. category debe ser una categoría exacta del catálogo o una cadena vacía. search debe ser una frase corta para buscar. answer debe ser una recomendación clara en español de máximo 3 frases.\n\nProblema del cliente:\n${details}\n\nCatálogo disponible:\n${catalog}`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) throw new Error('Ollama no está disponible. Verifica que esté ejecutándose en tu equipo.')
    const result = await response.json()
    const parsed = typeof result.response === 'string' ? JSON.parse(result.response) : result.response

    return NextResponse.json({
      category: typeof parsed.category === 'string' ? parsed.category : '',
      search: typeof parsed.search === 'string' ? parsed.search : '',
      answer: typeof parsed.answer === 'string' ? parsed.answer : 'Revisa las opciones disponibles y elige el prestador que mejor se adapte a tu necesidad.',
    })
  } catch (error) {
    const message = error instanceof SyntaxError
      ? 'El asistente devolvió una respuesta no válida. Intenta de nuevo.'
      : error instanceof Error && error.name === 'TimeoutError'
        ? 'Ollama tardó demasiado en responder. Intenta de nuevo.'
        : error instanceof Error
          ? error.message
          : 'No pudimos consultar el asistente local.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

