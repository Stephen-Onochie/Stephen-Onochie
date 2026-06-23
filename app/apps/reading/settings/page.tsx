'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReadingSettings } from '@/types/reading'

const BackButton = (
  <Link
    href="/apps/reading"
    className="flex items-center gap-1 font-inter text-sm transition-opacity hover:opacity-80"
    style={{ color: 'var(--iven-muted)' }}
  >
    <ArrowLeft className="w-4 h-4" />
    Back
  </Link>
)

export default function ReadingSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<ReadingSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('reading_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (data) setSettings(data)
    }
    load()
  }, [supabase])

  async function save() {
    if (!settings) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('reading_settings')
        .update({
          daily_goal_minutes: settings.daily_goal_minutes,
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
      <IvenModule index={9} title="Reading Settings" right={BackButton}>
        <div className="max-w-lg px-4 pt-8 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl h-16 animate-pulse" style={{ background: 'var(--iven-surface)' }} />
          ))}
        </div>
      </IvenModule>
    )
  }

  return (
    <IvenModule index={9} title="Reading Settings" right={BackButton}>
      <div className="max-w-lg px-4 py-6 space-y-6">
        <section>
          <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">Daily Goal</h2>
          <div className="bg-surface rounded-2xl">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="font-inter text-sm text-textPrimary">Reading Goal</div>
                <div className="font-inter text-xs text-textMuted">Minutes to read each day</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings(s => s ? { ...s, daily_goal_minutes: Math.max(5, s.daily_goal_minutes - 5) } : s)}
                  className="w-7 h-7 rounded-lg bg-beige text-textPrimary font-bold text-sm hover:bg-grid/30 transition-colors"
                >
                  −
                </button>
                <span className="font-inter text-sm font-medium text-textPrimary w-16 text-center">
                  {settings.daily_goal_minutes} min
                </span>
                <button
                  onClick={() => setSettings(s => s ? { ...s, daily_goal_minutes: s.daily_goal_minutes + 5 } : s)}
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
    </IvenModule>
  )
}
