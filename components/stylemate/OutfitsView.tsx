'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CalendarDays, CloudRain, Loader2, Pencil, Sparkles, Wand2 } from 'lucide-react'
import { addDaysToDateStr, easternWeekday, todayEastern } from '@/lib/dates'
import { OCCASION_PRESETS, PALETTES, WEEKLY_SLOTS } from '@/lib/stylemate/constants'
import { planLength } from '@/lib/stylemate/plan'
import {
  deleteOutfit,
  fetchOutfits,
  fetchSavedOutfits,
  updateOutfit,
  wearOutfit,
  withOutfitUrls,
} from '@/lib/stylemate/supabase'
import type { DayWeather, Outfit, OutfitView, WardrobeItemView } from '@/types/stylemate'
import EstimatedProgress from './EstimatedProgress'
import OutfitCard, { type OutfitActions } from './OutfitCard'
import { Button, Chip, inputStyle, SectionLabel } from './shared'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_ORDER = [...WEEKLY_SLOTS.map(s => s.slot as string), 'custom']

function dayName(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`)
  return payload as T
}

function WeatherLine({ weather }: { weather: DayWeather }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {weather.precipChance >= 30 && <CloudRain size={13} />}
      {weather.highF}° / {weather.lowF}° · {weather.condition}
      {weather.precipChance >= 30 ? ` · ${weather.precipChance}% rain` : ''}
    </span>
  )
}

export default function OutfitsView({
  supabase,
  items,
  onItemsUpdated,
  onOpenItem,
  notify,
}: {
  supabase: SupabaseClient
  items: WardrobeItemView[]
  onItemsUpdated: (items: WardrobeItemView[]) => void
  onOpenItem: (item: WardrobeItemView) => void
  notify: (message: string) => void
}) {
  const today = todayEastern()
  const weekStart = addDaysToDateStr(today, -easternWeekday())
  const stripLength = planLength() > 7 - easternWeekday() ? 14 : 7
  const weekDates = useMemo(
    () => Array.from({ length: stripLength }, (_, i) => addDaysToDateStr(weekStart, i)),
    [weekStart, stripLength],
  )

  const [outfits, setOutfits] = useState<OutfitView[]>([])
  const [saved, setSaved] = useState<OutfitView[]>([])
  const [forecast, setForecast] = useState<Map<string, DayWeather>>(new Map())
  const [selectedDay, setSelectedDay] = useState(today)
  const [loading, setLoading] = useState(true)
  const [planning, setPlanning] = useState(false)

  const [date, setDate] = useState(today)
  const [occasion, setOccasion] = useState('Class')
  const [palette, setPalette] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [weatherOverride, setWeatherOverride] = useState<DayWeather | null>(null)
  const [editingWeather, setEditingWeather] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [fresh, setFresh] = useState<string[]>([])

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const ownedCount = items.filter(i => !i.is_incoming).length

  const load = useCallback(async () => {
    const [ranged, savedList] = await Promise.all([
      fetchOutfits(supabase, weekStart, addDaysToDateStr(weekStart, 13)),
      fetchSavedOutfits(supabase),
    ])
    setOutfits(ranged)
    setSaved(savedList)
    setLoading(false)
  }, [supabase, weekStart])

  useEffect(() => {
    load().catch(() => setLoading(false))
    fetch(`/api/stylemate/weather?start=${today}&days=14`)
      .then(r => r.json())
      .then((p: { forecast?: DayWeather[] }) => setForecast(new Map((p.forecast ?? []).map(w => [w.date, w]))))
      .catch(() => {})
  }, [load, today])

  const baseWeather = forecast.get(date) ?? null
  const weather = weatherOverride ?? baseWeather

  const replace = useCallback((next: OutfitView) => {
    setOutfits(prev => prev.map(o => (o.id === next.id ? next : o)))
    setSaved(prev => {
      const without = prev.filter(o => o.id !== next.id)
      return next.saved ? [next, ...without] : without
    })
  }, [])

  const actions: OutfitActions = {
    generateImage: async outfit => {
      replace({ ...outfit, image_status: 'pending' })
      try {
        const { outfit: updated } = await postJson<{ outfit: Outfit }>(`/api/stylemate/outfits/${outfit.id}/image`)
        const [view] = await withOutfitUrls(supabase, [updated])
        replace(view)
      } catch (err) {
        replace({ ...outfit, image_status: 'failed' })
        notify(err instanceof Error ? err.message : 'Image generation failed')
      }
    },
    wear: async outfit => {
      const wornOn = outfit.plan_date && outfit.plan_date <= today ? outfit.plan_date : today
      const result = await wearOutfit(supabase, outfit, items, wornOn)
      replace(result.outfit)
      onItemsUpdated(result.items)
      notify('Logged. Those pieces get a rest from the next plans.')
    },
    toggleSave: async outfit => replace(await updateOutfit(supabase, outfit.id, { saved: !outfit.saved })),
    remove: async outfit => {
      await deleteOutfit(supabase, outfit)
      setOutfits(prev => prev.filter(o => o.id !== outfit.id))
      setSaved(prev => prev.filter(o => o.id !== outfit.id))
    },
    openItem: onOpenItem,
  }

  async function createOutfits() {
    setGenerating(true)
    try {
      const { outfits: created } = await postJson<{ outfits: Outfit[] }>('/api/stylemate/outfits/generate', {
        date,
        occasion,
        palette,
        notes: notes.trim() || null,
        weather,
        count: 3,
      })
      const views = await withOutfitUrls(supabase, created)
      setOutfits(prev => [...prev, ...views])
      setFresh(views.map(v => v.id))
      setSelectedDay(date)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Outfit generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function planWeek() {
    setPlanning(true)
    try {
      await postJson('/api/stylemate/outfits/week')
      await load()
      notify('Week planned: four looks a day through Saturday.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Week planning failed')
    } finally {
      setPlanning(false)
    }
  }

  const freshOutfits = outfits.filter(o => fresh.includes(o.id))
  const dayOutfits = outfits
    .filter(o => o.plan_date === selectedDay && !fresh.includes(o.id))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
  const savedOnly = saved.filter(o => !outfits.some(x => x.id === o.id))

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl p-5" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Wand2 size={18} style={{ color: 'var(--iven-accent)' }} />
          <h2 className="font-playfair text-xl font-bold" style={{ color: 'var(--iven-text)' }}>Create an outfit</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="flex flex-col gap-4">
            <div>
              <SectionLabel>When</SectionLabel>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Chip active={date === today} onClick={() => { setDate(today); setWeatherOverride(null) }}>Today</Chip>
                <Chip active={date === addDaysToDateStr(today, 1)} onClick={() => { setDate(addDaysToDateStr(today, 1)); setWeatherOverride(null) }}>Tomorrow</Chip>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => { if (e.target.value) { setDate(e.target.value); setWeatherOverride(null) } }}
                  className="font-mono text-[11px] rounded-full px-3 py-1.5 outline-none"
                  style={inputStyle()}
                />
              </div>
            </div>

            <div>
              <SectionLabel>Mood or event</SectionLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {OCCASION_PRESETS.map(o => <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>{o}</Chip>)}
              </div>
              <input
                value={occasion}
                onChange={e => setOccasion(e.target.value)}
                placeholder="e.g. rooftop birthday dinner, chill but expensive-looking"
                className="w-full font-inter text-sm rounded-lg px-3 py-2 outline-none"
                style={inputStyle()}
              />
            </div>

            <div>
              <SectionLabel>Weather</SectionLabel>
              {weather ? (
                <div className="flex items-center gap-3 font-inter text-sm" style={{ color: 'var(--iven-text)' }}>
                  <WeatherLine weather={weather} />
                  <button type="button" onClick={() => setEditingWeather(e => !e)} aria-label="Adjust weather" style={{ color: 'var(--iven-muted)' }}>
                    <Pencil size={13} />
                  </button>
                </div>
              ) : (
                <span className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>Loading forecast…</span>
              )}
              {editingWeather && weather && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['highF', 'lowF', 'precipChance'] as const).map(key => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                        {key === 'highF' ? 'High °F' : key === 'lowF' ? 'Low °F' : 'Rain %'}
                      </span>
                      <input
                        type="number"
                        value={weather[key]}
                        onChange={e => setWeatherOverride({ ...weather, [key]: Number(e.target.value) })}
                        className="font-inter text-sm rounded-lg px-2 py-1.5 outline-none"
                        style={inputStyle()}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <SectionLabel>Color scheme</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPalette(null)}
                  className="rounded-xl px-3 py-2 font-mono text-[10px] uppercase tracking-[1px]"
                  style={palette === null ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }}
                >
                  Stylist pick
                </button>
                {PALETTES.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPalette(p.name)}
                    className="rounded-xl px-2.5 py-2 flex items-center gap-2"
                    style={palette === p.name ? { border: '2px solid var(--iven-accent)' } : { border: '1px solid var(--iven-grid)' }}
                  >
                    <span className="flex">
                      {p.swatches.map(s => <span key={s} className="w-3.5 h-3.5 rounded-full -mr-1 border" style={{ background: s, borderColor: 'var(--iven-surface)' }} />)}
                    </span>
                    <span className="font-inter text-[11px] ml-1" style={{ color: 'var(--iven-text)' }}>{p.name}</span>
                  </button>
                ))}
              </div>
              <input
                value={palette !== null && !PALETTES.some(p => p.name === palette) ? palette : ''}
                onChange={e => setPalette(e.target.value || null)}
                placeholder="or describe one: burgundy + cream, all white…"
                className="w-full mt-2 font-inter text-sm rounded-lg px-3 py-2 outline-none"
                style={inputStyle()}
              />
            </div>

            <div>
              <SectionLabel>Anything else</SectionLabel>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. build it around my new boots"
                className="w-full font-inter text-sm rounded-lg px-3 py-2 outline-none"
                style={inputStyle()}
              />
            </div>

            <div className="mt-auto">
              <Button onClick={createOutfits} disabled={generating || ownedCount < 2 || !occasion.trim()} className="py-3 w-full">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Styling…' : ownedCount < 2 ? 'Scan some clothes first' : 'Create 3 outfits'}
              </Button>
              <EstimatedProgress
                active={generating}
                storageKey="create"
                defaultMs={30_000}
                steps={[
                  'Reading your closet',
                  'Checking the weather',
                  'Matching colors to your palette',
                  'Balancing fits and layers',
                  'Applying your rules: tees, sweaters, glasses',
                  'Writing styling tips',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {freshOutfits.length > 0 && (
        <section>
          <SectionLabel>Fresh picks · {occasion}</SectionLabel>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {freshOutfits.map(o => <OutfitCard key={o.id} outfit={o} items={itemMap} actions={actions} />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: 'var(--iven-accent)' }} />
            <h2 className="font-playfair text-xl font-bold" style={{ color: 'var(--iven-text)' }}>This week</h2>
          </div>
          <Button variant="ghost" onClick={planWeek} disabled={planning || ownedCount < 2}>
            {planning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {planning ? 'Planning the week…' : 'Plan the rest of my week'}
          </Button>
        </div>
        <EstimatedProgress
            className="mb-4"
            active={planning}
            storageKey="week"
            defaultMs={100_000}
            steps={[
              "Pulling the week's forecast",
              'Planning class, casual, gym and going-out looks',
              'Spreading your tees across the week',
              'Matching glasses to the weather',
              'Saving your week',
            ]}
          />
        <p className="font-inter text-xs mb-4" style={{ color: 'var(--iven-muted)' }}>
          Every Sunday at 8am the week plans itself ({WEEKLY_SLOTS.map(s => s.label).join(', ')}) and you get an email. Saved looks are never replaced.
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-5">
          {weekDates.map(d => {
            const w = forecast.get(d)
            const count = outfits.filter(o => o.plan_date === d && !fresh.includes(o.id)).length
            const active = d === selectedDay
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className="rounded-xl py-2 px-1 text-center"
                style={active ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { background: 'var(--iven-surface)', color: d < today ? 'var(--iven-muted)' : 'var(--iven-text)', border: '1px solid var(--iven-grid)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[1px]">{dayName(d)}{d === today ? ' ·' : ''}</div>
                <div className="font-playfair text-lg font-bold leading-none my-0.5">{Number(d.slice(8))}</div>
                <div className="font-mono text-[9px]">{w ? `${w.highF}°` : '—'}{count ? ` · ${count}` : ''}</div>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: 'var(--iven-accent)' }} /></div>
        ) : dayOutfits.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ border: '1px dashed var(--iven-grid)' }}>
            <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>
              Nothing planned for {dayName(selectedDay)} yet. Create one above or plan the week.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {dayOutfits.map(o => <OutfitCard key={o.id} outfit={o} items={itemMap} actions={actions} />)}
          </div>
        )}
      </section>

      {savedOnly.length > 0 && (
        <section>
          <SectionLabel>Saved looks · {savedOnly.length}</SectionLabel>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {savedOnly.map(o => <OutfitCard key={o.id} outfit={o} items={itemMap} actions={actions} />)}
          </div>
        </section>
      )}
    </div>
  )
}
