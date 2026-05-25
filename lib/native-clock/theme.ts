import type { NativeClockTheme } from '@/types/native-clock'

export function nativeClockThemeClass(theme: NativeClockTheme): string {
  return theme === 'dark' ? 'native-clock-dark' : 'native-clock-light'
}

export const nativeClockThemeStyles = `
.native-clock-dark {
  --nc-bg: #14100c;
  --nc-surface: #221a12;
  --nc-border: #4a3d2a;
  --nc-text: #f5f0e8;
  --nc-muted: #a89478;
  --nc-accent: #e2c97e;
  --nc-grid: #2e261c;
}
.native-clock-light {
  --nc-bg: #f5f0e8;
  --nc-surface: #ede8dc;
  --nc-border: #e2c97e;
  --nc-text: #2c1f0e;
  --nc-muted: #8c7355;
  --nc-accent: #c9a84c;
  --nc-grid: #b8a48e;
}
`
