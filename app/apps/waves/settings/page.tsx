'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/apps/AppHeader'
import type { WavesSettings } from '@/types/waves'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DURATION_FIELDS = [
  { key: 'morning_duration_mins' as const, label: '🌅 Morning' },
  { key: 'afternoon_duration_mins' as const, label: '☀️ Afternoon' },
  { key: 'evening_duration_mins' as const, label: '🌙 Evening' },
]

export default function WavesSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<WavesSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('waves_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (data) setSettings(data)
    }
    load()
  }, [supabase])

  function update<K extends keyof WavesSettings>(key: K, value: WavesSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function save() {
    if (!settings) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('waves_settings')
        .update({
          wash_day: settings.wash_day,
          last_haircut_date: settings.last_haircut_date,
          haircut_interval_weeks: settings.haircut_interval_weeks,
          morning_duration_mins: settings.morning_duration_mins,
          afternoon_duration_mins: settings.afternoon_duration_mins,
          evening_duration_mins: settings.evening_duration_mins,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return (
      <main className="min-h-screen bg-beige">
        <AppHeader title="Waves Settings" />
        <div className="max-w-lg mx-auto px-4 pt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-beige pb-10">
      <AppHeader title="Waves Settings" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Session Durations */}
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Session Durations</h2>
          <div className="bg-surface rounded-2xl divide-y divide-grid/20">
            {DURATION_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3.5">
                <span className="font-inter text-sm text-textPrimary">{label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => update(key, Math.max(5, settings[key] - 5) as WavesSettings[typeof key])}
                    className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                  >
                    −
                  </button>
                  <span className="font-inter text-sm font-medium text-textPrimary w-14 text-center">
                    {settings[key]} min
                  </span>
                  <button
                    onClick={() => update(key, Math.min(60, settings[key] + 5) as WavesSettings[typeof key])}
                    className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Wash Day */}
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Wash Day</h2>
          <div className="bg-surface rounded-2xl p-4">
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => update('wash_day', i)}
                  className={`py-2 rounded-lg font-inter text-xs font-medium transition-colors ${
                    settings.wash_day === i
                      ? 'bg-gold text-white'
                      : 'text-textMuted hover:bg-beige'
                  }`}
                >
                  {name.slice(0, 2)}
                </button>
              ))}
            </div>
            <p className="font-inter text-xs text-textMuted text-center mt-3">
              Wash day: {DAY_NAMES[settings.wash_day]}
            </p>
          </div>
        </section>

        {/* Haircut Schedule */}
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Haircut Schedule</h2>
          <div className="bg-surface rounded-2xl divide-y divide-grid/20">
            <div className="flex items-center justify-between px-4 py-3.5 gap-4">
              <div>
                <div className="font-inter text-sm text-textPrimary">Last Haircut</div>
                <div className="font-inter text-xs text-textMuted">Used to calculate upcoming cuts</div>
              </div>
              <input
                type="date"
                value={settings.last_haircut_date}
                onChange={e => update('last_haircut_date', e.target.value)}
                className="font-inter text-sm text-textPrimary bg-beige rounded-lg px-3 py-1.5 border border-grid/30 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="font-inter text-sm text-textPrimary">Interval</div>
                <div className="font-inter text-xs text-textMuted">Weeks between cuts</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update('haircut_interval_weeks', Math.max(1, settings.haircut_interval_weeks - 1))}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  −
                </button>
                <span className="font-inter text-sm font-medium text-textPrimary w-20 text-center">
                  {settings.haircut_interval_weeks} {settings.haircut_interval_weeks === 1 ? 'week' : 'weeks'}
                </span>
                <button
                  onClick={() => update('haircut_interval_weeks', Math.min(8, settings.haircut_interval_weeks + 1))}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-gold text-white font-inter font-semibold py-4 rounded-2xl text-base hover:bg-brownAccent transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

      </div>
    </main>
  )
}
