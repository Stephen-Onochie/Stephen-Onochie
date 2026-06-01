'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  Home,
  Power,
  RotateCw,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
} from 'lucide-react'
import AppHeader from '@/components/apps/AppHeader'
import DPad from '@/components/lg-remote/DPad'
import RemoteButton from '@/components/lg-remote/RemoteButton'
import SettingsPanel from '@/components/lg-remote/SettingsPanel'
import { useLgRemote } from '@/hooks/useLgRemote'
import { APP_SHORTCUTS, TV_INPUTS } from '@/lib/lg-remote/constants'
import type { ConnectionState } from '@/types/lg-remote'

const STATUS_LABEL: Record<ConnectionState, string> = {
  unconfigured: 'Not set up',
  connecting: 'Connecting…',
  online: 'Connected',
  offline: 'Offline',
}

const STATUS_DOT: Record<ConnectionState, string> = {
  unconfigured: 'bg-textMuted',
  connecting: 'bg-goldLight',
  online: 'bg-green-600',
  offline: 'bg-red-600',
}

export default function LgRemoteView() {
  const remote = useLgRemote()
  const [showSettings, setShowSettings] = useState(false)
  const disabled = remote.connection !== 'online'

  return (
    <main className="min-h-screen bg-beige pb-16">
      <AppHeader
        title="LG Remote"
        right={
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[remote.connection]}`} />
            <span className="text-textMuted text-sm font-inter">
              {STATUS_LABEL[remote.connection]}
            </span>
          </div>
        }
      />

      <div className="mx-auto max-w-md px-6 py-6 space-y-6">
        {/* Status / error line */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-textMuted font-inter">
            {remote.status && remote.status.volume !== null
              ? `Volume ${remote.status.volume}${remote.status.muted ? ' · muted' : ''}`
              : remote.connection === 'online'
                ? 'TV is asleep or on standby'
                : 'Control your LG TV from here'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Refresh"
              onClick={remote.refresh}
              className="text-textMuted hover:text-brownAccent transition-colors"
            >
              <RotateCw size={18} />
            </button>
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setShowSettings((v) => !v)}
              className="text-textMuted hover:text-brownAccent transition-colors"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>

        {remote.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-inter">
            {remote.error}
          </p>
        )}

        {showSettings ? (
          <SettingsPanel
            config={remote.config}
            onSave={remote.updateConfig}
            onClose={() => setShowSettings(false)}
          />
        ) : !remote.configured ? (
          <div className="rounded-2xl border border-goldLight bg-surface p-6 text-center">
            <p className="text-sm text-textMuted font-inter mb-4">
              Add your laptop proxy URL to get started.
            </p>
            <RemoteButton variant="accent" onClick={() => setShowSettings(true)}>
              <SettingsIcon size={16} /> Set up connection
            </RemoteButton>
          </div>
        ) : (
          <>
            {/* Power + volume + mute */}
            <div className="grid grid-cols-3 gap-3">
              <RemoteButton
                variant="danger"
                disabled={disabled}
                onClick={() => remote.command('power_off')}
              >
                <Power size={18} />
              </RemoteButton>
              <RemoteButton
                disabled={disabled}
                onClick={() => remote.command('mute', { mute: !remote.status?.muted })}
              >
                {remote.status?.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </RemoteButton>
              <RemoteButton
                disabled={disabled}
                onClick={() => remote.command('home')}
              >
                <Home size={18} />
              </RemoteButton>
            </div>

            {/* D-pad */}
            <DPad onPress={remote.command} disabled={disabled} />

            {/* Back + volume + channel */}
            <div className="grid grid-cols-3 gap-3">
              <RemoteButton disabled={disabled} onClick={() => remote.command('back')}>
                <ChevronLeft size={18} /> Back
              </RemoteButton>
              <div className="flex flex-col gap-2">
                <RemoteButton disabled={disabled} onClick={() => remote.command('volume_up')}>
                  Vol +
                </RemoteButton>
                <RemoteButton disabled={disabled} onClick={() => remote.command('volume_down')}>
                  Vol −
                </RemoteButton>
              </div>
              <div className="flex flex-col gap-2">
                <RemoteButton disabled={disabled} onClick={() => remote.command('channel_up')}>
                  Ch +
                </RemoteButton>
                <RemoteButton disabled={disabled} onClick={() => remote.command('channel_down')}>
                  Ch −
                </RemoteButton>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textMuted font-inter">
                Inputs
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {TV_INPUTS.map((input) => (
                  <RemoteButton
                    key={input.inputId}
                    disabled={disabled}
                    onClick={() => remote.command('switch_input', { inputId: input.inputId })}
                    className="px-2 py-2 text-xs"
                  >
                    {input.label}
                  </RemoteButton>
                ))}
              </div>
            </div>

            {/* App shortcuts */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textMuted font-inter">
                Apps
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {APP_SHORTCUTS.map((app) => (
                  <RemoteButton
                    key={app.id}
                    disabled={disabled}
                    onClick={() => remote.command('launch_app', { id: app.id })}
                    className="flex-col gap-1 py-3 text-xs"
                  >
                    <span className="text-xl">{app.icon}</span>
                    {app.label}
                  </RemoteButton>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
