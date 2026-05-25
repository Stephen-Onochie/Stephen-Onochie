'use client'

import { nativeClockThemeClass, nativeClockThemeStyles } from '@/lib/native-clock/theme'
import type { NativeClockTheme } from '@/types/native-clock'

interface NativeClockShellProps {
  theme: NativeClockTheme
  children: React.ReactNode
  className?: string
}

export default function NativeClockShell({
  theme,
  children,
  className = '',
}: NativeClockShellProps) {
  return (
    <div
      className={`min-h-screen min-h-[100dvh] flex flex-col ${nativeClockThemeClass(theme)} ${className}`}
      style={{
        backgroundColor: 'var(--nc-bg)',
        color: 'var(--nc-text)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: nativeClockThemeStyles }} />
      {children}
    </div>
  )
}
