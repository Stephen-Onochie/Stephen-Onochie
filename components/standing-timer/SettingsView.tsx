'use client'

import { useEffect, useState } from 'react'
import { requestNotificationPermission } from '@/lib/standing-timer/notifications'
import type { TimerSettings } from '@/types/standing-timer'

interface SettingsViewProps {
  settings: TimerSettings | null
  notificationPermission: string
  onSave: (
    updates: Partial<
      Pick<
        TimerSettings,
        | 'standing_minutes'
        | 'sitting_minutes'
        | 'break_minutes'
        | 'sound_enabled'
        | 'notifications_enabled'
      >
    >
  ) => Promise<void>
}

export default function SettingsView({
  settings,
  notificationPermission,
  onSave,
}: SettingsViewProps) {
  const [standing, setStanding] = useState('20')
  const [sitting, setSitting] = useState('10')
  const [breakMinutes, setBreakMinutes] = useState('5')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settings) return
    setStanding(String(settings.standing_minutes))
    setSitting(String(settings.sitting_minutes))
    setBreakMinutes(String(settings.break_minutes))
    setSoundEnabled(settings.sound_enabled)
    setNotificationsEnabled(settings.notifications_enabled)
  }, [settings])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await onSave({
        standing_minutes: Number(standing),
        sitting_minutes: Number(sitting),
        break_minutes: Number(breakMinutes),
        sound_enabled: soundEnabled,
        notifications_enabled: notificationsEnabled,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    if (result === 'granted') {
      setNotificationsEnabled(true)
      await onSave({ notifications_enabled: true })
    }
  }

  if (!settings) {
    return <div className="px-4 pt-4 animate-pulse bg-surface rounded-2xl h-32 mx-4 mt-4" />
  }

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto space-y-6">
      <section className="bg-surface rounded-2xl p-5 space-y-4">
        <h2 className="font-playfair text-lg font-bold text-textPrimary">Interval durations</h2>
        <p className="text-textMuted font-inter text-xs">
          Changes apply to the next interval. Idle timer preview updates immediately.
        </p>
        <DurationField label="Standing (minutes)" value={standing} onChange={setStanding} min={1} max={180} />
        <DurationField label="Sitting (minutes)" value={sitting} onChange={setSitting} min={1} max={180} />
        <DurationField label="Break (minutes)" value={breakMinutes} onChange={setBreakMinutes} min={1} max={60} />
      </section>

      <section className="bg-surface rounded-2xl p-5 space-y-4">
        <h2 className="font-playfair text-lg font-bold text-textPrimary">Alerts</h2>
        <ToggleRow
          label="Sound chime"
          description="Play a tone when an interval ends"
          checked={soundEnabled}
          onChange={setSoundEnabled}
        />
        <ToggleRow
          label="Browser notifications"
          description="Show a system notification when an interval ends"
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
        {notificationPermission !== 'granted' && notificationsEnabled && (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="w-full py-2.5 text-sm font-inter text-gold border border-gold rounded-xl hover:bg-beige transition-colors"
          >
            Enable browser notifications
          </button>
        )}
        {notificationPermission === 'denied' && (
          <p className="text-textMuted font-inter text-xs">
            Notifications are blocked in your browser settings.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
      </button>
    </div>
  )
}

function DurationField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
}) {
  return (
    <label className="block">
      <span className="text-textPrimary font-inter text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter text-textPrimary focus:outline-none focus:border-gold"
      />
    </label>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-textPrimary font-inter text-sm font-medium">{label}</p>
        <p className="text-textMuted font-inter text-xs mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-gold"
      />
    </label>
  )
}
