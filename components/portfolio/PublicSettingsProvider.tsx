'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PUBLIC_VIEW_DEFAULTS, type PublicViewData } from '@/types/public-view'

// Single fetch of the public portfolio settings, shared with every consumer
// (resume CTA, header, footer, reading card). Starts from the hardcoded defaults
// so the site renders identically until the live values resolve — no flash.
const PublicSettingsContext = createContext<PublicViewData>(PUBLIC_VIEW_DEFAULTS)

export function usePublicSettings(): PublicViewData {
  return useContext(PublicSettingsContext)
}

export default function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicViewData>(PUBLIC_VIEW_DEFAULTS)

  useEffect(() => {
    fetch('/api/public/public-view')
      .then(r => r.json())
      .then((data: PublicViewData) => setSettings({ ...PUBLIC_VIEW_DEFAULTS, ...data }))
      .catch(() => {
        /* keep defaults */
      })
  }, [])

  return (
    <PublicSettingsContext.Provider value={settings}>
      {children}
    </PublicSettingsContext.Provider>
  )
}
