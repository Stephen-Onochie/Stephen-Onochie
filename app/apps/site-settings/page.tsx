'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import IvenModule from '@/components/iven/IvenModule'
import { createClient } from '@/lib/supabase/client'
import AnalyticsPanel from '@/components/site-settings/AnalyticsPanel'
import ResumePanel from '@/components/site-settings/ResumePanel'
import SiteSettingsPanel from '@/components/site-settings/SiteSettingsPanel'
import ProjectsEditor from '@/components/public-view/ProjectsEditor'

const TABS = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'resume', label: 'Résumé' },
  { key: 'projects', label: 'Projects' },
  { key: 'settings', label: 'Site settings' },
] as const

type Tab = (typeof TABS)[number]['key']

function SiteSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const param = searchParams.get('tab')
  const tab: Tab = TABS.some(t => t.key === param) ? (param as Tab) : 'analytics'

  return (
    <IvenModule
      index={13}
      title="Site Settings"
      right={
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[1px]"
          style={{ color: 'var(--iven-muted)' }}
        >
          <ExternalLink size={13} /> View site
        </a>
      }
    >
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--iven-grid)' }} role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => router.replace(`/apps/site-settings?tab=${t.key}`, { scroll: false })}
            className="font-mono text-[11px] font-semibold tracking-[1.5px] uppercase px-4 py-2.5 transition-colors"
            style={{
              color: tab === t.key ? 'var(--iven-text)' : 'var(--iven-muted)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--iven-accent)' : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsPanel />}
      {tab === 'resume' && <ResumePanel supabase={supabase} />}
      {tab === 'projects' && <ProjectsEditor supabase={supabase} />}
      {tab === 'settings' && <SiteSettingsPanel supabase={supabase} />}
    </IvenModule>
  )
}

export default function SiteSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="iven-indeterminate-track" /></div>}>
      <SiteSettings />
    </Suspense>
  )
}
