import type { Metadata } from 'next'
import NativeClockSettingsView from '@/components/native-clock/NativeClockSettingsView'

export const metadata: Metadata = {
  title: 'Native Clock Settings',
  description: 'Configure location, feeds, and display for Native Clock.',
}

export default function NativeClockSettingsPage() {
  return <NativeClockSettingsView />
}
