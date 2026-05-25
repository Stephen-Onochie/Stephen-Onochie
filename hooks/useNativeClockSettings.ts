'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  loadNativeClockSettings,
  mergeNativeClockSettings,
  NATIVE_CLOCK_SETTINGS_EVENT,
  saveNativeClockSettings,
} from '@/lib/native-clock/settings'
import type { NativeClockSettings } from '@/types/native-clock'

export function useNativeClockSettings() {
  const [settings, setSettings] = useState<NativeClockSettings | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(() => {
    setSettings(loadNativeClockSettings())
    setHydrated(true)
  }, [])

  useEffect(() => {
    refresh()

    function onUpdate() {
      refresh()
    }

    window.addEventListener(NATIVE_CLOCK_SETTINGS_EVENT, onUpdate)
    window.addEventListener('storage', onUpdate)

    return () => {
      window.removeEventListener(NATIVE_CLOCK_SETTINGS_EVENT, onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [refresh])

  const updateSettings = useCallback((partial: Partial<NativeClockSettings>) => {
    const current = loadNativeClockSettings()
    const next = mergeNativeClockSettings({ ...current, ...partial })
    saveNativeClockSettings(next)
    setSettings(next)
  }, [])

  return { settings, hydrated, updateSettings, refresh }
}
