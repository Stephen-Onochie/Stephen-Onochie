import { z } from 'zod'

// Primitive-assembly spec for AI-generated furniture. Units are feet; the
// engine's _buildSpec renders exactly this shape. Bounds are generous but
// capped so a bad generation can't fill the room.
export const specPartSchema = z
  .object({
    shape: z.enum(['box', 'cylinder']),
    size: z.tuple([z.number().positive().max(10), z.number().positive().max(10), z.number().positive().max(10)]).optional(),
    radius: z.number().positive().max(5).optional(),
    radiusTop: z.number().min(0).max(5).optional(),
    height: z.number().positive().max(10).optional(),
    position: z.tuple([z.number().min(-10).max(10), z.number().min(-2).max(10), z.number().min(-10).max(10)]),
    rotationY: z.number().min(-360).max(360).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    roughness: z.number().min(0).max(1).optional(),
    metalness: z.number().min(0).max(1).optional(),
  })
  .refine((p) => (p.shape === 'box' ? !!p.size : p.radius != null && p.height != null), {
    message: 'box parts need size; cylinder parts need radius and height',
  })

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
