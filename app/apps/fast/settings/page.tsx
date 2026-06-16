'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { FastSettings } from '@/types/fast'

const BackButton = (
  <Link
    href="/apps/fast"
    className="flex items-center gap-1 font-inter text-sm transition-opacity hover:opacity-80"
    style={{ color: 'var(--iven-muted)' }}
  >
    <ArrowLeft className="w-4 h-4" />
    Back
  </Link>
)

export default function FastSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<FastSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('fast_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (data) setSettings(data)
    }
    load()
  }, [supabase])

  function update<K extends keyof FastSettings>(key: K, value: FastSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function save() {
    if (!settings) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('fast_settings')
        .update({
          cooldown_days: settings.cooldown_days,
          target_duration_hrs: settings.target_duration_hrs,
          fast_label: settings.fast_label.trim() || 'Controlled Fast',
          notes_prompt: settings.notes_prompt.trim() || 'How did this fast go?',
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
      <IvenModule index={8} title="FastTrack Settings" right={BackButton}>
        <div className="max-w-lg px-4 pt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-16 animate-pulse" style={{ background: 'var(--iven-surface)' }} />
          ))}
        </div>
      </IvenModule>
    )
  }

  return (
    <IvenModule index={8} title="FastTrack Settings" right={BackButton}>
      <div className="max-w-lg px-4 py-6 space-y-6">

        {/* Rules */}
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Rules</h2>
          <div className="bg-surface rounded-2xl divide-y divide-grid/20">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="font-inter text-sm text-textPrimary">Cooldown Period</div>
                <div className="font-inter text-xs text-textMuted">Minimum days between fasts</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update('cooldown_days', Math.max(1, settings.cooldown_days - 1))}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  −
                </button>
                <span className="font-inter text-sm font-medium text-textPrimary w-20 text-center">
                  {settings.cooldown_days} {settings.cooldown_days === 1 ? 'day' : 'days'}
                </span>
                <button
                  onClick={() => update('cooldown_days', settings.cooldown_days + 1)}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="font-inter text-sm text-textPrimary">Target Fast Duration</div>
                <div className="font-inter text-xs text-textMuted">For the progress ring — does not block fasting</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update('target_duration_hrs', Math.max(1, settings.target_duration_hrs - 1))}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  −
                </button>
                <span className="font-inter text-sm font-medium text-textPrimary w-16 text-center">
                  {settings.target_duration_hrs} hrs
                </span>
                <button
                  onClick={() => update('target_duration_hrs', settings.target_duration_hrs + 1)}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Labels */}
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Labels</h2>
          <div className="bg-surface rounded-2xl divide-y divide-grid/20">
            <div className="px-4 py-3.5">
              <label className="font-inter text-sm text-textPrimary block mb-1.5">Fast Label</label>
              <input
                type="text"
                value={settings.fast_label}
                onChange={e => update('fast_label', e.target.value)}
                className="w-full font-inter text-sm text-textPrimary bg-beige rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="px-4 py-3.5">
              <label className="font-inter text-sm text-textPrimary block mb-1.5">Notes Prompt</label>
              <input
                type="text"
                value={settings.notes_prompt}
                onChange={e => update('notes_prompt', e.target.value)}
                className="w-full font-inter text-sm text-textPrimary bg-beige rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
              />
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
    </IvenModule>
  )
}
