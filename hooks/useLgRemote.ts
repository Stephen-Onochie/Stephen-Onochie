'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchStatus,
  isConfigured,
  loadConfig,
  pingHealth,
  saveConfig,
  sendCommand,
} from '@/lib/lg-remote/client'
import type {
  ConnectionState,
  LgRemoteConfig,
  LgStatus,
  RemoteAction,
} from '@/types/lg-remote'

export function useLgRemote() {
  const [config, setConfig] = useState<LgRemoteConfig>({ proxyUrl: '', token: '' })
  const [connection, setConnection] = useState<ConnectionState>('unconfigured')
  const [status, setStatus] = useState<LgStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const configRef = useRef(config)
  configRef.current = config

  // Load saved config once on mount.
  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  const refresh = useCallback(async () => {
    const current = configRef.current
    if (!isConfigured(current)) {
      setConnection('unconfigured')
      return
    }
    setConnection('connecting')
    try {
      const health = await pingHealth(current)
      if (health.tvConnected) {
        const s = await fetchStatus(current)
        setStatus(s)
        setConnection('online')
      } else {
        setStatus(null)
        setConnection('online') // proxy reachable, TV asleep/off
      }
      setError(null)
    } catch (err) {
      setStatus(null)
      setConnection('offline')
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [])

  // Poll status whenever the config changes.
  useEffect(() => {
    if (!isConfigured(config)) {
      setConnection('unconfigured')
      return
    }
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [config, refresh])

  const updateConfig = useCallback((next: LgRemoteConfig) => {
    setConfig(saveConfig(next))
  }, [])

  const command = useCallback(
    async (action: RemoteAction, payload?: Record<string, unknown>) => {
      const current = configRef.current
      try {
        await sendCommand(current, action, payload)
        setError(null)
        // Volume/mute changes are worth reflecting quickly.
        if (
          action === 'volume_up' ||
          action === 'volume_down' ||
          action === 'mute' ||
          action === 'set_volume'
        ) {
          fetchStatus(current).then(setStatus).catch(() => {})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Command failed')
        setConnection('offline')
      }
    },
    []
  )

  return {
    config,
    connection,
    status,
    error,
    updateConfig,
    refresh,
    command,
    configured: isConfigured(config),
  }
}
