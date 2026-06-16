import type { Metadata } from 'next'
import NativeClockView from '@/components/native-clock/NativeClockView'

export const metadata: Metadata = {
  title: 'Native Clock',
  description: 'Always-on desk clock with weather, stocks, and headlines.',
}

// Native Clock runs in its own dark warm theme (iven dark tokens scoped to this module).
// NativeClockView manages its own internal layout and --nc-* CSS vars.
export default function NativeClockPage() {
  return (
    <div data-iven-theme="dark" style={{ minHeight: '100%' }}>
      <NativeClockView />
    </div>
  )
}
