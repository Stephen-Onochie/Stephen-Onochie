import { IvenDarkModeProvider } from '@/components/iven/IvenDarkModeContext'
import IvenShell from '@/components/iven/IvenShell'

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <IvenDarkModeProvider>
      <IvenShell>{children}</IvenShell>
    </IvenDarkModeProvider>
  )
}
