import type { Metadata } from 'next'
import TasksView from '@/components/native-clock/TasksView'

export const metadata: Metadata = {
  title: 'Tasks · Native Clock',
  description: 'Capture, organize, and complete tasks alongside your desk clock.',
}

export default function NativeClockTasksPage() {
  return <TasksView />
}
