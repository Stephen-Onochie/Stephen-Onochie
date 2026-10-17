import { IvenDarkModeProvider } from '@/components/iven/IvenDarkModeContext'
import IvenShell from '@/components/iven/IvenShell'
import { createClient } from '@/lib/supabase/server'
import { loadSidebarOrder } from '@/lib/iven/preferences'

// Loaded on the server so the sidebar renders in the saved order on first
// paint instead of flashing the default order and reshuffling.
export default async function AppsLayout({ children }: { children: React.ReactNode }) {
  const sidebarOrder = await loadSidebarOrder(await createClient())
  return (
    <IvenDarkModeProvider>
      <IvenShell sidebarOrder={sidebarOrder}>{children}</IvenShell>
    </IvenDarkModeProvider>
  )
}
