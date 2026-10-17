import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysToDateStr, todayEastern } from '@/lib/dates'
import { WEEKLY_SLOTS } from '@/lib/stylemate/constants'
import { generateAndStoreOutfits, type OutfitBrief } from '@/lib/stylemate/outfits'
import { planLength } from '@/lib/stylemate/plan'
import { fetchForecast } from '@/lib/stylemate/weather'
import type { Outfit } from '@/types/stylemate'

/**
 * Plans one outfit per weekly slot for each remaining day of the week. Unsaved
 * weekly outfits in that range are replaced; saved ones and custom outfits stay.
 */
export async function planWeek(supabase: SupabaseClient, userId: string): Promise<{ days: number; outfits: Outfit[] }> {
  const today = todayEastern()
  const days = planLength()
  const forecast = await fetchForecast(today, days)

  const briefs: OutfitBrief[] = forecast.flatMap(weather =>
    WEEKLY_SLOTS.map(s => ({
      key: `${weather.date}:${s.slot}`,
      date: weather.date,
      slot: s.slot,
      occasion: s.brief,
      weather,
      count: 1,
    })),
  )

  const { data: stale, error: staleError } = await supabase
    .from('stylemate_outfits')
    .select('id')
    .eq('user_id', userId)
    .eq('origin', 'weekly')
    .eq('saved', false)
    .gte('plan_date', today)
    .lte('plan_date', addDaysToDateStr(today, days - 1))
  if (staleError) throw staleError

  // Generate first so a failed run never leaves the week empty.
  const outfits = await generateAndStoreOutfits(supabase, userId, briefs, 'weekly')

  const staleIds = (stale ?? []).map(r => r.id as string)
  if (staleIds.length) {
    const { error: deleteError } = await supabase.from('stylemate_outfits').delete().in('id', staleIds)
    if (deleteError) throw deleteError
  }
  return { days, outfits }
}
