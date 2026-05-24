import { MODE_LABELS } from '@/lib/standing-timer/cycle'
import type { WorkstationMode } from '@/types/standing-timer'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export function getNotificationSupport(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  return Notification.requestPermission()
}

export function showModeTransitionNotification(
  completedMode: WorkstationMode,
  nextMode: WorkstationMode,
  message: string
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const title = `${MODE_LABELS[completedMode]} complete`
  const body = message.replace(
    MODE_LABELS[nextMode].toLowerCase(),
    MODE_LABELS[nextMode]
  )

  new Notification(title, {
    body,
    tag: 'workstation-timer',
    icon: '/manifest.json',
  })
}
