import type { Todo } from '@/types/todo'

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
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

function showDueNotification(todo: Todo): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  new Notification('Todo due', {
    body: todo.title,
    tag: `todo-${todo.id}`,
    icon: '/manifest.json',
  })
}

// Schedules a browser notification for each incomplete todo with a future
// due date, while the page is open. Returns a cleanup function that clears
// all pending timers. Anything already overdue is surfaced in-app, not here.
export function scheduleDueReminders(todos: Todo[]): () => void {
  if (typeof window === 'undefined') return () => {}

  const timers: ReturnType<typeof setTimeout>[] = []
  const now = Date.now()
  // setTimeout caps out near 24.8 days; only schedule within that window.
  const MAX_DELAY = 2_147_483_647

  for (const todo of todos) {
    if (todo.completed || !todo.due_at) continue
    const delay = new Date(todo.due_at).getTime() - now
    if (delay <= 0 || delay > MAX_DELAY) continue
    timers.push(setTimeout(() => showDueNotification(todo), delay))
  }

  return () => timers.forEach(clearTimeout)
}
