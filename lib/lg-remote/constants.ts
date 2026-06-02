import type { AppShortcut, TvInput } from '@/types/lg-remote'

export const STORAGE_KEY = 'lg-remote-config'

// Common WebOS app ids. These are stable across most recent LG TVs.
export const APP_SHORTCUTS: AppShortcut[] = [
  { id: 'youtube.leanback.v4', label: 'YouTube', icon: '▶️' },
  { id: 'netflix', label: 'Netflix', icon: '🎬' },
  { id: 'amazon', label: 'Prime Video', icon: '📦' },
  { id: 'disneyplus', label: 'Disney+', icon: '🏰' },
  { id: 'spotify-beehive', label: 'Spotify', icon: '🎵' },
  { id: 'com.webos.app.livetv', label: 'Live TV', icon: '📺' },
]

export const TV_INPUTS: TvInput[] = [
  { inputId: 'HDMI_1', label: 'HDMI 1' },
  { inputId: 'HDMI_2', label: 'HDMI 2' },
  { inputId: 'HDMI_3', label: 'HDMI 3' },
  { inputId: 'HDMI_4', label: 'HDMI 4' },
]
