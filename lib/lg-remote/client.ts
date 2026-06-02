import type { LgRemoteConfig, LgStatus, RemoteAction } from '@/types/lg-remote'
import { STORAGE_KEY } from '@/lib/lg-remote/constants'

const EMPTY_CONFIG: LgRemoteConfig = { proxyUrl: '', token: '' }

export function loadConfig(): LgRemoteConfig {
  if (typeof window === 'undefined') return EMPTY_CONFIG
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_CONFIG
    const parsed = JSON.parse(raw) as Partial<LgRemoteConfig>
    return {
      proxyUrl: (parsed.proxyUrl || '').trim().replace(/\/+$/, ''),
      token: (parsed.token || '').trim(),
    }
  } catch {
    return EMPTY_CONFIG
  }
}

export function saveConfig(config: LgRemoteConfig): LgRemoteConfig {
  const normalized: LgRemoteConfig = {
    proxyUrl: config.proxyUrl.trim().replace(/\/+$/, ''),
    token: config.token.trim(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  }
  return normalized
}

export function isConfigured(config: LgRemoteConfig): boolean {
  return config.proxyUrl.length > 0
}

function headers(config: LgRemoteConfig): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.token) h.Authorization = `Bearer ${config.token}`
  return h
}

async function call<T>(
  config: LgRemoteConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  if (!isConfigured(config)) throw new Error('Proxy URL is not configured')
  const res = await fetch(`${config.proxyUrl}${path}`, {
    ...init,
    headers: { ...headers(config), ...(init?.headers || {}) },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* keep default message */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function pingHealth(config: LgRemoteConfig) {
  return call<{ ok: boolean; tvConnected: boolean; tvIp: string }>(
    config,
    '/health'
  )
}

export function fetchStatus(config: LgRemoteConfig) {
  return call<LgStatus>(config, '/status')
}

export function sendCommand(
  config: LgRemoteConfig,
  action: RemoteAction,
  payload?: Record<string, unknown>
) {
  return call<{ ok: boolean }>(config, '/command', {
    method: 'POST',
    body: JSON.stringify({ action, ...(payload || {}) }),
  })
}
