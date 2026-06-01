'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import RemoteButton from '@/components/lg-remote/RemoteButton'
import type { LgRemoteConfig } from '@/types/lg-remote'

interface SettingsPanelProps {
  config: LgRemoteConfig
  onSave: (config: LgRemoteConfig) => void
  onClose: () => void
}

export default function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const [proxyUrl, setProxyUrl] = useState(config.proxyUrl)
  const [token, setToken] = useState(config.token)

  const handleSave = () => {
    onSave({ proxyUrl, token })
    onClose()
  }

  return (
    <div className="space-y-5 rounded-2xl border border-goldLight bg-beige p-6">
      <div>
        <h2 className="font-playfair text-lg font-bold text-textPrimary">Connection</h2>
        <p className="mt-1 text-xs text-textMuted font-inter">
          Point this at the Cloudflare tunnel URL printed by{' '}
          <code className="rounded bg-surface px-1">tunnel.sh</code> on your laptop.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-textPrimary font-inter">Proxy URL</span>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={proxyUrl}
          onChange={(e) => setProxyUrl(e.target.value)}
          placeholder="https://your-tunnel.trycloudflare.com"
          className="mt-1 w-full rounded-xl border border-goldLight bg-surface px-3 py-2 text-sm text-textPrimary font-inter outline-none focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-textPrimary font-inter">API token</span>
        <input
          type="password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="matches API_TOKEN in the proxy .env"
          className="mt-1 w-full rounded-xl border border-goldLight bg-surface px-3 py-2 text-sm text-textPrimary font-inter outline-none focus:border-gold"
        />
      </label>

      <div className="flex gap-3">
        <RemoteButton variant="accent" onClick={handleSave} className="flex-1">
          <Check size={16} /> Save
        </RemoteButton>
        <RemoteButton onClick={onClose} className="flex-1">
          Cancel
        </RemoteButton>
      </div>
    </div>
  )
}
