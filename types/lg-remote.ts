export interface LgRemoteConfig {
  proxyUrl: string
  token: string
}

export interface LgStatus {
  tvConnected: boolean
  volume: number | null
  muted: boolean | null
  appId: string | null
}

export type ConnectionState = 'unconfigured' | 'connecting' | 'online' | 'offline'

// Pointer-input + SSAP actions understood by the proxy's /command endpoint.
export type RemoteAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'back'
  | 'exit'
  | 'home'
  | 'menu'
  | 'info'
  | 'play'
  | 'pause'
  | 'volume_up'
  | 'volume_down'
  | 'set_volume'
  | 'mute'
  | 'channel_up'
  | 'channel_down'
  | 'power_off'
  | 'switch_input'
  | 'launch_app'
  | 'toast'

export interface AppShortcut {
  id: string
  label: string
  icon: string
}

export interface TvInput {
  inputId: string
  label: string
}
