import type { Metadata } from 'next'
import NativeClockView from '@/components/native-clock/NativeClockView'

export const metadata: Metadata = {
  title: 'Native Clock',
  description: 'Always-on desk clock with weather, stocks, and headlines.',
}

export default function NativeClockPage() {
  return <NativeClockView />
}
