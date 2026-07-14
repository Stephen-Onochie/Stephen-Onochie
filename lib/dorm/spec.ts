import { z } from 'zod'

// Primitive-assembly spec for AI-generated furniture. Units are feet; the
// engine's _buildSpec renders exactly this shape. Bounds are generous but
// capped so a bad generation can't fill the room.
const deg = z.number().min(-360).max(360)
const scaleAxis = z.number().min(0.1).max(4)

export const specPartSchema = z
  .object({
    shape: z.enum(['box', 'cylinder', 'sphere', 'capsule', 'torus']),
    size: z.tuple([z.number().positive().max(10), z.number().positive().max(10), z.number().positive().max(10)]).optional(),
    radius: z.number().positive().max(5).optional(),
    radiusTop: z.number().min(0).max(5).optional(),
    height: z.number().positive().max(10).optional(),
    tube: z.number().positive().max(3).optional(),
    position: z.tuple([z.number().min(-10).max(10), z.number().min(-2).max(10), z.number().min(-10).max(10)]),
    // Squash/stretch lets spheres become blobs and cushions become ovals.
    scale: z.tuple([scaleAxis, scaleAxis, scaleAxis]).optional(),
    rotationX: deg.optional(),
    rotationY: deg.optional(),
    rotationZ: deg.optional(),
    // Optional: the engine falls back to a wood tone. Kept lenient because
    // vision models return colors in many shapes; normalizeSpecCandidate
    // coerces what it can before validation.
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    roughness: z.number().min(0).max(1).optional(),
    metalness: z.number().min(0).max(1).optional(),
  })
  .refine(
    (p) => {
      switch (p.shape) {
        case 'box':
          return !!p.size
        case 'cylinder':
        case 'capsule':
          return p.radius != null && p.height != null
        case 'sphere':
          return p.radius != null
        case 'torus':
          return p.radius != null && p.tube != null
      }
    },
    {
      message:
        'box needs size; cylinder/capsule need radius and height; sphere needs radius; torus needs radius and tube',
    }
  )

export const itemSpecSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  parts: z.array(specPartSchema).min(1).max(40),
})

export const itemDimsSchema = z.object({
  w: z.number().positive().max(120), // inches
  d: z.number().positive().max(120),
  h: z.number().positive().max(96),
})

export type ItemSpec = z.infer<typeof itemSpecSchema>
export type ItemDims = z.infer<typeof itemDimsSchema>

// Warm palette-adjacent fallbacks for models that answer with color names.
const NAMED_COLORS: Record<string, string> = {
  brown: '#8A6647',
  darkbrown: '#6B4F2A',
  lightbrown: '#C9A874',
  tan: '#C9A874',
  camel: '#C9A874',
  beige: '#E9DCC1',
  cream: '#F7F2E8',
  ivory: '#F7F2E8',
  white: '#F7F2E8',
  offwhite: '#F2E9D8',
  black: '#3A3128',
  charcoal: '#2E2822',
  gray: '#B8B2A4',
  grey: '#B8B2A4',
  darkgray: '#7A756B',
  darkgrey: '#7A756B',
  silver: '#D8D3C8',
  gold: '#C9A84C',
  yellow: '#E2C97E',
  green: '#5F7A4A',
  darkgreen: '#4A5F3A',
  olive: '#5F7A4A',
  red: '#A0522D',
  maroon: '#7C3B2B',
  burgundy: '#7C3B2B',
  orange: '#C97B4C',
  blue: '#5B7A9E',
  navy: '#3E5063',
  wood: '#C79A5E',
  oak: '#C79A5E',
  maple: '#C79A5E',
  walnut: '#8A6647',
}

function normalizeColor(c: unknown): string | null {
  if (Array.isArray(c) && c.length === 3 && c.every((n) => typeof n === 'number')) {
    const to255 = (n: number) => Math.max(0, Math.min(255, Math.round(n <= 1 ? n * 255 : n)))
    return '#' + (c as number[]).map((n) => to255(n).toString(16).padStart(2, '0')).join('')
  }
  if (typeof c !== 'string') return null
  let s = c.trim().toLowerCase().replace(/\s+/g, '')
  if (NAMED_COLORS[s]) return NAMED_COLORS[s]
  const rgb = s.match(/^rgba?\((\d+),(\d+),(\d+)/)
  if (rgb) {
    return (
      '#' + [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('')
    )
  }
  s = s.replace(/^#/, '')
  if (/^[0-9a-f]{8}$/.test(s)) s = s.slice(0, 6) // hex with alpha
  if (/^[0-9a-f]{6}$/.test(s)) return '#' + s
  if (/^[0-9a-f]{3}$/.test(s)) return '#' + s.split('').map((ch) => ch + ch).join('')
  return null
}

// Coerce the shapes vision models actually return (color names, rgb(),
// 3-digit hex, RGB arrays, hex without '#') into schema-valid parts before
// zod sees them. Unrecognizable colors are dropped so the engine's default
// applies instead of failing the whole generation.
export function normalizeSpecCandidate(input: unknown): unknown {
  if (!input || typeof input !== 'object' || !Array.isArray((input as { parts?: unknown }).parts)) {
    return input
  }
  const obj = input as { parts: unknown[] } & Record<string, unknown>
  return {
    ...obj,
    parts: obj.parts.map((raw) => {
      if (!raw || typeof raw !== 'object') return raw
      const p = { ...(raw as Record<string, unknown>) }
      const color = normalizeColor(p.color)
      if (color) p.color = color
      else delete p.color
      return p
    }),
  }
}
