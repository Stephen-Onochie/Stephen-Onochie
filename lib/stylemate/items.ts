import type { ItemTags } from '@/types/stylemate'

/** Column values for a new wardrobe_items row from Claude's tags. */
export function tagsToColumns(tags: ItemTags) {
  return {
    name: tags.name,
    category: tags.category,
    sub_type: tags.sub_type || null,
    color: tags.color,
    color_hex: tags.color_hex,
    colors: tags.colors,
    pattern: tags.pattern || null,
    material: tags.material || null,
    fit: tags.fit || null,
    brand: tags.brand,
    description: tags.description || null,
    formality: tags.formality,
    warmth: tags.warmth,
    seasons: tags.seasons,
    occasions: tags.occasions,
    style_tags: tags.style_tags,
    min_temp_threshold: tags.min_temp_threshold,
    max_temp_threshold: tags.max_temp_threshold,
  }
}
