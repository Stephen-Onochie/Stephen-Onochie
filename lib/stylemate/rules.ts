import type { WardrobeItem } from '@/types/stylemate'

// The owner's standing outfit rules, shared by the generator (server) and the
// outfit builder (browser) so both classify pieces the same way.

type Classifiable = Pick<WardrobeItem, 'category' | 'sub_type' | 'name'>

const LAYER_TOP = /hoodie|sweat|sweater|cardigan|knit|fleece|zip|jumper|crewneck_sweat/i
const SWEATER = /sweater|jumper|cardigan|pullover|turtleneck/i

/** Tops worn against the skin (tees, tanks, polos, shirts) are never repeated; layering tops can be. */
export function isTee(item: Classifiable): boolean {
  return item.category === 'top' && !LAYER_TOP.test(`${item.sub_type ?? ''} ${item.name}`)
}

/** Sweaters are worn alone: no other top, no outerwear. */
export function isSweater(item: Classifiable): boolean {
  return item.category === 'top' && SWEATER.test(`${item.sub_type ?? ''} ${item.name}`)
}
