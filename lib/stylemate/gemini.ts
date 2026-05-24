import {
  APPAREL_CATEGORIES,
  ARCHETYPES,
} from '@/lib/stylemate/constants'
import type { ApparelCategory, GeminiTagResult, WardrobeArchetype } from '@/types/stylemate'

const VALID_CATEGORIES = new Set(APPAREL_CATEGORIES.map((c) => c.value))
const VALID_ARCHETYPES = new Set(ARCHETYPES.map((a) => a.value))

const ANALYSIS_PROMPT = `Analyze this clothing item photo and return ONLY valid JSON with these exact fields:
{
  "name": "short descriptive name",
  "category": one of "top", "bottom", "outerwear", "footwear", "accessory",
  "sub_type": "specific type e.g. short_sleeve, hoodie, jeans, sneakers",
  "color": "primary color as snake_case e.g. royal_blue, cream, black",
  "min_temp_threshold": integer Fahrenheit minimum comfortable temp,
  "max_temp_threshold": integer Fahrenheit maximum comfortable temp,
  "archetype": one of "casual_weekend", "gym_grind", "client_meeting", "old_money"
}
No markdown, no explanation, JSON only.`

function parseCategory(value: unknown): ApparelCategory {
  if (typeof value === 'string' && VALID_CATEGORIES.has(value as ApparelCategory)) {
    return value as ApparelCategory
  }
  return 'top'
}

function parseArchetype(value: unknown): WardrobeArchetype {
  if (typeof value === 'string' && VALID_ARCHETYPES.has(value as WardrobeArchetype)) {
    return value as WardrobeArchetype
  }
  return 'casual_weekend'
}

function parseNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as Record<string, unknown>
}

function normalizeResult(raw: Record<string, unknown>): GeminiTagResult {
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Clothing item',
    category: parseCategory(raw.category),
    sub_type: typeof raw.sub_type === 'string' ? raw.sub_type.trim() : '',
    color: typeof raw.color === 'string' && raw.color.trim() ? raw.color.trim() : 'unknown',
    min_temp_threshold: parseNumber(raw.min_temp_threshold, 32),
    max_temp_threshold: parseNumber(raw.max_temp_threshold, 85),
    archetype: parseArchetype(raw.archetype),
  }
}

export async function analyzeClothingImage(
  imageBase64: string,
  mimeType: string
): Promise<GeminiTagResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${detail}`)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned no analysis result')
  }

  return normalizeResult(extractJson(text))
}
